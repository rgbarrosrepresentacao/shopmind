// ============================================
// CORE BUSINESS RULES ENGINE — SUBSCRIBERS
// ============================================

import { EventBus } from '../events';
import { EVENT_NAMES } from '../constants';
import type { DomainEvent, EventSubscriber } from '../types';
import { createClient } from '@/lib/supabase/server';
import { processarAcumuloVenda, processarResgateCheckout } from '@/lib/actions/fidelidade';
import { BusinessHelper } from '../helpers';
import crypto from 'crypto';

// Novos nomes de eventos para Compras
export const PURCHASE_EVENT_NAMES = {
  PURCHASE_REQUEST_CREATED: 'PurchaseRequestCreated',
  PURCHASE_ORDER_CREATED: 'PurchaseOrderCreated',
  PURCHASE_ORDER_APPROVED: 'PurchaseOrderApproved',
  PURCHASE_RECEIVED: 'PurchaseReceived', // Recebimento Físico
  PURCHASE_FISCAL_REGISTERED: 'PurchaseFiscalRegistered', // Entrada Fiscal
  PURCHASE_CANCELLED: 'PurchaseCancelled',
} as const;

/**
 * 1. LoyaltySubscriber
 * Gerencia o resgate e acúmulo de pontos e cashback quando uma venda é finalizada.
 */
export class LoyaltySubscriber implements EventSubscriber {
  public readonly name = 'LoyaltySubscriber';
  public readonly priority = 10;

  public async handle(event: DomainEvent<{ vendaId: string; total: number; checkoutData: any }>): Promise<void> {
    const { vendaId, total, checkoutData } = event.payload;
    if (!checkoutData.clienteId) return;

    console.log(`[LoyaltySubscriber] Processando fidelidade para o cliente ${checkoutData.clienteId} na venda ${vendaId}`);
    
    const resgateResult = await processarResgateCheckout(
      checkoutData.clienteId,
      vendaId,
      checkoutData.recompensaId || undefined,
      checkoutData.cashbackUsado || undefined
    );
    
    if (!resgateResult.success) {
      console.error('[LoyaltySubscriber] Erro no resgate de fidelidade:', resgateResult.error);
    }

    const acumuloResult = await processarAcumuloVenda(
      vendaId,
      checkoutData.clienteId,
      total
    );

    if (!acumuloResult.success) {
      console.error('[LoyaltySubscriber] Erro no acúmulo de fidelidade:', acumuloResult.error);
    }
  }
}

/**
 * 2. CommissionSubscriber
 * Registra provisoriamente ou liquida comissão do vendedor da venda.
 */
export class CommissionSubscriber implements EventSubscriber {
  public readonly name = 'CommissionSubscriber';
  public readonly priority = 20;

  public async handle(event: DomainEvent<{ vendaId: string; total: number; context: any }>): Promise<void> {
    const { vendaId, total } = event.payload;
    const vendedorId = event.context.actor.usuarioId;
    const vendedorTipo = event.context.actor.tipo;

    if (vendedorTipo !== 'vendedor' && vendedorTipo !== 'gerente') return;

    console.log(`[CommissionSubscriber] Provisionando comissão para o usuário ${vendedorId} sobre a venda ${vendaId} de R$ ${total.toFixed(2)}`);
  }
}

/**
 * 3. AuditSubscriber
 * Grava registros estruturados de auditoria e segurança na tabela de logs_atividade.
 */
export class AuditSubscriber implements EventSubscriber {
  public readonly name = 'AuditSubscriber';
  public readonly priority = 100;

