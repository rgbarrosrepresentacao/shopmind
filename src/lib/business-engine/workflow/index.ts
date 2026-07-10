// ============================================
// CORE BUSINESS RULES ENGINE — WORKFLOW ENGINE
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import { createClient } from '@/lib/supabase/server';
import { RuleConfigProvider } from '../config';

export class WorkflowEngine {
  /**
   * Determina se uma operação específica requer workflow de aprovação corporativa.
   */
  public async evaluateApprovalRequirement(
    context: BusinessContext,
    actionType: 'transferencia' | 'compra' | 'desconto',
    value: number
  ): Promise<{ requiresApproval: boolean; rolesNeeded: string[]; reason: string }> {
    
    if (actionType === 'transferencia') {
      const limit = RuleConfigProvider.getLimit(context, 'AUTO_APPROVAL_TRANSFER_LIMIT');
      if (value > limit) {
        return {
          requiresApproval: true,
          rolesNeeded: ['gerente', 'dono'],
          reason: `Transferência entre filiais com valor de R$ ${value.toFixed(2)} excede o limite de aprovação automática de R$ ${limit.toFixed(2)}.`,
        };
      }
    }

    if (actionType === 'compra') {
      const limit = RuleConfigProvider.getLimit(context, 'CRITICAL_PURCHASE_LIMIT');
      if (value > limit) {
        return {
          requiresApproval: true,
          rolesNeeded: ['dono'],
          reason: `Compra com valor de R$ ${value.toFixed(2)} exige liberação da alçada de diretoria/dono (Teto: R$ ${limit.toFixed(2)}).`,
        };
      }
    }

    return {
      requiresApproval: false,
      rolesNeeded: [],
      reason: 'Operação aprovada automaticamente pelas regras gerais.',
    };
  }

  /**
   * Registra uma pendência de aprovação no banco de dados para ser exibida na aba "Aprovações & Alertas"
   */
  public async createApprovalRequest(
    context: BusinessContext,
    params: {
      tipo: string;
      referenciaId: string;
      valor: number;
      descricao: string;
    }
  ): Promise<boolean> {
    const supabase = await createClient();
    
    // Verifica se a tabela de alertas/aprovações existe no banco.
    // Inserimos uma atividade de logs_atividade com tag de pendência de aprovação ou em tabela dedicada
    const { error } = await supabase
      .from('logs_atividade')
      .insert({
        loja_id: context.tenant.lojaId,
        usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
        acao: 'solicitacao_aprovacao',
        entidade: params.tipo,
        entidade_id: params.referenciaId,
        dados_novos: {
          valor: params.valor,
          descricao: params.descricao,
          status: 'pendente',
          solicitante: context.actor.nome,
          data_solicitacao: new Date().toISOString(),
        },
      });

    return !error;
  }
}
