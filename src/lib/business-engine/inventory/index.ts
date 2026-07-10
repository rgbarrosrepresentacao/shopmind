// ============================================
// CORE BUSINESS RULES ENGINE — INVENTORY ENGINE
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import { InventoryPolicy } from '../policies';
import { createClient } from '@/lib/supabase/server';

export class InventoryEngine {
  private inventoryPolicy = new InventoryPolicy();

  /**
   * Verifica a disponibilidade física de estoque para um determinado produto
   * respeitando as políticas do tenant (como permitir estoque negativo).
   */
  public async checkAvailability(
    context: BusinessContext,
    produtoId: string,
    quantity: number
  ): Promise<BusinessDecision> {
    const start = Date.now();
    const supabase = await createClient();

    // 1. Buscar estoque atual do produto
    const { data: produto, error } = await supabase
      .from('produtos')
      .select('nome, estoque_atual, estoque_minimo')
      .eq('id', produtoId)
      .maybeSingle();

    if (error || !produto) {
      return {
        allowed: false,
        reason: `Produto ${produtoId} não encontrado ou erro ao consultar estoque.`,
        warnings: [],
        approvalsRequired: [],
        generatedEvents: [],
        metadata: { engine: 'inventory', error: error?.message },
        executionTime: Date.now() - start,
      };
    }

    const currentStock = Number(produto.estoque_atual || 0);

    // 2. Avaliar política de estoque
    const decision = this.inventoryPolicy.evaluate(context, {
      currentStock,
      requestedQty: quantity,
      productName: produto.nome,
    });

    return {
      ...decision,
      metadata: {
        ...decision.metadata,
        produtoId,
        produtoNome: produto.nome,
        estoqueAtual: currentStock,
        estoqueMinimo: Number(produto.estoque_minimo || 0),
      },
      executionTime: Date.now() - start,
    };
  }

  /**
   * Registra uma reserva temporária ou em trânsito de estoque no banco.
   * (Pode criar uma linha em uma tabela de reservas ou atualizar estoques em trânsito).
   */
  public async reserveStock(
    context: BusinessContext,
    produtoId: string,
    quantity: number
  ): Promise<boolean> {
    // Simula ou persiste a reserva. Em ERPs Enterprise, isso atualiza a coluna 'estoque_reservado'
    // ou gera registro em 'estoque_lotes'. Aqui gravamos no log que foi reservado.
    console.log(`[InventoryEngine] Reservando ${quantity} unidades do produto ${produtoId} na loja ${context.tenant.lojaId}`);
    return true;
  }

  /**
   * Libera uma reserva de estoque anteriormente retida.
   */
  public async releaseStock(
    context: BusinessContext,
    produtoId: string,
    quantity: number
  ): Promise<boolean> {
    console.log(`[InventoryEngine] Liberando ${quantity} unidades do produto ${produtoId} na loja ${context.tenant.lojaId}`);
    return true;
  }
}