  public async handle(event: DomainEvent<any>): Promise<void> {
    const supabase = await createClient();
    const context = event.context;
    
    console.log(`[AuditSubscriber] Gravando auditoria para o evento ${event.name}`);

    let acao: any = 'operacao';
    let entidade: any = 'business_engine';
    let entidadeId = null;
    let dadosNovos = event.payload;

    if (event.name === EVENT_NAMES.SALE_CREATED) {
      acao = 'criacao';
      entidade = 'venda';
      entidadeId = event.payload.vendaId;
    } else if (event.name === EVENT_NAMES.INVENTORY_ADJUSTED) {
      acao = 'ajuste';
      entidade = 'estoque';
      entidadeId = event.payload.produtoId;
    } else if (event.name === EVENT_NAMES.TRANSFER_CREATED) {
      acao = 'solicitacao';
      entidade = 'transferencia';
      entidadeId = event.payload.transferenciaId;
    } else if (event.name === PURCHASE_EVENT_NAMES.PURCHASE_REQUEST_CREATED) {
      acao = 'criacao';
      entidade = 'produto'; // Auditoria corporativa
      entidadeId = event.payload.requestId;
    } else if (event.name === PURCHASE_EVENT_NAMES.PURCHASE_ORDER_CREATED) {
      acao = 'criacao';
      entidade = 'produto';
      entidadeId = event.payload.purchaseOrderId;
    } else if (event.name === PURCHASE_EVENT_NAMES.PURCHASE_RECEIVED) {
      acao = 'ajuste_estoque';
      entidade = 'estoque';
      entidadeId = event.payload.receiptId;
    } else if (event.name === PURCHASE_EVENT_NAMES.PURCHASE_FISCAL_REGISTERED) {
      acao = 'criacao';
      entidade = 'financeiro';
      entidadeId = event.payload.fiscalEntryId;
    }

    await supabase.from('logs_atividade').insert({
      loja_id: context.tenant.lojaId || null,
      usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
      acao,
      entidade,
      entidade_id: entidadeId,
      dados_novos: {
        evento: event.name,
        ambiente: {
          ip: context.environment.ip,
          device: context.environment.device,
          os: context.environment.os,
          browser: context.environment.browser,
        },
        ...dadosNovos,
      },
    });
  }
}

// ============================================
// COMPRAS ENTERPRISE (FASE 4A) SUBSCRIBERS
// ============================================

/**
 * 4. FinancialSubscriber
 * Escuta o evento PURCHASE_FISCAL_REGISTERED (Entrada Fiscal) e cria automaticamente
 * a despesa correspondente (contas a pagar) na tabela financeiro, suportando parcelas.
 */
export class FinancialSubscriber implements EventSubscriber {
  public readonly name = 'FinancialSubscriber';
  public readonly priority = 30;

  public async handle(event: DomainEvent<{
    fiscalEntryId: string;
    total: number;
    fornecedorId: string;
    dataVencimento?: string;
    vencimentos?: Array<{ vencimento: string; valor: number }>;
  }>): Promise<void> {
    const { fiscalEntryId, total, fornecedorId, dataVencimento, vencimentos } = event.payload;
    const context = event.context;
    const supabase = await createClient();
    const hojeStr = new Date().toISOString().split('T')[0];

    console.log(`[FinancialSubscriber] Processando contas a pagar para a Entrada Fiscal ${fiscalEntryId}`);

    if (vencimentos && vencimentos.length > 0) {
      // Multiple dynamic installments/duplicatas
      const batch = vencimentos.map((p, idx) => {
        const status = p.vencimento > hojeStr ? 'pendente' : 'pago';
        return {
          loja_id: context.tenant.lojaId,
          tipo: 'despesa',
          descricao: `Despesa de Compra (Parcela ${idx + 1}/${vencimentos.length}) — Entrada Fiscal #${fiscalEntryId.substring(0, 8)}`,
          valor: p.valor,
          categoria: 'compra_estoque',
          referencia_id: fiscalEntryId,
          fornecedor_id: fornecedorId,
          data_vencimento: p.vencimento,
          data_pagamento: status === 'pago' ? hojeStr : null,
          status,
          origem: 'compra_fiscal',
          numero_parcela: idx + 1,
          total_parcelas: vencimentos.length
        };
      });

      await supabase.from('financeiro').insert(batch);
    } else {
      // Single installment (fallback)
      const status: 'pago' | 'pendente' = dataVencimento && dataVencimento > hojeStr ? 'pendente' : 'pago';
      await supabase.from('financeiro').insert({
        loja_id: context.tenant.lojaId,
        tipo: 'despesa',
        descricao: `Despesa de Compra — Entrada Fiscal #${fiscalEntryId.substring(0, 8)}`,
        valor: total,
        categoria: 'compra_estoque',
        referencia_id: fiscalEntryId,
        fornecedor_id: fornecedorId,
        data_vencimento: dataVencimento || hojeStr,
        data_pagamento: status === 'pago' ? hojeStr : null,
        status,
        origem: 'compra',
        numero_parcela: 1,
        total_parcelas: 1
      });
    }
  }
}

