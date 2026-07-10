// ============================================
// CORE BUSINESS RULES ENGINE — AUDIT ENGINE
// ============================================

import { createClient } from '@/lib/supabase/server';
import type { BusinessContext } from '../types';

export class AuditEngine {
  /**
   * Registra uma entrada detalhada de auditoria e conformidade na tabela `logs_atividade`.
   */
  public async logActivity(
    context: BusinessContext,
    params: {
      acao: 'criacao' | 'edicao' | 'delecao' | 'ajuste' | 'solicitacao' | 'aprovacao' | 'bloqueio' | 'login' | 'erro' | 'ajuste_estoque' | 'criacao_venda' | 'desconto_critico';
      entidade: 'venda' | 'produto' | 'estoque' | 'transferencia' | 'caixa' | 'usuario' | 'financeiro' | 'business_engine';
      entidadeId: string | null;
      dadosAnteriores?: Record<string, any>;
      dadosNovos?: Record<string, any>;
      observacao?: string;
    }
  ): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      const { error } = await supabase.from('logs_atividade').insert({
        loja_id: context.tenant.lojaId || null,
        usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
        acao: params.acao,
        entidade: params.entidade,
        entidade_id: params.entidadeId,
        dados_anteriores: params.dadosAnteriores || null,
        dados_novos: {
          ...params.dadosNovos,
          observacao: params.observacao,
          ip: context.environment.ip,
          device: context.environment.device,
          os: context.environment.os,
          browser: context.environment.browser,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        console.error('[AuditEngine] Erro ao gravar log de auditoria no banco:', error.message);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('[AuditEngine] Erro inesperado ao gravar log de auditoria:', err);
      return false;
    }
  }

  /**
   * Registra um alerta de segurança crítico (como tentativa de bypass de RLS/RBAC)
   */
  public async logSecurityAlert(
    context: BusinessContext,
    severity: 'high' | 'critical',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    console.error(`🚨 [AUDIT SECURITY ALERT] [Grau: ${severity.toUpperCase()}] ${message} | Operador: ${context.actor.nome} (${context.actor.email})`);
    
    await this.logActivity(context, {
      acao: 'bloqueio',
      entidade: 'usuario',
      entidadeId: context.actor.usuarioId,
      dadosNovos: {
        alerta_seguranca: true,
        gravidade: severity,
        mensagem: message,
        metadata,
      },
      observacao: `Tentativa de operação suspeita detectada pelo Core Engine: ${message}`,
    });
  }
}
