// ============================================
// CORE BUSINESS RULES ENGINE — RULES
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import { RuleConfigProvider } from '../config';
import { BusinessHelper } from '../helpers';
import { ROLES } from '../constants';

export interface BusinessRule {
  name: string;
  version: number;
  execute(context: BusinessContext, params: any): BusinessDecision;
}

/**
 * 1. Regra de Margem Mínima (MinimumMarginRule)
 * Verifica se a margem de lucro calculada é superior ao patamar mínimo corporativo.
 */
export class MinimumMarginRule implements BusinessRule {
  public readonly name = 'MinimumMarginRule';
  public readonly version = 1;

  public execute(context: BusinessContext, params: { salePrice: number; costPrice: number }): BusinessDecision {
    const start = Date.now();
    const { salePrice, costPrice } = params;
    
    // Obter limite dinâmico de margem configurado no tenant
    const minMargin = RuleConfigProvider.getLimit(context, 'MIN_MARGIN_PERCENT');
    const actualMargin = BusinessHelper.calculateMargin(salePrice, costPrice);

    if (salePrice > 0 && actualMargin < minMargin) {
      return {
        allowed: false,
        reason: `A margem de lucro de ${actualMargin.toFixed(1)}% está abaixo da margem mínima permitida de ${minMargin}% (Preço de venda: R$ ${salePrice.toFixed(2)} | Custo: R$ ${costPrice.toFixed(2)}).`,
        warnings: [`Margem crítica inferior a ${minMargin}%.`],
        approvalsRequired: [ROLES.GERENTE, ROLES.DONO],
        generatedEvents: [],
        metadata: { rule: this.name, version: this.version, actualMargin, minMargin },
        executionTime: Date.now() - start,
      };
    }

    return {
      allowed: true,
      reason: null,
      warnings: [],
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { rule: this.name, version: this.version, actualMargin, minMargin },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 2. Regra de Desconto Máximo (MaximumDiscountRule)
 * Restringe descontos com base nas permissões de alçada do perfil ativo.
 */
export class MaximumDiscountRule implements BusinessRule {
  public readonly name = 'MaximumDiscountRule';
  public readonly version = 1;

  public execute(
    context: BusinessContext,
    params: { originalPrice: number; discountAmount: number }
  ): BusinessDecision {
    const start = Date.now();
    const { originalPrice, discountAmount } = params;

    if (originalPrice <= 0 || discountAmount <= 0) {
      return {
        allowed: true,
        reason: null,
        warnings: [],
        approvalsRequired: [],
        generatedEvents: [],
        metadata: { rule: this.name, version: this.version },
        executionTime: Date.now() - start,
      };
    }

    const discountPercent = BusinessHelper.round((discountAmount / originalPrice) * 100, 2);
    const userRole = context.actor.tipo;

    // Determinar teto de desconto pelo perfil
    let maxAllowed = 10; // Fallback seguro (10%)
    if (userRole === ROLES.DONO) {
      maxAllowed = 100; // Dono tem alçada ilimitada
    } else if (userRole === ROLES.GERENTE) {
      maxAllowed = RuleConfigProvider.getLimit(context, 'MAX_DISCOUNT_GERENTE');
    } else if (userRole === ROLES.SUPERVISOR) {
      maxAllowed = RuleConfigProvider.getLimit(context, 'MAX_DISCOUNT_SUPERVISOR');
    } else if (userRole === ROLES.VENDEDOR) {
      maxAllowed = RuleConfigProvider.getLimit(context, 'MAX_DISCOUNT_VENDEDOR');
    } else if (userRole === ROLES.CAIXA) {
      maxAllowed = RuleConfigProvider.getLimit(context, 'MAX_DISCOUNT_CAIXA');
    }

    if (discountPercent > maxAllowed) {
      const neededRole = discountPercent <= 30 ? ROLES.GERENTE : ROLES.DONO;
      return {
        allowed: false,
        reason: `Desconto de ${discountPercent}% (R$ ${discountAmount.toFixed(2)}) excede o limite permitido de ${maxAllowed}% para o perfil de '${userRole}'.`,
        warnings: [`Desconto acima do teto de alçada do operador.`],
        approvalsRequired: [neededRole],
        generatedEvents: [],
        metadata: { rule: this.name, version: this.version, discountPercent, maxAllowed },
        executionTime: Date.now() - start,
      };
    }

    return {
      allowed: true,
      reason: null,
      warnings: [],
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { rule: this.name, version: this.version, discountPercent, maxAllowed },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 3. Regra de Estoque Disponível (InventoryAvailableRule)
 * Garante que a quantidade solicitada existe fisicamente em estoque
 * ou se o estabelecimento permite estoque negativo.
 */
export class InventoryAvailableRule implements BusinessRule {
  public readonly name = 'InventoryAvailableRule';
  public readonly version = 1;

  public execute(
    context: BusinessContext,
    params: { currentStock: number; requestedQty: number; productName: string }
  ): BusinessDecision {
    const start = Date.now();
    const { currentStock, requestedQty, productName } = params;
    
    // Obter configuração de estoque negativo do tenant
    const permitirNegativo = !!context.tenant.configuracoes?.permitir_estoque_negativo;

    if (currentStock < requestedQty && !permitirNegativo) {
      return {
        allowed: false,
        reason: `Estoque insuficiente para o produto '${productName}'. Disponível: ${currentStock} | Solicitado: ${requestedQty}.`,
        warnings: [`Falta de estoque físico.`],
        approvalsRequired: [ROLES.GERENTE, ROLES.DONO],
        generatedEvents: [],
        metadata: { rule: this.name, version: this.version, currentStock, requestedQty, permitirNegativo },
        executionTime: Date.now() - start,
      };
    }

    const warnings: string[] = [];
    if (currentStock < requestedQty && permitirNegativo) {
      warnings.push(`Venda realizada com estoque negativo para o produto '${productName}'. Novo estoque estimado: ${currentStock - requestedQty}.`);
    }

    return {
      allowed: true,
      reason: null,
      warnings,
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { rule: this.name, version: this.version, currentStock, requestedQty, permitirNegativo },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 4. Regra de Limites Financeiros de Caixa (CashCloseRule)
 * Verifica se a quebra de caixa no fechamento está dentro das margens toleráveis.
 */
export class CashCloseRule implements BusinessRule {
  public readonly name = 'CashCloseRule';
  public readonly version = 1;

  public execute(
    context: BusinessContext,
    params: { systemBalance: number; physicalBalance: number }
  ): BusinessDecision {
    const start = Date.now();
    const { systemBalance, physicalBalance } = params;
    const diff = Math.abs(systemBalance - physicalBalance);
    const maxDiff = RuleConfigProvider.getLimit(context, 'MAX_CASH_DIFFERENCE');

    if (diff > maxDiff) {
      return {
        allowed: true, // Permitir o fechamento, mas com alerta crítico e dupla auditoria
        reason: null,
        warnings: [`⚠️ DIFERENÇA CRÍTICA DE CAIXA: A diferença encontrada de R$ ${diff.toFixed(2)} excede a tolerância máxima de R$ ${maxDiff.toFixed(2)} (Físico: R$ ${physicalBalance.toFixed(2)} | Sistema: R$ ${systemBalance.toFixed(2)}).`],
        approvalsRequired: [ROLES.GERENTE],
        generatedEvents: ['CashDifferenceDetected'],
        metadata: { rule: this.name, version: this.version, diff, maxDiff },
        executionTime: Date.now() - start,
      };
    }

    return {
      allowed: true,
      reason: null,
      warnings: [],
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { rule: this.name, version: this.version, diff, maxDiff },
      executionTime: Date.now() - start,
    };
  }
}

/**
 * 5. Regra de Alçada de Transferência (TransferApprovalRule)
 * Determina se a transferência exige aprovação de alçada com base no valor.
 */
export class TransferApprovalRule implements BusinessRule {
  public readonly name = 'TransferApprovalRule';
  public readonly version = 1;

  public execute(context: BusinessContext, params: { totalValue: number }): BusinessDecision {
    const start = Date.now();
    const { totalValue } = params;
    const limit = RuleConfigProvider.getLimit(context, 'AUTO_APPROVAL_TRANSFER_LIMIT');

    if (totalValue > limit) {
      return {
        allowed: true, // A operação é permitida, mas necessita de fluxo de aprovação
        reason: null,
        warnings: [`Transferência de alto valor (R$ ${totalValue.toFixed(2)}) exige aprovação de alçada de um gerente.`],
        approvalsRequired: [ROLES.GERENTE, ROLES.DONO],
        generatedEvents: [],
        metadata: { rule: this.name, version: this.version, totalValue, limit, autoApprove: false },
        executionTime: Date.now() - start,
      };
    }

    return {
      allowed: true,
      reason: null,
      warnings: [],
      approvalsRequired: [],
      generatedEvents: [],
      metadata: { rule: this.name, version: this.version, totalValue, limit, autoApprove: true },
      executionTime: Date.now() - start,
    };
  }
}