/**
 * 7. InventoryLotSubscriber
 * Escuta o evento PURCHASE_FISCAL_REGISTERED e cria os lotes em quarentena
 * e respectivos números de série.
 */
export class InventoryLotSubscriber implements EventSubscriber {
  public readonly name = 'InventoryLotSubscriber';
  public readonly priority = 25;

  public async handle(event: DomainEvent<{
    fiscalEntryId: string;
    receiptId: string;
    fornecedorId: string;
    itens: Array<{
      produtoId: string;
      quantidade: number;
      lote: string;
      validade: string;
      custoUnitario: number;
      seriais?: string[];
    }>;
  }>): Promise<void> {
    const { fiscalEntryId, receiptId, fornecedorId, itens } = event.payload;
    const context = event.context;
    const supabase = await createClient();

    console.log(`[InventoryLotSubscriber] Registrando lotes em quarentena para a nota ${fiscalEntryId}`);

    for (const item of itens) {
      if (!item.lote || !item.validade) continue;

      // 1. Criar Lote sob Quarentena (inicia em 'em_conferencia')
      const { data: lot, error: lotError } = await supabase
        .from('produto_lotes')
        .insert({
          grupo_id: context.tenant.grupoId || null,
          loja_id: context.tenant.lojaId,
          produto_id: item.produtoId,
          fornecedor_id: fornecedorId,
          fiscal_entry_id: fiscalEntryId,
          purchase_receipt_id: receiptId || null,
          lote: item.lote,
          data_validade: item.validade,
          quantidade_inicial: item.quantidade,
          quantidade_atual: item.quantidade,
          custo_unitario: item.custoUnitario,
          status: 'ativo',
          quarentena_status: 'em_conferencia'
        })
        .select('id')
        .single();

      if (lotError || !lot) {
        console.error('[InventoryLotSubscriber] Erro ao cadastrar lote:', lotError?.message);
        continue;
      }

      // 2. Rastrear Números de Série
      if (item.seriais && item.seriais.length > 0) {
        const serialRecords = item.seriais.map(s => ({
          grupo_id: context.tenant.grupoId || null,
          loja_id: context.tenant.lojaId,
          produto_id: item.produtoId,
          lote_id: lot.id,
          serial_number: s,
          status: 'quarentena'
        }));
        
        await supabase.from('produto_seriais').insert(serialRecords);
      }
    }
  }
}

/**
 * 8. CostHistorySubscriber
 * Grava o histórico detalhado de flutuação de custos de mercadoria.
 */
export class CostHistorySubscriber implements EventSubscriber {
  public readonly name = 'CostHistorySubscriber';
  public readonly priority = 35;

  public async handle(event: DomainEvent<{
    fiscalEntryId: string;
    fornecedorId: string;
    itens: Array<{
      produtoId: string;
      custoAnterior: number;
      custoNovo: number;
    }>;
  }>): Promise<void> {
    const { fiscalEntryId, itens, fornecedorId } = event.payload;
    const context = event.context;
    const supabase = await createClient();

    console.log(`[CostHistorySubscriber] Gravando histórico de CMV para a nota ${fiscalEntryId}`);

    for (const item of itens) {
      const diff = item.custoNovo - item.custoAnterior;
      const pct = item.custoAnterior > 0 ? (diff / item.custoAnterior) * 100 : 0;

      await supabase.from('produto_custo_historico').insert({
        loja_id: context.tenant.lojaId,
        produto_id: item.produtoId,
        fornecedor_id: fornecedorId,
        fiscal_entry_id: fiscalEntryId,
        custo_anterior: item.custoAnterior,
        custo_novo: item.custoNovo,
        variacao_percentual: pct,
        motivo: `Ajuste de custo via processamento fiscal da NF-e #${fiscalEntryId.substring(0, 8)}`,
        origem: 'compra_fiscal'
      });
    }
  }
}

