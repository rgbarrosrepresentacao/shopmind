// ============================================
// CORE BUSINESS RULES ENGINE — PRICING ENGINE
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import { PricePolicy, DiscountPolicy, PolicyAggregator } from '../policies';
import { BusinessHelper } from '../helpers';

export class PricingEngine {
  private pricePolicy = new PricePolicy();
  private discountPolicy = new DiscountPolicy();

  /**
   * Calcula o subtotal, descontos aplicados (itens + geral) e valor líquido final de uma venda.
   * Evita erros de arredondamento de ponto flutuante em JS.
   */
  public calculateTotals(
    items: Array<{ preco_unitario: number; quantidade: number; desconto: number }>,
    discountGeral: number
  ) {
    const subtotal = items.reduce(
      (acc, item) => acc + BusinessHelper.round(item.preco_unitario * item.quantidade, 2),
      0
    );
    
    const descontoItens = items.reduce(
      (acc, item) => acc + BusinessHelper.round(item.desconto, 2),
      0
    );

    const descontoTotal = BusinessHelper.round(descontoItens + discountGeral, 2);
    const totalLiquido = BusinessHelper.round(subtotal - descontoTotal, 2);

    return {
      subtotal: BusinessHelper.round(subtotal, 2),
      descontoItens: BusinessHelper.round(descontoItens, 2),
      descontoTotal: BusinessHelper.round(descontoTotal, 2),
      totalLiquido: BusinessHelper.round(totalLiquido > 0 ? totalLiquido : 0, 2),
    };
  }

  /**
   * Valida as políticas de preços e descontos aplicadas a uma venda e a cada um de seus itens.
   */
  public validatePricing(
    context: BusinessContext,
    items: Array<{
      produtoId: string;
      nome: string;
      preco_unitario: number;
      preco_custo: number;
      quantidade: number;
      desconto: number;
    }>,
    discountGeral: number
  ): BusinessDecision {
    const start = Date.now();
    const decisions: BusinessDecision[] = [];

    const totals = this.calculateTotals(
      items.map(i => ({ preco_unitario: i.preco_unitario, quantidade: i.quantidade, desconto: i.desconto })),
      discountGeral
    );

    // 1. Validar política de descontos sobre o valor total da venda
    const discountDecision = this.discountPolicy.evaluate(context, {
      originalPrice: totals.subtotal,
      discountAmount: totals.descontoTotal,
    });
    decisions.push(discountDecision);

    // 2. Validar margem de lucro individualmente para cada item
    for (const item of items) {
      // Calcular preço líquido unitário vendido (Preço original - Desconto rateado/unitário)
      const precoOriginalUnitario = item.preco_unitario;
      const descontoUnitario = BusinessHelper.round(item.desconto / item.quantidade, 2);
      const precoLiquidoUnitario = BusinessHelper.round(precoOriginalUnitario - descontoUnitario, 2);

      const marginDecision = this.pricePolicy.evaluate(context, {
        salePrice: precoLiquidoUnitario,
        costPrice: item.preco_custo,
      });

      // Sobrescrever metadados/razões para apontar o produto específico
      if (!marginDecision.allowed) {
        marginDecision.reason = `[Produto: ${item.nome}] ${marginDecision.reason}`;
      }
      decisions.push(marginDecision);
    }

    // Agregar todas as decisões sob a Discount & Price Policy
    const consolidated = PolicyAggregator.aggregate(decisions, 'PricingEngine');
    return {
      ...consolidated,
      metadata: {
        ...consolidated.metadata,
        totals,
      },
      executionTime: Date.now() - start,
    };
  }
}
