"use server";

import { revalidatePath } from "next/cache";
import { BusinessEngine, CreateSaleCommand, CancelSaleCommand } from "@/lib/business-engine";
import type { PDVCheckout, CartItem } from "../types/pdv";

// ============================================
// FINALIZAR VENDA COMPLETA (TRANSAÇÃO VIA CORE ENGINE)
// ============================================
export async function criarVendaCompleta(checkoutData: PDVCheckout, items: CartItem[]) {
  try {
    const context = await BusinessEngine.getContext();

    // Temporary logging for audit and post-test verification
    console.log("SERVER PDV FATURAMENTO LOG:", {
      usuario_id: context.actor.usuarioId,
      loja_id: context.tenant.lojaId,
      caixa_id: context.caixaAtivo?.id,
      status_caixa: context.caixaAtivo ? "aberto" : "fechado",
      metodo_pagamento: checkoutData.formaPagamento,
      pagamentos: checkoutData.pagamentos,
    });

    const command = new CreateSaleCommand({ checkoutData, items });
    const result = await BusinessEngine.executeCommand(command, context);

    if (!result.success || !result.data) {
      return { data: null, error: result.error || "Erro ao processar faturamento da venda." };
    }

    revalidatePath("/dashboard/caixa");
    revalidatePath("/dashboard/estoque");
    revalidatePath("/dashboard/financeiro");

    return {
      data: result.data,
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err.message || "Erro inesperado no servidor." };
  }
}

// ============================================
// CANCELAR VENDA (CORE ENGINE CONTROLLER)
// ============================================
export async function cancelarVendaPDV(vendaId: string, motivo: string) {
  try {
    const context = await BusinessEngine.getContext();
    const command = new CancelSaleCommand({ vendaId, motivo });
    const result = await BusinessEngine.executeCommand(command, context);

    if (!result.success) {
      return { success: false, error: result.error || "Erro ao cancelar venda corporativa." };
    }

    revalidatePath("/dashboard/pdv");
    revalidatePath("/dashboard/caixa");
    revalidatePath("/dashboard/estoque");

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro inesperado no servidor." };
  }
}

// ============================================
// REGISTRAR EVENTOS DE AUDITORIA DO PDV
// ============================================
export async function logAuditoriaPDV(acao: string, descricao: string, entidadeId?: string) {
  try {
    const context = await BusinessEngine.getContext();
    await BusinessEngine.audit.logActivity(context, {
      acao: 'operacao' as any,
      entidade: 'venda',
      entidadeId: entidadeId || null,
      observacao: descricao,
      dadosNovos: { origem: 'pdv' }
    });

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