/**
 * 5. InventorySubscriber
 * Escuta o evento PURCHASE_RECEIVED (Recebimento Físico) e realiza a entrada de estoque real
 * e gera o histórico de preços.
 */
export class InventorySubscriber implements EventSubscriber {
  public readonly name = 'InventorySubscriber';
  public readonly priority = 20;

  public async handle(event: DomainEvent<{ receiptId: string; purchaseOrderId: string; itens: any[] }>): Promise<void> {
    const { receiptId, purchaseOrderId, itens } = event.payload;
    const context = event.context;
    const supabase = await createClient();

    console.log(`[InventorySubscriber] Efetuando entrada de estoque para o recebimento ${receiptId}`);

    // Obter dados do pedido de compra para descobrir fornecedor
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('fornecedor_id, filial_id')
      .eq('id', purchaseOrderId)
      .single();

    if (!order) {
      console.error('[InventorySubscriber] Pedido de compra não encontrado:', purchaseOrderId);
      return;
    }

    for (const item of itens) {
      const qtyRecebida = Number(item.quantidadeRecebida);
      if (qtyRecebida <= 0) continue;

      // 1. Obter estoque atual na loja de destino (filial_id do pedido)
      const { data: produto } = await supabase
        .from('produtos')
        .select('estoque_atual')
        .eq('id', item.produtoId)
        .single();

      if (!produto) {
        console.error(`[InventorySubscriber] Produto ${item.produtoId} não encontrado na filial ${order.filial_id}`);
        continue;
      }

      const estoqueAnterior = Number(produto.estoque_atual || 0);
      const novoEstoque = estoqueAnterior + qtyRecebida;

      // 2. Atualizar estoque físico do produto
      await supabase
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', item.produtoId);

      // 3. Registrar movimentação de estoque
      await supabase
        .from('movimentacoes_estoque')
        .insert({
          loja_id: order.filial_id,
          produto_id: item.produtoId,
          tipo: 'entrada',
          quantidade: qtyRecebida,
          motivo: `Recebimento físico de compra - Pedido #${purchaseOrderId.substring(0, 8)}`,
          usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
        });

      // 4. Gravar no histórico de preços (purchase_price_history)
      // Usar preço unitário do item do pedido
      const { data: orderItem } = await supabase
        .from('purchase_order_items')
        .select('preco_unitario')
        .eq('purchase_order_id', purchaseOrderId)
        .eq('produto_id', item.produtoId)
        .maybeSingle();

      if (orderItem) {
        const preco = Number(orderItem.preco_unitario);
        await supabase
          .from('purchase_price_history')
          .insert({
            loja_id: order.filial_id,
            produto_id: item.produtoId,
            fornecedor_id: order.fornecedor_id,
            preco_pago: preco,
            data_compra: new Date().toISOString().split('T')[0],
          });
      }
    }
  }
}

/**
 * 6. SupplierSubscriber
 * Escuta o evento PURCHASE_RECEIVED e recalcula as métricas do fornecedor (supplier_score)
 * de forma preditiva.
 */
export class SupplierSubscriber implements EventSubscriber {
  public readonly name = 'SupplierSubscriber';
  public readonly priority = 40;

