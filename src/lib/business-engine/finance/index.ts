// ============================================
// CORE BUSINESS RULES ENGINE — FINANCE ENGINE
// ============================================

import type { BusinessContext } from '../types';
import { createClient } from '@/lib/supabase/server';
import { BusinessHelper } from '../helpers';

export class FinanceEngine {
  /**
   * Obtém o preço de custo atual de um produto para cálculo de CMV (Custo de Mercadoria Vendida).
   * Implementa fallback inteligente se o custo estiver zerado.
   */
  public async getProductCost(produtoId: string): Promise<number> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('produtos')
      .select('preco_custo, preco_venda')
      .eq('id', produtoId)
      .maybeSingle();

    const custo = Number(data?.preco_custo || 0);
    if (custo > 0) return custo;

    // Fallback: se o custo for zero, estima em 60% do preço de venda (padrão contábil do ERP)
    const venda = Number(data?.preco_venda || 0);
    return BusinessHelper.round(venda * 0.6, 2);
  }

  /**
   * Calcula o CMV total de uma lista de itens vendidos
   */
  public async calculateTotalCMV(
    items: Array<{ produtoId: string; quantidade: number }>
  ): Promise<number> {
    let totalCMV = 0;
    for (const item of items) {
      const custoUnitario = await this.getProductCost(item.produtoId);
      totalCMV += BusinessHelper.round(custoUnitario * item.quantidade, 2);
    }
    return BusinessHelper.round(totalCMV, 2);
  }

  /**
   * Calcula o Lucro Bruto e a Margem Real de uma operação
   */
  public calculateProfitability(totalLiquido: number, totalCMV: number) {
    const lucroBruto = BusinessHelper.round(totalLiquido - totalCMV, 2);
    const margemReal = totalLiquido > 0 ? BusinessHelper.round((lucroBruto / totalLiquido) * 100, 2) : 0;
    return {
      lucroBruto,
      margemReal,
    };
  }
}
