// ============================================
// CORE BUSINESS RULES ENGINE — POLICIES
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import {
  MinimumMarginRule,
  MaximumDiscountRule,
  InventoryAvailableRule,
  CashCloseRule,
  TransferApprovalRule
} from '../rules';
import { ROLES } from '../constants';

/**
 * Agrega múltiplas BusinessDecisions em uma única decisão consolidada.
 */
export class PolicyAggregator {
  public static aggregate(decisions: BusinessDecision[], policyName: string): BusinessDecision {
    const start = Date.now();
    let allowed = true;
    const reasons: string[] = [];
    let warnings: string[] = [];
    let approvalsRequired: string[] = [];
    let generatedEvents: string[] = [];
    const metadata: Record<string, any> = { policy: policyName };

    for (const d of decisions) {
      if (!d.allowed) {
        allowed = false;
        if (d.reason) reasons.push(d.reason);
      }
      if (d.warnings.length > 0) warnings = [...warnings, ...d.warnings];
      if (d.approvalsRequired.length > 0) approvalsRequired = [...approvalsRequired, ...d.approvalsRequired];
      if (d.generatedEvents.length > 0) generatedEvents = [...generatedEvents, ...d.generatedEvents];
      
      // Mesclar metadados das regras
      if (d.metadata) {
        const ruleName = d.metadata.rule || 'unknown';
        metadata[ruleName] = d.metadata;
      }
    }

    // Remover duplicados
    warnings = Array.from(new Set(warnings));
    approvalsRequired = Array.from(new Set(approvalsRequired));
    generatedEvents = Array.from(new Set(generatedEvents));

    return {
      allowed,
      reason: reasons.length > 0 ? reasons.join(' | ') : null,
      warnings,
      approvalsRequired,
      generatedEvents,
      metadata,
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 1. DiscountPolicy
 * Avalia se o desconto concedido em uma venda ou item é aceitável pelas alçadas corporativas.
 */
export class DiscountPolicy {
  private maxDiscountRule = new MaximumDiscountRule();

  public evaluate(
    context: BusinessContext,
    params: { originalPrice: number; discountAmount: number }
  ): BusinessDecision {
    const d = this.maxDiscountRule.execute(context, params);
    return PolicyAggregator.aggregate([d], 'DiscountPolicy');
  }
}

/**
 * 2. PricePolicy
 * Valida a integridade de preços, margem de lucro e CMV de uma transação comercial.
 */
export class PricePolicy {
  private minMarginRule = new MinimumMarginRule();

  public evaluate(
    context: BusinessContext,
    params: { salePrice: number; costPrice: number }
  ): BusinessDecision {
    const d = this.minMarginRule.execute(context, params);
    return PolicyAggregator.aggregate([d], 'PricePolicy');
  }
}

/**
 * 3. InventoryPolicy
 * Valida a disponibilidade física e política de estoque para saídas ou transferências.
 */
export class InventoryPolicy {
  private inventoryRule = new InventoryAvailableRule();

  public evaluate(
    context: BusinessContext,
    params: { currentStock: number; requestedQty: number; productName: string }
  ): BusinessDecision {
    const d = this.inventoryRule.execute(context, params);
    return PolicyAggregator.aggregate([d], 'InventoryPolicy');
  }
}

/**
 * 4. CashPolicy
 * Analisa as políticas de abertura, sangria, suprimento e fechamento de caixa.
 */
export class CashPolicy {
  private cashCloseRule = new CashCloseRule();

  public evaluateClose(
    context: BusinessContext,
    params: { systemBalance: number; physicalBalance: number }
  ): BusinessDecision {
    const d = this.cashCloseRule.execute(context, params);
    return PolicyAggregator.aggregate([d], 'CashPolicy');
  }
}

/**
 * 5. TransferPolicy
 * Coordena as regras e workflow exigidos para transferências entre filiais.
 */
export class TransferPolicy {
  private transferRule = new TransferApprovalRule();

  public evaluate(context: BusinessContext, params: { totalValue: number }): BusinessDecision {
    const d = this.transferRule.execute(context, params);
    return PolicyAggregator.aggregate([d], 'TransferPolicy');
  }
}

// ============================================
// COMPRAS ENTERPRISE (FASE 4A) POLICIES
// ============================================

/**
 * 6. PurchaseBudgetPolicy
 * Verifica se a compra está dentro dos limites orçamentários do tenant ou do comprador.
 */
export class PurchaseBudgetPolicy {
  public evaluate(
    context: BusinessContext,
    params: { totalValue: number; limitConfigured?: number }
  ): BusinessDecision {
    const start = Date.now();
    const limit = params.limitConfigured || 50000; // Limite padrão de R$ 50k se não configurado
    const allowed = params.totalValue <= limit;

    return {
      allowed,
      reason: allowed ? null : `O valor total do pedido (R$ ${params.totalValue.toFixed(2)}) excede o limite orçamentário configurado de R$ ${limit.toFixed(2)}.`,
      warnings: [],
      approvalsRequired: allowed ? [] : [ROLES.DONO],
      generatedEvents: [],
      metadata: { policy: 'PurchaseBudgetPolicy', totalValue: params.totalValue, limit },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 7. SupplierPolicy
 * Avalia o score e o relacionamento do fornecedor para alertar riscos.
 */
export class SupplierPolicy {
  public evaluate(
    context: BusinessContext,
    params: { supplierScore?: any; supplierName: string }
  ): BusinessDecision {
    const start = Date.now();
    const warnings: string[] = [];
    const score = params.supplierScore;

    if (score) {
      const nota = Number(score.nota_geral_ia || score.nota_geral || 100);
      const devolucoes = Number(score.indice_devolucao || 0);
      
      if (nota < 50) {
        warnings.push(`⚠️ FORNECEDOR CRÍTICO: "${params.supplierName}" possui nota de IA baixa (${nota.toFixed(0)}/100).`);
      }
      if (devolucoes > 15) {
        warnings.push(`⚠️ ALTO ÍNDICE DE DEVOLUÇÃO: "${params.supplierName}" apresenta ${devolucoes.toFixed(1)}% de devoluções/recusas históricas.`);
      }
    }

    return {
      allowed: true,
      reason: null,
      warnings,
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { policy: 'SupplierPolicy', supplierName: params.supplierName, score },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 8. DuplicatePurchasePolicy
 * Alerta se houver compras muito frequentes de um mesmo produto para evitar excesso de estoque.
 */
export class DuplicatePurchasePolicy {
  public evaluate(
    context: BusinessContext,
    params: { recentPurchasesCount: number; productName: string }
  ): BusinessDecision {
    const start = Date.now();
    const warnings: string[] = [];
    
    if (params.recentPurchasesCount > 0) {
      warnings.push(`⚠️ DUPLICIDADE DE COMPRA: O produto "${params.productName}" já foi comprado nos últimos 7 dias.`);
    }

    return {
      allowed: true,
      reason: null,
      warnings,
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { policy: 'DuplicatePurchasePolicy', productName: params.productName, count: params.recentPurchasesCount },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 9. ApprovalPolicy
 * Avalia dinamicamente os níveis de aprovação (tiers) cadastrados no banco ou fallbacks padrão.
 */
export class ApprovalPolicy {
  public evaluate(
    context: BusinessContext,
    params: {
      totalValue: number;
      configuredLevels?: Array<{ nome_nivel: string; valor_limite: number; perfil_aprovador: string }>;
    }
  ): BusinessDecision {
    const start = Date.now();
    const { totalValue, configuredLevels } = params;

    // Se houver níveis configurados, utiliza eles. Caso contrário, fallback para a regra padrão.
    const levels = configuredLevels && configuredLevels.length > 0
      ? [...configuredLevels].sort((a, b) => a.valor_limite - b.valor_limite)
      : [
          { nome_nivel: 'Gerente', valor_limite: 5000, perfil_aprovador: ROLES.GERENTE },
          { nome_nivel: 'Supervisor', valor_limite: 20000, perfil_aprovador: ROLES.SUPERVISOR },
          { nome_nivel: 'Diretor', valor_limite: 100000, perfil_aprovador: ROLES.DONO }, // Diretor/Dono
          { nome_nivel: 'Dono', valor_limite: 999999999, perfil_aprovador: ROLES.DONO },
        ];

    // Encontrar o nível necessário baseado no valor total
    const neededLevel = levels.find(l => totalValue <= l.valor_limite) || levels[levels.length - 1];
    const userRole = context.actor.tipo;

    // Verificar se o usuário ativo já possui alçada suficiente
    let allowed = false;
    if (userRole === ROLES.DONO) {
      allowed = true;
    } else if (neededLevel.perfil_aprovador === userRole) {
      allowed = true;
    } else if (userRole === ROLES.GERENTE && neededLevel.perfil_aprovador === ROLES.SUPERVISOR) {
      // Se for gerente, assume que pode aprovar limites inferiores
      allowed = false; // Exige roteamento explícito do workflow por nível
    }

    // Se o próprio comprador já tiver alçada, está liberado automaticamente.
    // Caso contrário, bloqueia e exige aprovação do perfil apropriado.
    return {
      allowed: allowed || userRole === ROLES.DONO,
      reason: allowed || userRole === ROLES.DONO ? null : `Este pedido de compra (R$ ${totalValue.toFixed(2)}) exige aprovação de alçada do nível: "${neededLevel.nome_nivel}" (Aprovador: ${neededLevel.perfil_aprovador}).`,
      warnings: [],
      approvalsRequired: allowed || userRole === ROLES.DONO ? [] : [neededLevel.perfil_aprovador],
      generatedEvents: [],
      metadata: { policy: 'ApprovalPolicy', neededLevel, totalValue },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 10. FiscalEntryPolicy
 * Valida a chave da NF-e, unicidade do documento e correspondência com o fornecedor.
 */
export class FiscalEntryPolicy {
  public evaluate(
    context: BusinessContext,
    params: {
      chaveNfe: string;
      supplierCnpj?: string | null;
      invoiceCnpj?: string | null;
      isKeyDuplicate: boolean;
    }
  ): BusinessDecision {
    const start = Date.now();
    const warnings: string[] = [];
    let allowed = true;
    let reason: string | null = null;

    if (params.isKeyDuplicate) {
      allowed = false;
      reason = `Bloqueio Contábil: A NF-e de chave "${params.chaveNfe}" já foi processada anteriormente neste tenant.`;
    }

    if (params.invoiceCnpj && params.supplierCnpj) {
      const cleanInvoice = params.invoiceCnpj.replace(/\D/g, '');
      const cleanSupplier = params.supplierCnpj.replace(/\D/g, '');
      if (cleanInvoice !== cleanSupplier) {
        warnings.push(`⚠️ DIVERGÊNCIA FISCAL: O CNPJ emitente do XML (${params.invoiceCnpj}) diverge do CNPJ cadastrado do fornecedor (${params.supplierCnpj}).`);
      }
    }

    return {
      allowed,
      reason,
      warnings,
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { policy: 'FiscalEntryPolicy', chaveNfe: params.chaveNfe },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 11. CostUpdatePolicy
 * Alerta sobre variações abruptly altas de preço de custo para auditoria de CMV.
 */
export class CostUpdatePolicy {
  public evaluate(
    context: BusinessContext,
    params: {
      custoAnterior: number;
      custoNovo: number;
      productName: string;
    }
  ): BusinessDecision {
    const start = Date.now();
    const warnings: string[] = [];
    let allowed = true;
    let reason: string | null = null;

    if (params.custoAnterior > 0) {
      const variacao = ((params.custoNovo - params.custoAnterior) / params.custoAnterior) * 100;
      
      if (variacao > 20) {
        warnings.push(`⚠️ REAJUSTE DE CUSTO ELEVADO: O produto "${params.productName}" teve um aumento de custo de ${variacao.toFixed(1)}% (De R$ ${params.custoAnterior.toFixed(2)} para R$ ${params.custoNovo.toFixed(2)}).`);
      }
      if (variacao > 50 && !['dono', 'gerente'].includes(context.actor.tipo)) {
        allowed = false;
        reason = `Bloqueio Operacional: Variação de custo superior a 50% (${variacao.toFixed(1)}%) exige aprovação explícita do Gerente ou Dono.`;
      }
    }

    return {
      allowed,
      reason,
      warnings,
      approvalsRequired: allowed ? [] : [ROLES.DONO],
      generatedEvents: [],
      metadata: { policy: 'CostUpdatePolicy', varPercentual: params.custoAnterior > 0 ? ((params.custoNovo - params.custoAnterior) / params.custoAnterior) * 100 : 0 },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 12. LotValidationPolicy
 * Valida a data de validade, impedindo entrada de lotes vencidos ou próximos do vencimento.
 */
export class LotValidationPolicy {
  public evaluate(
    context: BusinessContext,
    params: {
      validade: string;
      lote: string;
    }
  ): BusinessDecision {
    const start = Date.now();
    let allowed = true;
    let reason: string | null = null;
    const warnings: string[] = [];

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVal = new Date(params.validade + "T12:00:00");

    if (dataVal < hoje) {
      allowed = false;
      reason = `Bloqueio de Segurança: Lote "${params.lote}" está com data de validade vencida (${params.validade}).`;
    } else {
      const diasRestantes = Math.ceil((dataVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      if (diasRestantes < 30) {
        warnings.push(`⚠️ VALIDADE PRÓXIMA: O lote "${params.lote}" vence em ${diasRestantes} dias (${params.validade}).`);
      }
    }

    return {
      allowed,
      reason,
      warnings,
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { policy: 'LotValidationPolicy', diasRestantes: allowed ? Math.ceil((dataVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0 },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 13. PayableGenerationPolicy
 * Garante a integridade dos lançamentos financeiros das parcelas.
 */
export class PayableGenerationPolicy {
  public evaluate(
    context: BusinessContext,
    params: {
      valorTotalNota: number;
      valorTotalParcelas: number;
    }
  ): BusinessDecision {
    const start = Date.now();
    let allowed = true;
    let reason: string | null = null;

    const diff = Math.abs(params.valorTotalNota - params.valorTotalParcelas);
    if (diff > 0.05) {
      allowed = false;
      reason = `Bloqueio Financeiro: A soma das parcelas (R$ ${params.valorTotalParcelas.toFixed(2)}) não confere com o valor total da nota fiscal (R$ ${params.valorTotalNota.toFixed(2)}). Diferença: R$ ${diff.toFixed(2)}.`;
    }

    return {
      allowed,
      reason,
      warnings: [],
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { policy: 'PayableGenerationPolicy' },
      executionTime: Date.now() - start,
    };
  }
}