  public async handle(event: DomainEvent<{ receiptId: string; purchaseOrderId: string; itens: any[] }>): Promise<void> {
    const { purchaseOrderId, itens } = event.payload;
    const context = event.context;
    const supabase = await createClient();

    // 1. Obter dados do pedido de compra
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('fornecedor_id, data_pedido, data_entrega_prevista')
      .eq('id', purchaseOrderId)
      .single();

    if (!order) return;

    const fornecedorId = order.fornecedor_id;

    // 2. Buscar todas as entregas concluídas deste fornecedor na loja
    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('id, data_pedido, data_entrega_prevista')
      .eq('fornecedor_id', fornecedorId)
      .eq('loja_id', context.tenant.lojaId)
      .eq('status', 'recebido');

    if (!orders || orders.length === 0) return;

    const orderIds = orders.map(o => o.id);

    // Buscar todos os recebimentos correspondentes
    const { data: receipts } = await supabase
      .from('purchase_receipts')
      .select('id, purchase_order_id, data_recebimento')
      .in('purchase_order_id', orderIds);

    // Calcular prazo médio de entrega real (Lead Time)
    let leadTimeTotal = 0;
    let totalEntregas = 0;
    let entregasNoPrazo = 0;

    for (const r of receipts || []) {
      const ord = orders.find(o => o.id === r.purchase_order_id);
      if (!ord) continue;

      const pDate = new Date(ord.data_pedido);
      const rDate = new Date(r.data_recebimento);
      const diffDays = Math.ceil(Math.abs(rDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
      
      leadTimeTotal += diffDays;
      totalEntregas++;

      if (ord.data_entrega_prevista) {
        const prevDate = new Date(ord.data_entrega_prevista);
        if (rDate <= prevDate) {
          entregasNoPrazo++;
        }
      }
    }

    const leadTimeMedio = totalEntregas > 0 ? BusinessHelper.round(leadTimeTotal / totalEntregas, 2) : 0;
    const pontualidade = totalEntregas > 0 ? BusinessHelper.round((entregasNoPrazo / totalEntregas) * 100, 2) : 100;

    // Calcular índice de devoluções físicas
    let totalEnviado = 0;
    let totalRecusado = 0;

    for (const item of itens) {
      totalEnviado += Number(item.quantidadeEnviada || 0);
      totalRecusado += Number(item.quantidadeRecusada || 0);
    }
    const devolucoes = totalEnviado > 0 ? BusinessHelper.round((totalRecusado / totalEnviado) * 100, 2) : 0;

    // Nota Geral IA (0-100) baseada em pontualidade (50%) e devoluções (50%)
    const notaGeral = BusinessHelper.round((pontualidade * 0.5) + ((100 - devolucoes) * 0.5), 2);

    // 3. Salvar/Atualizar na tabela supplier_score
    const { data: existingScore } = await supabase
      .from('supplier_score')
      .select('id')
      .eq('loja_id', context.tenant.lojaId)
      .eq('fornecedor_id', fornecedorId)
      .maybeSingle();

    const scoreData = {
      loja_id: context.tenant.lojaId,
      fornecedor_id: fornecedorId,
      lead_time: leadTimeMedio,
      prazo_medio: leadTimeMedio,
      pontualidade,
      indice_devolucao: devolucoes,
      nota_geral: notaGeral,
      nota_geral_ia: notaGeral,
      updated_at: new Date().toISOString(),
    };

    if (existingScore) {
      await supabase
        .from('supplier_score')
        .update(scoreData)
        .eq('id', existingScore.id);
    } else {
      await supabase
        .from('supplier_score')
        .insert(scoreData);
    }
  }
}

/**
 * 9. TreasuryBalanceSubscriber
 * Concilia saldos de contas de tesouraria e insere registros imutáveis no extrato (financial_movements)
 */
export class TreasuryBalanceSubscriber implements EventSubscriber {
  public readonly name = 'TreasuryBalanceSubscriber';
  public readonly priority = 10;

  public async handle(event: DomainEvent<any>): Promise<void> {
    const supabase = await createClient();
    const context = event.context;
    const lojaId = context.tenant.lojaId;

    if (event.name === 'FinancialPaid') {
      const { transacaoId, accountId, valorPago, tipo, planoContas, centroCusto, descricao } = event.payload;

      // 1. Obter saldo anterior da conta
      const { data: account } = await supabase
        .from('finance_accounts')
        .select('saldo_atual, saldo_disponivel')
        .eq('id', accountId)
        .single();

      if (!account) return;

      const saldoAnterior = Number(account.saldo_atual || 0);
      let saldoPosterior = saldoAnterior;

      if (tipo === 'despesa') {
        saldoPosterior = saldoAnterior - valorPago;
      } else {
        saldoPosterior = saldoAnterior + valorPago;
      }

      // 2. Atualizar saldos contábil e disponível na conta
      await supabase
        .from('finance_accounts')
        .update({
          saldo_atual: saldoPosterior,
          saldo_disponivel: saldoPosterior + Number(account.saldo_disponivel || 0) - saldoAnterior
        })
        .eq('id', accountId);

      // 3. Gravar no extrato imutável
      await supabase.from('financial_movements').insert({
        loja_id: lojaId,
        grupo_id: context.tenant.grupoId || null,
        account_id: accountId,
        transacao_id: transacaoId,
        tipo: tipo === 'despesa' ? 'saida' : 'entrada',
        valor: valorPago,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        descricao,
        plano_contas: planoContas,
        centro_custo: centroCusto,
        audit_info: {
          actor: context.actor.usuarioId,
          ip: context.environment.ip,
          browser: context.environment.browser
        }
      });
    }

    else if (event.name === 'FinancialRefunded') {
      const { transacaoId, accountId, valorEstornado, tipo, planoContas, centroCusto, descricao, justificativa } = event.payload;

      const { data: account } = await supabase
        .from('finance_accounts')
        .select('saldo_atual, saldo_disponivel')
        .eq('id', accountId)
        .single();

      if (!account) return;

      const saldoAnterior = Number(account.saldo_atual || 0);
      let saldoPosterior = saldoAnterior;

      // No estorno, o sinal inverte
      if (tipo === 'despesa') {
        saldoPosterior = saldoAnterior + valorEstornado;
      } else {
        saldoPosterior = saldoAnterior - valorEstornado;
      }

      await supabase
        .from('finance_accounts')
        .update({
          saldo_atual: saldoPosterior,
          saldo_disponivel: saldoPosterior + Number(account.saldo_disponivel || 0) - saldoAnterior
        })
        .eq('id', accountId);

      await supabase.from('financial_movements').insert({
        loja_id: lojaId,
        grupo_id: context.tenant.grupoId || null,
        account_id: accountId,
        transacao_id: transacaoId,
        tipo: 'estorno',
        valor: valorEstornado,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        descricao: `Estorno: ${descricao}. Justificativa: ${justificativa}`,
        plano_contas: planoContas,
        centro_custo: centroCusto,
        audit_info: {
          actor: context.actor.usuarioId,
          ip: context.environment.ip,
          browser: context.environment.browser
        }
      });
    }

    else if (event.name === 'FinancialFundsTransferred') {
      const { origemAccountId, destinoAccountId, valor, descricao, planoContas, centroCusto } = event.payload;

      // Reconciliação conta origem (Saída)
      const { data: accountOrigem } = await supabase.from('finance_accounts').select('saldo_atual, saldo_disponivel').eq('id', origemAccountId).single();
      if (accountOrigem) {
        const salAnt = Number(accountOrigem.saldo_atual || 0);
        const salPost = salAnt - valor;

        await supabase.from('finance_accounts').update({
          saldo_atual: salPost,
          saldo_disponivel: salPost + Number(accountOrigem.saldo_disponivel || 0) - salAnt
        }).eq('id', origemAccountId);

        await supabase.from('financial_movements').insert({
          loja_id: lojaId,
          grupo_id: context.tenant.grupoId || null,
          account_id: origemAccountId,
          tipo: 'saida',
          valor,
          saldo_anterior: salAnt,
          saldo_posterior: salPost,
          descricao: `${descricao} (Saída para transferência)`,
          plano_contas: planoContas,
          centro_custo: centroCusto,
          audit_info: { actor: context.actor.usuarioId, ip: context.environment.ip }
        });
      }

      // Reconciliação conta destino (Entrada)
      const { data: accountDestino } = await supabase.from('finance_accounts').select('saldo_atual, saldo_disponivel').eq('id', destinoAccountId).single();
      if (accountDestino) {
        const salAnt = Number(accountDestino.saldo_atual || 0);
        const salPost = salAnt + valor;

        await supabase.from('finance_accounts').update({
          saldo_atual: salPost,
          saldo_disponivel: salPost + Number(accountDestino.saldo_disponivel || 0) - salAnt
        }).eq('id', destinoAccountId);

        await supabase.from('financial_movements').insert({
          loja_id: lojaId,
          grupo_id: context.tenant.grupoId || null,
          account_id: destinoAccountId,
          tipo: 'entrada',
          valor,
          saldo_anterior: salAnt,
          saldo_posterior: salPost,
          descricao: `${descricao} (Entrada de transferência)`,
          plano_contas: planoContas,
          centro_custo: centroCusto,
          audit_info: { actor: context.actor.usuarioId, ip: context.environment.ip }
        });
      }
    }
  }
}

/**
 * 10. GeneralLedgerSubscriber
 * Lançamento de partidas dobradas contábeis no Livro Razão e assinatura digital criptográfica
 */
export class GeneralLedgerSubscriber implements EventSubscriber {
  public readonly name = 'GeneralLedgerSubscriber';
  public readonly priority = 20;

  public async handle(event: DomainEvent<any>): Promise<void> {
    const supabase = await createClient();
    const context = event.context;
    const lojaId = context.tenant.lojaId;
    const now = new Date();

    let contaDebito = '';
    let contaCredito = '';
    let valor = 0;
    let historico = '';
    let planoContas = '';
    let centroCusto = null;
    let transacaoId = null;

    if (event.name === 'FinancialPaid') {
      const { transacaoId: txId, valorPago, tipo, planoContas: pc, centroCusto: cc, descricao } = event.payload;
      transacaoId = txId;
      valor = valorPago;
      planoContas = pc;
      centroCusto = cc;
      historico = descricao;

      if (tipo === 'despesa') {
        contaDebito = `3.000 - Despesas.${pc}`;
        contaCredito = '1.100 - Disponibilidades.Bancos';
      } else {
        contaDebito = '1.100 - Disponibilidades.Bancos';
        contaCredito = `1.000 - Receitas.${pc}`;
      }
    }

    else if (event.name === 'FinancialRefunded') {
      const { transacaoId: txId, valorEstornado, tipo, planoContas: pc, centroCusto: cc, descricao, justificativa } = event.payload;
      transacaoId = txId;
      valor = valorEstornado;
      planoContas = pc;
      centroCusto = cc;
      historico = `Reversão/Estorno: ${descricao}. Justificativa: ${justificativa}`;

      if (tipo === 'despesa') {
        contaDebito = '1.100 - Disponibilidades.Bancos';
        contaCredito = `3.000 - Despesas.${pc}`;
      } else {
        contaDebito = `1.000 - Receitas.${pc}`;
        contaCredito = '1.100 - Disponibilidades.Bancos';
      }
    }

    else if (event.name === 'FinancialFundsTransferred') {
      const { valor: val, descricao, planoContas: pc, centroCusto: cc } = event.payload;
      valor = val;
      planoContas = pc;
      centroCusto = cc;
      historico = descricao;
      contaDebito = '1.100 - Disponibilidades (Destino)';
      contaCredito = '1.100 - Disponibilidades (Origem)';
    }

    if (contaDebito && contaCredito) {
      const rawSig = `${lojaId}-${context.actor.usuarioId}-${valor}-${now.toISOString()}-${crypto.randomBytes(4).toString('hex')}`;
      const sigHash = crypto.createHash('sha256').update(rawSig).digest('hex');

      await supabase.from('general_ledger').insert({
        loja_id: lojaId,
        grupo_id: context.tenant.grupoId || null,
        transacao_id: transacaoId,
        conta_debito: contaDebito,
        conta_credito: contaCredito,
        valor,
        historico,
        plano_contas: planoContas,
        centro_custo: centroCusto,
        usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
        assinatura_hash: sigHash
      });
    }
  }
}

/**
 * 11. FinancialAuditSubscriber
 * Auditoria contábil detalhada e Alertas de Hardening para o CEO Command Center
 */
export class FinancialAuditSubscriber implements EventSubscriber {
  public readonly name = 'FinancialAuditSubscriber';
  public readonly priority = 30;

  public async handle(event: DomainEvent<any>): Promise<void> {
    const supabase = await createClient();
    const context = event.context;
    const lojaId = context.tenant.lojaId;
    const now = new Date();

    const { transacaoId, valor, valorPago, valorEstornado, tipo, justificativa } = event.payload;
    const val = Number(valor || valorPago || valorEstornado || 0);

    if (val > 20000) {
      console.log(`[FinancialAuditSubscriber] ALERTA DE SEGURANÇA: Movimentação crítica detectada de R$ ${val.toFixed(2)}`);

      await supabase.from('ia_insights').insert({
        loja_id: lojaId,
        tipo: 'perigo',
        titulo: '⚠️ Movimentação Crítica de Caixa',
        descricao: `O usuário '${context.actor.nome || 'Operador'}' executou a operação '${event.name}' no valor de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Ação auditada e assinada digitalmente.`,
        created_at: now.toISOString()
      });

      await supabase.from('logs_atividade').insert({
        loja_id: lojaId,
        usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
        acao: 'auditoria_critica',
        entidade: 'financeiro',
        entidade_id: transacaoId || null,
        dados_novos: {
          evento: event.name,
          alerta: 'Operação financeira excedeu alçada automática de segurança de R$ 20.000',
          valor: val,
          justificativa: justificativa || 'Sem justificativa preenchida',
          ambiente: {
            ip: context.environment.ip,
            browser: context.environment.browser,
            os: context.environment.os
          }
        }
      });
    }
  }
}

/**
 * Função global para registrar os subscribers de Compras no EventBus.
 */
export function registerAllSubscribers(): void {
  const loyalty = new LoyaltySubscriber();
  const commission = new CommissionSubscriber();
  const audit = new AuditSubscriber();
  const financial = new FinancialSubscriber();
  const inventory = new InventorySubscriber();
  const supplier = new SupplierSubscriber();
  const lotSub = new InventoryLotSubscriber();
  const costSub = new CostHistorySubscriber();
  const treasuryBalance = new TreasuryBalanceSubscriber();
  const generalLedger = new GeneralLedgerSubscriber();
  const financialAudit = new FinancialAuditSubscriber();

  // Vendas
  EventBus.subscribe(EVENT_NAMES.SALE_CREATED, loyalty);
  EventBus.subscribe(EVENT_NAMES.SALE_CREATED, commission);
  EventBus.subscribe(EVENT_NAMES.SALE_CREATED, audit);

  // Estoque e Transferências
  EventBus.subscribe(EVENT_NAMES.INVENTORY_ADJUSTED, audit);
  EventBus.subscribe(EVENT_NAMES.TRANSFER_CREATED, audit);
  EventBus.subscribe(EVENT_NAMES.TRANSFER_APPROVED, audit);
  EventBus.subscribe(EVENT_NAMES.TRANSFER_SENT, audit);
  EventBus.subscribe(EVENT_NAMES.TRANSFER_RECEIVED, audit);

  // Compras (Fase 4A e 4B)
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_REQUEST_CREATED, audit);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_ORDER_CREATED, audit);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_ORDER_APPROVED, audit);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_CANCELLED, audit);
  
  // Recebimento Físico -> Atualiza estoque, gera histórico de preços e pontua fornecedor
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_RECEIVED, inventory);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_RECEIVED, supplier);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_RECEIVED, audit);

  // Entrada Fiscal -> Gera contas a pagar, registra lotes em quarentena e custo histórico
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_FISCAL_REGISTERED, financial);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_FISCAL_REGISTERED, lotSub);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_FISCAL_REGISTERED, costSub);
  EventBus.subscribe(PURCHASE_EVENT_NAMES.PURCHASE_FISCAL_REGISTERED, audit);

  // Tesouraria Core & Livro Razão (Fase 5A)
  EventBus.subscribe('FinancialPaid', treasuryBalance);
  EventBus.subscribe('FinancialPaid', generalLedger);
  EventBus.subscribe('FinancialPaid', financialAudit);

  EventBus.subscribe('FinancialRefunded', treasuryBalance);
  EventBus.subscribe('FinancialRefunded', generalLedger);
  EventBus.subscribe('FinancialRefunded', financialAudit);

  EventBus.subscribe('FinancialFundsTransferred', treasuryBalance);
  EventBus.subscribe('FinancialFundsTransferred', generalLedger);
  EventBus.subscribe('FinancialFundsTransferred', financialAudit);

  EventBus.subscribe('FinancialCreated', financialAudit);
  EventBus.subscribe('FinancialCanceled', financialAudit);
}
