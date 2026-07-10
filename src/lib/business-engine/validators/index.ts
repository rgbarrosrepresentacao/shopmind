// ============================================
// CORE BUSINESS RULES ENGINE — VALIDATORS
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import { createClient } from '@/lib/supabase/server';

export class ValidationEngine {
  /**
   * Valida o CPF/CNPJ de um cliente
   */
  public validateDocument(document: string): boolean {
    const cleanDoc = document.replace(/\D/g, '');
    
    // CPF
    if (cleanDoc.length === 11) {
      if (/^(\d)\1{10}$/.test(cleanDoc)) return false;
      let sum = 0;
      let remainder;
      for (let i = 1; i <= 9; i++) sum += parseInt(cleanDoc.substring(i - 1, i)) * (11 - i);
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanDoc.substring(9, 10))) return false;
      sum = 0;
      for (let i = 1; i <= 10; i++) sum += parseInt(cleanDoc.substring(i - 1, i)) * (12 - i);
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanDoc.substring(10, 11))) return false;
      return true;
    }
    
    // CNPJ
    if (cleanDoc.length === 14) {
      if (/^(\d)\1{13}$/.test(cleanDoc)) return false;
      let length = cleanDoc.length - 2;
      let numbers = cleanDoc.substring(0, length);
      const digits = cleanDoc.substring(length);
      let sum = 0;
      let pos = length - 7;
      for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digits.charAt(0))) return false;
      length = length + 1;
      numbers = cleanDoc.substring(0, length);
      sum = 0;
      pos = length - 7;
      for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digits.charAt(1))) return false;
      return true;
    }

    return false;
  }

  /**
   * Valida a estrutura básica de uma venda/carrinho
   */
  public validateSaleItems(context: BusinessContext, items: any[]): BusinessDecision {
    const start = Date.now();

    if (!items || items.length === 0) {
      return this.createDecision(false, 'A venda precisa conter pelo menos 1 item.', start);
    }

    const warnings: string[] = [];
    for (const item of items) {
      if (!item.produto_id && !item.produto?.id) {
        return this.createDecision(false, 'Identificador do produto é obrigatório em todos os itens.', start);
      }
      if (item.quantidade <= 0) {
        return this.createDecision(
          false,
          `Quantidade inválida (${item.quantidade}) para o produto ${item.nome_produto || item.produto?.nome}.`,
          start
        );
      }
      if (item.preco_unitario <= 0 && !item.permitir_preco_zero) {
        warnings.push(`Produto ${item.nome_produto || item.produto?.nome} está sendo vendido com valor R$ 0,00.`);
      }
    }

    // Verificar se exige CPF/CNPJ
    const exigirCpf = context.tenant.configuracoes?.exigir_cpf_venda;
    if (exigirCpf && !context.cliente?.cpf_cnpj) {
      return this.createDecision(
        false,
        'As regras do estabelecimento exigem CPF/CNPJ do cliente na venda.',
        start,
        ['gerente']
      );
    }

    return {
      allowed: true,
      reason: null,
      warnings,
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { engine: 'validators', itemsCount: items.length },
      executionTime: Date.now() - start,
    };
  }

  /**
   * Valida a consistência contábil de qualquer movimentação financeira antes de ser persistida.
   * Executa a barreira de segurança contábil da Etapa 0, RLS e Fechamento Contábil.
   */
  public async validateFinancialConsistency(
    context: BusinessContext,
    payload: {
      accountId: string;
      tipo: 'receita' | 'despesa' | 'transferencia' | 'estorno' | 'cancelamento' | 'baixa';
      valor: number;
      dataVencimento?: string;
      dataPagamento?: string | null;
      centroCusto?: string | null;
      planoContas?: string | null;
      idempotencyKey?: string | null;
      vencimentosParcelas?: Array<{ vencimento: string; valor: number }>;
      status?: 'pendente' | 'pago';
    }
  ): Promise<BusinessDecision> {
    const start = Date.now();
    const supabase = await createClient();
    const lojaId = context.tenant.lojaId;

    // 1. Validar Tenant e RBAC
    if (!lojaId) {
      return this.createDecision(false, 'Consistência Financeira: Tenant (loja_id) é obrigatório.', start);
    }
    const actorRole = context.actor.tipo; // 'dono' | 'gerente' | 'financeiro' | 'supervisor' | 'caixa'
    const rolesPermitidos = ['dono', 'gerente', 'financeiro', 'supervisor', 'caixa'];
    if (!rolesPermitidos.includes(actorRole)) {
      return this.createDecision(false, `Acesso negado: Perfil '${actorRole}' não tem permissão para realizar operações financeiras.`, start);
    }

    // 2. Validar período contábil fechado (Closing Period)
    const dataVerificacao = payload.dataPagamento || payload.dataVencimento || new Date().toISOString().split('T')[0];
    const dataObj = new Date(dataVerificacao);
    const ano = dataObj.getFullYear();
    const mes = dataObj.getMonth() + 1;

    const { data: closingPeriod } = await supabase
      .from('closing_periods')
      .select('status')
      .eq('loja_id', lojaId)
      .eq('ano', ano)
      .eq('mes', mes)
      .maybeSingle();

    if (closingPeriod?.status === 'fechado') {
      return this.createDecision(
        false,
        `Operação Bloqueada: O período contábil de ${mes}/${ano} está fechado e não permite novos lançamentos ou alterações.`,
        start
      );
    }

    // 3. Validar Conta Financeira (Ativa)
    const { data: account, error: accountError } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('id', payload.accountId)
      .eq('loja_id', lojaId)
      .maybeSingle();

    if (accountError || !account) {
      return this.createDecision(false, `Consistência Financeira: Conta financeira de destino/origem não encontrada ou pertence a outra filial.`, start);
    }

    if (account.status !== 'ativo') {
      return this.createDecision(false, `Consistência Financeira: A conta '${account.nome}' está inativa.`, start);
    }

    // 4. Validar Saldo Negativo e Limite (Apenas se impactar o saldo imediatamente)
    if (payload.tipo === 'despesa' || payload.tipo === 'transferencia' || payload.tipo === 'baixa') {
      const isDespesaPendente = payload.tipo === 'despesa' && payload.status === 'pendente';

      if (!isDespesaPendente) {
        const saldoDisponivel = Number(account.saldo_disponivel || 0);
        if (payload.valor > saldoDisponivel && !account.saldo_negativo_permitido) {
          // Se o ator for alçada superior contábil, permitir bypass com warnings e metadata
          const isSupervisor = ['dono', 'gerente', 'financeiro'].includes(actorRole);
          if (isSupervisor) {
            const decision = this.createDecision(true, null, start);
            decision.warnings = [`Aviso contábil: Lançamento de despesa autorizada pelo gestor '${actorRole}' mesmo com saldo insuficiente na conta '${account.nome}' (Disponível: R$ ${saldoDisponivel.toFixed(2)}, Requerido: R$ ${payload.valor.toFixed(2)}).`];
            decision.metadata = {
              ...decision.metadata,
              bypass_saldo: true,
              saldo_no_momento: saldoDisponivel
            };
            return decision;
          }

          return this.createDecision(
            false,
            `Operação Bloqueada: Saldo insuficiente na conta '${account.nome}' (Disponível: R$ ${saldoDisponivel.toFixed(2)}, Requerido: R$ ${payload.valor.toFixed(2)}).`,
            start,
            ['gerente', 'financeiro', 'dono'] // Exige alçada superior se quiser forçar
          );
        }
      }
    }

    // 5. Validar Caixa Aberto (para vendas / PDV)
    if (context.caixaAtivo?.id && payload.tipo === 'receita') {
      const { data: caixa } = await supabase
        .from('caixas')
        .select('status')
        .eq('id', context.caixaAtivo.id)
        .maybeSingle();

      if (!caixa || caixa.status !== 'aberto') {
        return this.createDecision(false, `Consistência Financeira: A sessão de caixa está fechada. Abertura obrigatória para receber valores.`, start);
      }
    }

    // 6. Validar Centro de Custo se informado
    const validCentros = ['Geral', 'Administrativo', 'Estoque', 'CD', 'Comercial', 'Vendas', 'Marketing', 'TI', 'RH', 'Logística', 'Projetos'];
    if (payload.centroCusto && !validCentros.includes(payload.centroCusto)) {
      return this.createDecision(false, `Consistência Financeira: Centro de custo '${payload.centroCusto}' é inválido.`, start);
    }

    // 7. Validar consistência de parcelas
    if (payload.vencimentosParcelas && payload.vencimentosParcelas.length > 0) {
      const somaParcelas = payload.vencimentosParcelas.reduce((acc, p) => acc + Number(p.valor), 0);
      if (Math.abs(somaParcelas - payload.valor) > 0.01) {
        return this.createDecision(
          false,
          `Consistência Financeira: A soma das parcelas (R$ ${somaParcelas.toFixed(2)}) diverge do valor total do lançamento (R$ ${payload.valor.toFixed(2)}).`,
          start
        );
      }
    }

    // 8. Checar duplicidade (lançamento idêntico nos últimos 5 minutos)
    const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: duplicate } = await supabase
      .from('financeiro')
      .select('id')
      .eq('loja_id', lojaId)
      .eq('valor', payload.valor)
      .eq('tipo', payload.tipo === 'baixa' ? 'despesa' : payload.tipo === 'receita' ? 'receita' : 'despesa')
      .eq('data_vencimento', payload.dataVencimento || dataVerificacao)
      .gte('created_at', cincoMinutosAtras)
      .limit(1)
      .maybeSingle();

    if (duplicate && !payload.idempotencyKey) {
      return this.createDecision(
        false,
        `Consistência Financeira: Lançamento duplicado detectado. Um registro com o mesmo valor e vencimento foi criado nos últimos 5 minutos.`,
        start
      );
    }

    return {
      allowed: true,
      reason: null,
      warnings: [],
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { engine: 'validators', accountName: account.nome },
      executionTime: Date.now() - start,
    };
  }

  private createDecision(allowed: boolean, reason: string | null, startTime: number, approvalsRequired: string[] = []): BusinessDecision {
    return {
      allowed,
      reason,
      warnings: [],
      approvalsRequired,
      generatedEvents: [],
      metadata: { engine: 'validators' },
      executionTime: Date.now() - startTime,
    };
  }
}
