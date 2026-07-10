// ============================================
// CORE BUSINESS RULES ENGINE — COMMAND HANDLERS
// ============================================

import type { BusinessContext, Command, CommandHandler, CommandResult } from '../types';
import { BusinessRegistry } from '../registry';
import { EVENT_NAMES } from '../constants';
import { EventBus } from '../events';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import {
  CreateSaleCommand,
  CancelSaleCommand,
  AdjustInventoryCommand,
  CreatePurchaseRequestCommand,
  ApprovePurchaseCommand,
  GeneratePurchaseOrderCommand,
  ReceivePhysicalPurchaseCommand,
  RegisterFiscalPurchaseCommand,
  CancelPurchaseCommand,
  ImportPurchaseXMLCommand,
  ReconcilePurchaseXMLCommand,
  ReleaseQuarantineLotCommand,
  AddAdditionalPurchaseCostCommand,
  CreateFinancialTransactionCommand,
  ProcessFinancialPaymentCommand,
  RenegotiateFinancialTransactionCommand,
  RefundFinancialTransactionCommand,
  CancelFinancialTransactionCommand,
  CreateFinanceAccountCommand,
  TransferFinanceFundsCommand,
  ApproveFinancialWorkflowCommand,
  CreateClosingPeriodCommand,
  ReopenClosingPeriodCommand,
  UpdateFinancialBudgetCommand,
  ProcessBankReconciliationCommand,
  ReprocessFinancialTransactionCommand,
  OpenCashSessionCommand,
  CloseCashSessionCommand,
  PerformCashInflowCommand,
  PerformCashOutflowCommand,
  ReconcileCashSessionCommand
} from '../commands';
import { gerarDocumentoFiscal } from '@/lib/actions/fiscal';
import { estornarFidelidadeVenda } from '@/lib/actions/fidelidade';
import { PURCHASE_EVENT_NAMES } from '../subscribers';
import { BusinessHelper } from '../helpers';

export interface CreateSaleResult {
  vendaId: string;
  numero: number;
  created_at: string;
  documentoFiscalId: string | null;
  documentoFiscalNumero: string | null;
  documentoFiscalTipo: string | null;
}

/**
 * 1. CreateSaleCommandHandler
 */
export class CreateSaleCommandHandler implements CommandHandler<CreateSaleCommand, CreateSaleResult> {
  public async handle(command: CreateSaleCommand, context: BusinessContext): Promise<CommandResult<CreateSaleResult>> {
    const start = Date.now();
    const { checkoutData, items } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'venda:criar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    if (!context.caixaAtivo) {
      return { success: false, data: null, error: 'É necessário abrir o caixa antes de realizar uma venda.' };
    }

    const pricingItems = items.map(item => ({
      produtoId: item.produto.id,
      nome: item.produto.nome,
      preco_unitario: item.produto.preco_venda,
      preco_custo: item.produto.preco_custo || 0,
      quantidade: item.quantidade,
      desconto: item.desconto,
    }));

    const pricingDecision = BusinessRegistry.pricing.validatePricing(
      context,
      pricingItems,
      checkoutData.descontoGeral
    );

    if (!pricingDecision.allowed) {
      return {
        success: false,
        data: null,
        error: pricingDecision.reason,
        decision: pricingDecision,
      };
    }

    for (const item of items) {
      const stockDecision = await BusinessRegistry.inventory.checkAvailability(
        context,
        item.produto.id,
        item.quantidade
      );
      if (!stockDecision.allowed) {
        return {
          success: false,
          data: null,
          error: stockDecision.reason,
          decision: stockDecision,
        };
      }
    }

    const totals = pricingDecision.metadata.totals;
    const dbItens = items.map(item => ({
      produto_id: item.produto.id,
      nome_produto: item.produto.nome,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco_venda,
      desconto: item.desconto,
      total: item.total,
    }));

    const { data: vendaId, error: rpcError } = await supabase.rpc('criar_venda_completa', {
      p_loja_id: context.tenant.lojaId,
      p_caixa_id: context.caixaAtivo.id,
      p_cliente_id: checkoutData.clienteId,
      p_usuario_id: context.actor.usuarioId,
      p_subtotal: totals.subtotal,
      p_desconto: totals.descontoTotal,
      p_total: totals.totalLiquido,
      p_forma_pagamento: checkoutData.formaPagamento,
      p_detalhe_pagamento: checkoutData.detalhePagamento,
      p_troco: checkoutData.troco,
      p_itens: dbItens,
    });

    if (rpcError || !vendaId) {
      return {
        success: false,
        data: null,
        error: rpcError?.message || 'Erro ao persistir venda completa.',
      };
    }

    // PEPS (FIFO) Lot Depletion & Serials Update
    for (const item of items) {
      let qtyToDeplete = Number(item.quantidade);
      
      const { data: lots } = await supabase
        .from('produto_lotes')
        .select('*')
        .eq('produto_id', item.produto.id)
        .eq('loja_id', context.tenant.lojaId)
        .eq('status', 'ativo')
        .eq('quarentena_status', 'liberado')
        .order('data_validade', { ascending: true });

      if (lots && lots.length > 0) {
        for (const lot of lots) {
          if (qtyToDeplete <= 0) break;

          const available = Number(lot.quantidade_atual || 0);
          if (available <= 0) continue;

          let deducted = 0;
          if (available >= qtyToDeplete) {
            deducted = qtyToDeplete;
            const newQty = available - qtyToDeplete;
            await supabase
              .from('produto_lotes')
              .update({
                quantidade_atual: newQty,
                status: newQty === 0 ? 'consumido' : 'ativo',
              })
              .eq('id', lot.id);
            qtyToDeplete = 0;
          } else {
            deducted = available;
            await supabase
              .from('produto_lotes')
              .update({
                quantidade_atual: 0,
                status: 'consumido',
              })
              .eq('id', lot.id);
            qtyToDeplete -= available;
          }

          // Mark serials as sold
          const { data: serials } = await supabase
            .from('produto_seriais')
            .select('id')
            .eq('lote_id', lot.id)
            .eq('status', 'disponivel')
            .limit(deducted);

          if (serials && serials.length > 0) {
            const serialIds = serials.map(s => s.id);
            await supabase
              .from('produto_seriais')
              .update({
                status: 'vendido',
                venda_id: vendaId,
              })
              .in('id', serialIds);
          }
        }
      }
    }

    const { data: vendaInfo } = await supabase
      .from('vendas')
      .select('numero, created_at')
      .eq('id', vendaId)
      .single();

    const hojeStr = new Date().toISOString().split('T')[0];

    // Buscar primeira conta financeira ativa da loja
    const { data: defaultAccs } = await supabase
      .from('finance_accounts')
      .select('id')
      .eq('loja_id', context.tenant.lojaId)
      .eq('status', 'ativo')
      .limit(1);

    const defaultAccountId = defaultAccs && defaultAccs.length > 0 ? defaultAccs[0].id : null;

    if (checkoutData.formaPagamento === "multiplo" && checkoutData.detalhePagamento) {
      // Loop over the keys in detalhePagamento and insert a separate financeiro record for each one
      for (const [meio, valor] of Object.entries(checkoutData.detalhePagamento)) {
        if (valor > 0) {
          let meioLabel = meio;
          if (meio === "dinheiro") meioLabel = "Dinheiro";
          else if (meio === "pix") meioLabel = "Pix";
          else if (meio === "cartao_credito") meioLabel = "Cartão de Crédito";
          else if (meio === "cartao_debito") meioLabel = "Cartão de Débito";
          
          const { data: newTx } = await supabase.from('financeiro').insert({
            loja_id: context.tenant.lojaId,
            tipo: 'receita',
            descricao: `Receita de Venda #${vendaInfo?.numero || 'PDV'} (${meioLabel})`,
            valor: valor,
            categoria: 'venda',
            referencia_id: vendaId,
            cliente_id: checkoutData.clienteId || null,
            data_vencimento: hojeStr,
            data_pagamento: hojeStr,
            status: 'pago',
            origem: 'pdv',
            account_id: defaultAccountId
          }).select('id').single();

          if (newTx && defaultAccountId) {
            await EventBus.publish({
              name: 'FinancialPaid',
              timestamp: new Date().toISOString(),
              context,
              payload: {
                transacaoId: newTx.id,
                accountId: defaultAccountId,
                valorPago: valor,
                tipo: 'receita',
                planoContas: 'venda',
                centroCusto: 'Geral',
                descricao: `Receita de Venda #${vendaInfo?.numero || 'PDV'} (${meioLabel})`
              }
            });
          }
        }
      }
    } else {
      const { data: newTx } = await supabase.from('financeiro').insert({
        loja_id: context.tenant.lojaId,
        tipo: 'receita',
        descricao: `Receita de Venda #${vendaInfo?.numero || 'PDV'}`,
        valor: totals.totalLiquido,
        categoria: 'venda',
        referencia_id: vendaId,
        cliente_id: checkoutData.clienteId || null,
        data_vencimento: hojeStr,
        data_pagamento: hojeStr,
        status: 'pago',
        origem: 'pdv',
        account_id: defaultAccountId
      }).select('id').single();

      if (newTx && defaultAccountId) {
        await EventBus.publish({
          name: 'FinancialPaid',
          timestamp: new Date().toISOString(),
          context,
          payload: {
            transacaoId: newTx.id,
            accountId: defaultAccountId,
            valorPago: totals.totalLiquido,
            tipo: 'receita',
            planoContas: 'venda',
            centroCusto: 'Geral',
            descricao: `Receita de Venda #${vendaInfo?.numero || 'PDV'}`
          }
        });
      }
    }

    let documentoFiscal = null;
    const docTipo = checkoutData.tipoDocumento || 'comprovante';
    const resDoc = await gerarDocumentoFiscal({
      tipo_documento: docTipo,
      venda_id: vendaId,
      cliente_id: checkoutData.clienteId || null,
      valor_total: totals.totalLiquido,
    });

    if (resDoc.error) {
      console.error('[CreateSaleCommandHandler] Erro ao gerar documento comercial:', resDoc.error);
    } else {
      documentoFiscal = resDoc.data;
    }

    const event = {
      name: EVENT_NAMES.SALE_CREATED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        vendaId,
        total: totals.totalLiquido,
        checkoutData,
        items,
      },
    };

    await EventBus.publish(event);

    return {
      success: true,
      data: {
        vendaId,
        numero: vendaInfo?.numero || 0,
        created_at: vendaInfo?.created_at || new Date().toISOString(),
        documentoFiscalId: documentoFiscal?.id || null,
        documentoFiscalNumero: documentoFiscal?.numero || null,
        documentoFiscalTipo: documentoFiscal?.tipo_documento || null,
      },
      error: null,
      decision: pricingDecision,
    };
  }
}

/**
 * 2. CancelSaleCommandHandler
 */
export class CancelSaleCommandHandler implements CommandHandler<CancelSaleCommand, null> {
  public async handle(command: CancelSaleCommand, context: BusinessContext): Promise<CommandResult<null>> {
    const { vendaId, motivo } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'venda:cancelar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: originalVenda } = await supabase
      .from('vendas')
      .select('*')
      .eq('id', vendaId)
      .eq('loja_id', context.tenant.lojaId)
      .single();

    if (!originalVenda) {
      return { success: false, data: null, error: 'Venda não encontrada ou não pertence a esta loja.' };
    }

    if (originalVenda.status === 'cancelada') {
      return { success: false, data: null, error: 'Esta venda já está cancelada.' };
    }

    const { error: updateError } = await supabase
      .from('vendas')
      .update({ status: 'cancelada' })
      .eq('id', vendaId);

    if (updateError) {
      return { success: false, data: null, error: updateError.message };
    }

    const estornoResult = await estornarFidelidadeVenda(vendaId);
    if (!estornoResult.success) {
      console.error('[CancelSaleCommandHandler] Erro ao estornar fidelidade:', estornoResult.error);
    }

    await supabase
      .from('financeiro')
      .update({ status: 'cancelado' })
      .eq('referencia_id', vendaId)
      .eq('tipo', 'receita');

    await EventBus.publish({
      name: EVENT_NAMES.SALE_CANCELLED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        vendaId,
        motivo,
        originalVenda,
      },
    });

    return { success: true, data: null, error: null };
  }
}

/**
 * 3. AdjustInventoryCommandHandler
 */
export class AdjustInventoryCommandHandler implements CommandHandler<AdjustInventoryCommand, null> {
  public async handle(command: AdjustInventoryCommand, context: BusinessContext): Promise<CommandResult<null>> {
    const { produtoId, quantidade, motivo, tipo, lojaId } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'estoque:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const activeLojaId = lojaId || context.tenant.lojaId;

    const { data: produto } = await supabase
      .from('produtos')
      .select('estoque_atual, estoque_minimo, nome, sku')
      .eq('id', produtoId)
      .single();

    if (!produto) {
      return { success: false, data: null, error: 'Produto não encontrado.' };
    }

    const estoqueAtual = Number(produto.estoque_atual || 0);
    let novoEstoque = estoqueAtual;

    if (tipo === 'entrada') novoEstoque += quantidade;
    else if (tipo === 'saida') novoEstoque -= quantidade;
    else novoEstoque = quantidade; // 'ajuste'

    novoEstoque = Math.max(0, novoEstoque);

    const { error: updateError } = await supabase
      .from('produtos')
      .update({ estoque_atual: novoEstoque })
      .eq('id', produtoId);

    if (updateError) {
      return { success: false, data: null, error: updateError.message };
    }

    const { error: movError } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        loja_id: activeLojaId,
        produto_id: produtoId,
        tipo,
        quantidade: Math.abs(tipo === 'ajuste' ? novoEstoque - estoqueAtual : quantidade),
        motivo,
        usuario_id: context.actor.usuarioId,
      });

    if (movError) {
      return { success: false, data: null, error: movError.message };
    }

    await EventBus.publish({
      name: EVENT_NAMES.INVENTORY_ADJUSTED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        produtoId,
        lojaId: activeLojaId,
        estoqueAnterior: estoqueAtual,
        novoEstoque,
        tipo,
        motivo,
      },
    });

    // REPOSIÇÃO AUTOMÁTICA: se o novo estoque estiver abaixo do mínimo, gera uma solicitação de compra automática
    const minimo = Number(produto.estoque_minimo || 0);
    if (novoEstoque < minimo && minimo > 0 && tipo === 'saida') {
      console.log(`[AdjustInventoryCommandHandler] Ruptura detectada. Gerando Ordem de Compra Automática para o produto ${produto.nome}`);
      
      const { data: autoRequest } = await supabase
        .from('purchase_requests')
        .insert({
          loja_id: activeLojaId,
          usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
          titulo: `🔄 Reposição Automática — ${produto.nome}`,
          observacao: `Solicitação gerada de forma autônoma pelo Core Engine. Estoque atual (${novoEstoque}) caiu abaixo do mínimo (${minimo}).`,
          origem: 'ia_automatico',
          status: 'solicitado',
        })
        .select('id')
        .single();

      if (autoRequest) {
        await EventBus.publish({
          name: PURCHASE_EVENT_NAMES.PURCHASE_REQUEST_CREATED,
          timestamp: new Date().toISOString(),
          context,
          payload: {
            requestId: autoRequest.id,
            produtoId,
            quantidadeSugerida: Math.max(1, Math.ceil(minimo * 2 - novoEstoque)),
            origem: 'ia_automatico',
          },
        });
      }
    }

    return { success: true, data: null, error: null };
  }
}

// ============================================
// COMPRAS ENTERPRISE (FASE 4A) COMMAND HANDLERS
// ============================================

/**
 * 4. CreatePurchaseRequestCommandHandler
 */
export class CreatePurchaseRequestCommandHandler implements CommandHandler<CreatePurchaseRequestCommand, string> {
  public async handle(command: CreatePurchaseRequestCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const { titulo, observacao, origem, itens } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'transferencia:solicitar'); // Comprador/Supervisor/Dono
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // Criar a solicitação
    const { data: request, error: requestError } = await supabase
      .from('purchase_requests')
      .insert({
        loja_id: context.tenant.lojaId,
        usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
        titulo: titulo.trim(),
        observacao: observacao || null,
        origem: origem || 'manual',
        status: 'solicitado',
      })
      .select('id')
      .single();

    if (requestError || !request) {
      return { success: false, data: null, error: requestError?.message || 'Erro ao criar solicitação de compra.' };
    }

    // Disparar Evento
    await EventBus.publish({
      name: PURCHASE_EVENT_NAMES.PURCHASE_REQUEST_CREATED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        requestId: request.id,
        titulo,
        itens,
        origem: origem || 'manual',
      },
    });

    return { success: true, data: request.id, error: null };
  }
}

/**
 * 5. ApprovePurchaseCommandHandler
 * Executa o fluxo de alçada dinâmico de múltiplos níveis baseando-se no valor total.
 */
export class ApprovePurchaseCommandHandler implements CommandHandler<ApprovePurchaseCommand, null> {
  public async handle(command: ApprovePurchaseCommand, context: BusinessContext): Promise<CommandResult<null>> {
    const { pedidoId, aprovado, justificativa } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'transferencia:aprovar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // Buscar pedido de compra
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('valor_total, status, loja_id')
      .eq('id', pedidoId)
      .single();

    if (!order) {
      return { success: false, data: null, error: 'Pedido de compra não encontrado.' };
    }

    if (order.status !== 'pendente_aprovacao' && order.status !== 'rascunho') {
      return { success: false, data: null, error: `Pedido não está em estágio de aprovação (Status atual: ${order.status}).` };
    }

    if (!aprovado) {
      // Pedido recusado
      await supabase
        .from('purchase_orders')
        .update({
          status: 'rejeitado',
          centro_custo: BusinessHelper.parseMetadata(justificativa || 'Recusado no fluxo de alçadas.').raw || justificativa,
        })
        .eq('id', pedidoId);

      return { success: true, data: null, error: null };
    }

    // Buscar níveis de aprovação do tenant
    const { data: levels } = await supabase
      .from('approval_levels')
      .select('nome_nivel, valor_limite, perfil_aprovador')
      .eq('loja_id', order.loja_id)
      .order('ordem', { ascending: true });

    // Validar políticas de alçada dinâmicas
    const decision = BusinessRegistry.policies.approval.evaluate(context, {
      totalValue: Number(order.valor_total),
      configuredLevels: levels || undefined,
    });

    if (!decision.allowed) {
      return {
        success: false,
        data: null,
        error: decision.reason,
        decision,
      };
    }

    // Atualizar status para aprovado
    await supabase
      .from('purchase_orders')
      .update({
        status: 'aprovado',
      })
      .eq('id', pedidoId);

    // Disparar Evento
    await EventBus.publish({
      name: PURCHASE_EVENT_NAMES.PURCHASE_ORDER_APPROVED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        purchaseOrderId: pedidoId,
        valor: order.valor_total,
      },
    });

    return { success: true, data: null, error: null };
  }
}

/**
 * 6. GeneratePurchaseOrderCommandHandler
 */
export class GeneratePurchaseOrderCommandHandler implements CommandHandler<GeneratePurchaseOrderCommand, string> {
  public async handle(command: GeneratePurchaseOrderCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const { purchaseRequestId, purchaseQuoteId, compradorId, tipoComprador, centroCusto, filialId } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'transferencia:solicitar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // Buscar cotação selecionada
    const { data: quote } = await supabase
      .from('purchase_quotes')
      .select('*')
      .eq('id', purchaseQuoteId)
      .single();

    if (!quote) {
      return { success: false, data: null, error: 'Cotação selecionada não encontrada.' };
    }

    // Buscar itens da solicitação
    const { data: request } = await supabase
      .from('purchase_requests')
      .select('titulo, observacao')
      .eq('id', purchaseRequestId)
      .single();

    if (!request) {
      return { success: false, data: null, error: 'Solicitação de compra não encontrada.' };
    }

    // 1. Criar pedido de compra
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        loja_id: context.tenant.lojaId,
        fornecedor_id: quote.fornecedor_id,
        comprador_id: compradorId,
        tipo_comprador: tipoComprador,
        centro_custo: centroCusto || null,
        filial_id: filialId,
        valor_total: quote.valor_total,
        status: 'pendente_aprovacao',
        purchase_request_id: purchaseRequestId,
        data_entrega_prevista: new Date(Date.now() + quote.prazo_entrega * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (orderError || !order) {
      return { success: false, data: null, error: orderError?.message || 'Erro ao gerar pedido de compra.' };
    }

    // 2. Mapear itens da cotação/contrato e criar itens do pedido
    // A tabela de preços do contrato ou itens do quote
    // Para simplificar, usamos a tabela de preços do contrato ou itens mockados a partir do quote.
    // Buscamos produtos reais do catálogo da filial correspondente
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, preco_custo')
      .eq('loja_id', filialId)
      .limit(10); // Busca produtos para criar itens correspondentes

    if (produtos && produtos.length > 0) {
      // Inserir item fictício correspondente ao valor da cotação
      await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: order.id,
          produto_id: produtos[0].id,
          quantidade: 1.0000,
          preco_unitario: quote.valor_total,
          total: quote.valor_total,
        });
    }

    // Atualizar status da solicitação
    await supabase
      .from('purchase_requests')
      .update({ status: 'convertido' })
      .eq('id', purchaseRequestId);

    // Atualizar status da cotação
    await supabase
      .from('purchase_quotes')
      .update({ status: 'selecionada' })
      .eq('id', purchaseQuoteId);

    // Disparar Evento
    await EventBus.publish({
      name: PURCHASE_EVENT_NAMES.PURCHASE_ORDER_CREATED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        purchaseOrderId: order.id,
        requestId: purchaseRequestId,
        fornecedorId: quote.fornecedor_id,
        total: quote.valor_total,
      },
    });

    return { success: true, data: order.id, error: null };
  }
}

/**
 * 7. ReceivePhysicalPurchaseCommandHandler
 * Executa a conferência física e WMS bipada. Não gera financeiro direto, alimenta lotes.
 */
export class ReceivePhysicalPurchaseCommandHandler implements CommandHandler<ReceivePhysicalPurchaseCommand, string> {
  public async handle(command: ReceivePhysicalPurchaseCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const { purchaseOrderId, recebidoPorId, conferidoPorId, itens } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'transferencia:receber'); // Supervisor/Estoquista/Dono
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // 1. Criar o recebimento físico
    const { data: receipt, error: receiptError } = await supabase
      .from('purchase_receipts')
      .insert({
        loja_id: context.tenant.lojaId,
        purchase_order_id: purchaseOrderId,
        recebido_por: recebidoPorId,
        conferido_por: conferidoPorId,
        status: itens.some(i => Number(i.quantidadeRecusada || 0) > 0) ? 'parcial' : 'total',
      })
      .select('id')
      .single();

    if (receiptError || !receipt) {
      return { success: false, data: null, error: receiptError?.message || 'Erro ao registrar recebimento físico.' };
    }

    // 2. Inserir itens de recebimento físico
    for (const item of itens) {
      await supabase
        .from('purchase_receipt_items')
        .insert({
          purchase_receipt_id: receipt.id,
          produto_id: item.produtoId,
          quantidade_enviada: item.quantidadeEnviada,
          quantidade_recebida: item.quantidadeRecebida,
          quantidade_recusada: item.quantidadeRecusada || 0,
          motivo_recusa: item.motivoRecusa || null,
          lote: item.lote || `L-${new Date().getFullYear()}-${Math.round(Math.random() * 1000)}`,
          validade: item.validade || null,
        });
    }

    // 3. Atualizar status do pedido para recebido (fisicamente)
    await supabase
      .from('purchase_orders')
      .update({ status: 'recebido' })
      .eq('id', purchaseOrderId);

    // Disparar Evento
    await EventBus.publish({
      name: PURCHASE_EVENT_NAMES.PURCHASE_RECEIVED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        receiptId: receipt.id,
        purchaseOrderId,
        itens,
      },
    });

    return { success: true, data: receipt.id, error: null };
  }
}

/**
 * 8. RegisterFiscalPurchaseCommandHandler
 * Entrada de NFe e CMV real. Executa a conciliação financeira e contas a pagar.
 * Encorporate Etapa 0.5 — Auditoria de Consistência Contábil.
 */
export class RegisterFiscalPurchaseCommandHandler implements CommandHandler<RegisterFiscalPurchaseCommand, string> {
  public async handle(command: RegisterFiscalPurchaseCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const { purchaseReceiptId, chaveNfe, numeroNf, serieNf, valorProdutos, valorImpostos, valorFrete, valorTotal, rateioCentroCustos } = command.payload;
    const fiscalEntryIdOverride = (command.payload as any).fiscalEntryId;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar'); // Financeiro/Fiscal/Dono
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // 1. Obter ou criar entrada fiscal
    let fiscalEntryId = fiscalEntryIdOverride;
    let existingEntry: any = null;

    if (fiscalEntryId) {
      const { data } = await supabase.from('purchase_fiscal_entries').select('*').eq('id', fiscalEntryId).single();
      existingEntry = data;
    } else {
      // Procurar se já existe rascunho para este recebimento físico
      const { data } = await supabase
        .from('purchase_fiscal_entries')
        .select('*')
        .eq('purchase_receipt_id', purchaseReceiptId)
        .eq('loja_id', context.tenant.lojaId)
        .limit(1)
        .maybeSingle();
      if (data) {
        existingEntry = data;
        fiscalEntryId = data.id;
      }
    }

    // 2. Validar Chave de NF-e Duplicada
    const { data: duplicateKeyEntry } = await supabase
      .from('purchase_fiscal_entries')
      .select('id, status')
      .eq('chave_nfe', chaveNfe)
      .eq('loja_id', context.tenant.lojaId)
      .limit(1)
      .maybeSingle();

    const isDuplicate = duplicateKeyEntry ? (duplicateKeyEntry.status === 'processado') : false;
    const fiscalPolicyDec = BusinessRegistry.policies.fiscalEntry.evaluate(context, {
      chaveNfe,
      isKeyDuplicate: isDuplicate,
    });

    if (!fiscalPolicyDec.allowed) {
      return { success: false, data: null, error: fiscalPolicyDec.reason, decision: fiscalPolicyDec };
    }

    // 3. Salvar registro em purchase_fiscal_entries
    const fiscalEntryData = {
      loja_id: context.tenant.lojaId,
      grupo_id: context.tenant.grupoId || null,
      purchase_receipt_id: purchaseReceiptId,
      chave_nfe: chaveNfe,
      numero_nf: numeroNf,
      serie_nf: serieNf || '1',
      valor_produtos: valorProdutos,
      valor_impostos: valorImpostos,
      valor_frete: valorFrete,
      valor_total: valorTotal,
      status: 'processado',
      rateio_centro_custos: rateioCentroCustos || { "Estoque": 100 },
    };

    let finalEntryId = '';
    if (existingEntry) {
      const { error: updateError } = await supabase
        .from('purchase_fiscal_entries')
        .update(fiscalEntryData)
        .eq('id', existingEntry.id);
      
      if (updateError) {
        return { success: false, data: null, error: updateError.message };
      }
      finalEntryId = existingEntry.id;
    } else {
      const { data: newEntry, error: insertError } = await supabase
        .from('purchase_fiscal_entries')
        .insert(fiscalEntryData)
        .select('id')
        .single();
      
      if (insertError || !newEntry) {
        return { success: false, data: null, error: insertError?.message || 'Erro ao registrar entrada fiscal.' };
      }
      finalEntryId = newEntry.id;
    }

    // 4. Obter fornecedor do recebimento/pedido correspondente
    const { data: receipt } = await supabase
      .from('purchase_receipts')
      .select('purchase_order_id')
      .eq('id', purchaseReceiptId)
      .single();

    let fornecedorId = '';
    let orderId = '';
    if (receipt) {
      orderId = receipt.purchase_order_id;
      const { data: order } = await supabase
        .from('purchase_orders')
        .select('fornecedor_id')
        .eq('id', orderId)
        .single();
      if (order) fornecedorId = order.fornecedor_id;
    }

    // 5. Query and upsert items in purchase_fiscal_entry_items
    const { data: existingItems } = await supabase
      .from('purchase_fiscal_entry_items')
      .select('*')
      .eq('fiscal_entry_id', finalEntryId);

    const { data: receiptItems } = await supabase
      .from('purchase_receipt_items')
      .select('*')
      .eq('purchase_receipt_id', purchaseReceiptId);

    const mappedItemsToInsertOrUpdate: any[] = [];
    
    if (existingItems && existingItems.length > 0) {
      // Itens já criados na importação de XML. Distribuir frete, impostos e custos extras (Rateio Proporcional)
      const totalProds = existingItems.reduce((acc, it) => acc + Number(it.valor_total), 0);
      
      for (const item of existingItems) {
        const prop = totalProds > 0 ? Number(item.valor_total) / totalProds : 1 / existingItems.length;
        const freteRateado = valorFrete * prop;
        const ipiRateado = valorImpostos * 0.3 * prop;
        const icmsRateado = valorImpostos * 0.7 * prop;
        
        const totalCustoItem = Number(item.valor_total) + freteRateado + ipiRateado;
        const unitCost = BusinessHelper.round(totalCustoItem / Number(item.quantidade_xml || 1), 2);

        await supabase
          .from('purchase_fiscal_entry_items')
          .update({
            valor_frete_rateado: freteRateado,
            valor_ipi: ipiRateado,
            valor_icms: icmsRateado,
            custo_final_unitario: unitCost,
          })
          .eq('id', item.id);

        mappedItemsToInsertOrUpdate.push({
          ...item,
          valor_frete_rateado: freteRateado,
          valor_ipi: ipiRateado,
          valor_icms: icmsRateado,
          custo_final_unitario: unitCost,
        });
      }
    } else if (receiptItems && receiptItems.length > 0) {
      // Sem itens do XML, criar baseados no recebimento físico
      const totalProds = receiptItems.reduce((acc, it) => acc + (Number(it.quantidade_recebida) * (valorTotal / receiptItems.length / Number(it.quantidade_recebida))), 0);
      
      for (const it of receiptItems) {
        const qty = Number(it.quantidade_recebida);
        const rawItemValue = valorTotal / receiptItems.length;
        const prop = totalProds > 0 ? rawItemValue / totalProds : 1 / receiptItems.length;
        const freteRateado = valorFrete * prop;
        const ipiRateado = valorImpostos * 0.3 * prop;
        const icmsRateado = valorImpostos * 0.7 * prop;
        const unitCost = BusinessHelper.round((rawItemValue + freteRateado) / qty, 2);

        const newItem = {
          fiscal_entry_id: finalEntryId,
          produto_id: it.produto_id,
          codigo_xml: `XML-${it.produto_id.substring(0, 6)}`,
          descricao_xml: `Produto ${it.produto_id.substring(0, 6)}`,
          quantidade_xml: qty,
          quantidade_recebida: qty,
          valor_unitario: BusinessHelper.round(rawItemValue / qty, 2),
          valor_total: rawItemValue,
          valor_frete_rateado: freteRateado,
          valor_ipi: ipiRateado,
          valor_icms: icmsRateado,
          custo_final_unitario: unitCost,
          lote: it.lote,
          validade: it.validade,
        };

        const { data: insertedItem } = await supabase
          .from('purchase_fiscal_entry_items')
          .insert(newItem)
          .select('*')
          .single();

        if (insertedItem) {
          mappedItemsToInsertOrUpdate.push(insertedItem);
        }
      }
    }

    // 6. ETAPA 0.5 — AUDITORIA DE CONSISTÊNCIA CONTÁBIL
    for (const item of mappedItemsToInsertOrUpdate) {
      if (Number(item.custo_final_unitario) < 0) {
        throw new Error(`Consistência Contábil: Custo unitário do produto ${item.descricao_xml || item.produto_id} não pode ser negativo (Calculado: R$ ${Number(item.custo_final_unitario).toFixed(2)}).`);
      }
    }

    if (mappedItemsToInsertOrUpdate.length === 0) {
      throw new Error(`Consistência Contábil: Uma nota fiscal não pode ser processada sem itens.`);
    }

    // 7. Atualizar o preco_custo dos produtos no catálogo, e obter histórico de custos
    const costHistoryItens: any[] = [];
    for (const item of mappedItemsToInsertOrUpdate) {
      const { data: prod } = await supabase
        .from('produtos')
        .select('preco_custo, nome')
        .eq('id', item.produto_id)
        .single();

      const custoAnterior = prod ? Number(prod.preco_custo || 0) : Number(item.custo_final_unitario);
      const custoNovo = Number(item.custo_final_unitario);

      // Avaliar política de variação de custo
      const costPolicyDec = BusinessRegistry.policies.costUpdate.evaluate(context, {
        custoAnterior,
        custoNovo,
        productName: prod?.nome || item.descricao_xml || 'Produto',
      });

      if (!costPolicyDec.allowed) {
        throw new Error(costPolicyDec.reason || `Variação abrupta de custo não autorizada.`);
      }

      await supabase
        .from('produtos')
        .update({
          preco_custo: custoNovo,
        })
        .eq('id', item.produto_id);

      costHistoryItens.push({
        produtoId: item.produto_id,
        custoAnterior,
        custoNovo,
      });
    }

    // 8. Extração de duplicatas/vencimentos do XML
    let vencimentos: Array<{ vencimento: string; valor: number }> = [];
    const { data: updatedEntry } = await supabase
      .from('purchase_fiscal_entries')
      .select('xml_json')
      .eq('id', finalEntryId)
      .single();

    if (updatedEntry?.xml_json && (updatedEntry.xml_json as any).installments) {
      vencimentos = (updatedEntry.xml_json as any).installments.map((d: any) => ({
        vencimento: d.dVenc,
        valor: Number(d.vDup),
      }));
    }

    // 9. Validar consistência do contas a pagar (Duplicatas vs Total da Nota)
    if (vencimentos.length > 0) {
      const totalVencimentos = vencimentos.reduce((acc, v) => acc + Number(v.valor), 0);
      const payableDec = BusinessRegistry.policies.payableGeneration.evaluate(context, {
        valorTotalNota: valorTotal,
        valorTotalParcelas: totalVencimentos,
      });

      if (!payableDec.allowed) {
        throw new Error(payableDec.reason || `Soma das parcelas diverge do total da nota.`);
      }
    }

    // 10. Mapear itens para o InventoryLotSubscriber (inclui quarentena e geração automática de serial)
    const lotSubItems = mappedItemsToInsertOrUpdate.map(item => {
      const seriais: string[] = [];
      const desc = (item.descricao_xml || '').toLowerCase();
      const isHighValue = desc.includes('notebook') || desc.includes('celular') || desc.includes('tv') || desc.includes('smartphone') || desc.includes('iphone');
      if (isHighValue) {
        const qty = Math.ceil(Number(item.quantidade_xml || 1));
        for (let i = 0; i < qty; i++) {
          const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
          seriais.push(`SN-${item.codigo_xml || 'PROD'}-${rand}`);
        }
      }

      return {
        produtoId: item.produto_id,
        quantidade: Number(item.quantidade_xml),
        lote: item.lote || `L-${new Date().getFullYear()}-${Math.round(Math.random() * 1000)}`,
        validade: item.validade || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        custoUnitario: Number(item.custo_final_unitario),
        seriais: seriais.length > 0 ? seriais : undefined,
      };
    });

    // 11. Disparar Evento Fiscal (Gera Contas a Pagar, Lotes em Quarentena e Histórico de Custos no Banco)
    await EventBus.publish({
      name: PURCHASE_EVENT_NAMES.PURCHASE_FISCAL_REGISTERED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        fiscalEntryId: finalEntryId,
        receiptId: purchaseReceiptId,
        fornecedorId,
        total: valorTotal,
        itens: lotSubItems,
        vencimentos: vencimentos.length > 0 ? vencimentos : undefined,
      },
    });

    // 12. Publicar o histórico de custos para o CostHistorySubscriber
    await EventBus.publish({
      name: 'ProductCostUpdated',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        fiscalEntryId: finalEntryId,
        fornecedorId,
        itens: costHistoryItens,
      },
    });

    return { success: true, data: finalEntryId, error: null };
  }
}

/**
 * 9. CancelPurchaseCommandHandler
 */
export class CancelPurchaseCommandHandler implements CommandHandler<CancelPurchaseCommand, null> {
  public async handle(command: CancelPurchaseCommand, context: BusinessContext): Promise<CommandResult<null>> {
    const { purchaseOrderId, motivo } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'venda:cancelar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    await supabase
      .from('purchase_orders')
      .update({
        status: 'cancelado',
      })
      .eq('id', purchaseOrderId);

    // Disparar Evento
    await EventBus.publish({
      name: PURCHASE_EVENT_NAMES.PURCHASE_CANCELLED,
      timestamp: new Date().toISOString(),
      context,
      payload: {
        purchaseOrderId,
        motivo,
      },
    });

    return { success: true, data: null, error: null };
  }
}

/**
 * 10. ImportPurchaseXMLCommandHandler
 */
export class ImportPurchaseXMLCommandHandler implements CommandHandler<ImportPurchaseXMLCommand, string> {
  public async handle(command: ImportPurchaseXMLCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const { xmlRaw, parserVersion } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const extractTag = (xml: string, tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return match ? match[1].trim() : '';
    };

    // 1. Parse NFe key and headers
    const infNFeMatch = xmlRaw.match(/<infNFe\s+[^>]*Id=["']NFe(\d{44})["']/i) || xmlRaw.match(/<infNFe\s+[^>]*Id=["'](\d{44})["']/i);
    const key = infNFeMatch ? infNFeMatch[1] : `KEY-${Math.round(Math.random() * 100000000000000)}`;

    const numeroNf = extractTag(xmlRaw, 'nNF') || `NF-${Math.round(Math.random() * 100000)}`;
    const serieNf = extractTag(xmlRaw, 'serie') || '1';
    
    let emissionDate = extractTag(xmlRaw, 'dhEmi') || extractTag(xmlRaw, 'dEmi');
    if (emissionDate) {
      emissionDate = emissionDate.split('T')[0];
    } else {
      emissionDate = new Date().toISOString().split('T')[0];
    }

    // 2. Parse Fornecedor details
    const emitXml = extractTag(xmlRaw, 'emit');
    const supplierCnpj = extractTag(emitXml, 'CNPJ');
    const supplierName = extractTag(emitXml, 'xNome') || 'Fornecedor XML';

    // 3. Parse Totals
    const totalXml = extractTag(xmlRaw, 'ICMSTot');
    const valorProdutos = parseFloat(extractTag(totalXml, 'vProd') || '0');
    const valorFrete = parseFloat(extractTag(totalXml, 'vFrete') || '0');
    const valorSeguro = parseFloat(extractTag(totalXml, 'vSeg') || '0');
    const valorOutrasDespesas = parseFloat(extractTag(totalXml, 'vOutro') || '0');
    const valorDesconto = parseFloat(extractTag(totalXml, 'vDesc') || '0');
    const valorTotal = parseFloat(extractTag(totalXml, 'vNF') || '0');
    const valorImpostos = parseFloat(extractTag(totalXml, 'vTotTrib') || '0');

    // 4. Find or auto-link Fornecedor in database by CNPJ
    let fornecedorId: string | null = null;
    if (supplierCnpj) {
      const { data: supplier } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('cnpj', supplierCnpj)
        .eq('loja_id', context.tenant.lojaId)
        .limit(1)
        .maybeSingle();
      if (supplier) {
        fornecedorId = supplier.id;
      }
    }

    if (!fornecedorId) {
      const { data: newSupplier } = await supabase
        .from('fornecedores')
        .insert({
          loja_id: context.tenant.lojaId,
          nome: supplierName,
          cnpj: supplierCnpj || `CNPJ-${Math.round(Math.random()*100000000)}`,
          status: 'ativo',
        })
        .select('id')
        .single();
      if (newSupplier) fornecedorId = newSupplier.id;
    }

    // 5. Parse Duplicatas / Installments
    const installments: any[] = [];
    const dupMatches = xmlRaw.matchAll(/<dup>([\s\S]*?)<\/dup>/gi);
    for (const match of dupMatches) {
      const dupXml = match[1];
      const nDup = extractTag(dupXml, 'nDup');
      const dVenc = extractTag(dupXml, 'dVenc') ? extractTag(dupXml, 'dVenc').split('T')[0] : new Date().toISOString().split('T')[0];
      const vDup = parseFloat(extractTag(dupXml, 'vDup') || '0');
      installments.push({ nDup, dVenc, vDup });
    }

    // 6. Build XML JSON cache
    const parsedCache = {
      key,
      numeroNf,
      serieNf,
      emissionDate,
      supplier: {
        name: supplierName,
        cnpj: supplierCnpj,
      },
      totals: {
        products: valorProdutos,
        freight: valorFrete,
        insurance: valorSeguro,
        expenses: valorOutrasDespesas,
        discount: valorDesconto,
        total: valorTotal,
        taxes: valorImpostos,
      },
      installments,
    };

    // 7. Check duplicates
    const { data: duplicate } = await supabase
      .from('purchase_fiscal_entries')
      .select('id, status')
      .eq('chave_nfe', key)
      .eq('loja_id', context.tenant.lojaId)
      .limit(1)
      .maybeSingle();

    if (duplicate && duplicate.status === 'processado') {
      return { success: false, data: null, error: `Bloqueio Contábil: A NF-e de chave "${key}" já foi processada e lançada.` };
    }

    // 8. Insert or update the fiscal entry row
    let fiscalEntryId = '';
    const fiscalEntryData = {
      loja_id: context.tenant.lojaId,
      grupo_id: context.tenant.grupoId || null,
      fornecedor_id: fornecedorId,
      chave_nfe: key,
      numero_nf: numeroNf,
      serie_nf: serieNf,
      data_emissao: emissionDate,
      data_entrada: new Date().toISOString().split('T')[0],
      valor_produtos: valorProdutos,
      valor_frete: valorFrete,
      valor_seguro: valorSeguro,
      valor_outras_despesas: valorOutrasDespesas,
      valor_desconto: valorDesconto,
      valor_impostos: valorImpostos,
      valor_total: valorTotal,
      status: 'xml_importado',
      xml_original: xmlRaw,
      xml_processado: xmlRaw,
      xml_json: parsedCache,
      parser_version: parserVersion,
      created_by: context.actor.usuarioId,
    };

    if (duplicate) {
      await supabase
        .from('purchase_fiscal_entries')
        .update(fiscalEntryData)
        .eq('id', duplicate.id);
      fiscalEntryId = duplicate.id;
      // Excluir itens rascunho antigos
      await supabase
        .from('purchase_fiscal_entry_items')
        .delete()
        .eq('fiscal_entry_id', duplicate.id);
    } else {
      const { data: newEntry, error: insertErr } = await supabase
        .from('purchase_fiscal_entries')
        .insert(fiscalEntryData)
        .select('id')
        .single();
      if (insertErr || !newEntry) {
        return { success: false, data: null, error: insertErr?.message || 'Erro ao criar entrada fiscal de XML.' };
      }
      fiscalEntryId = newEntry.id;
    }

    // 9. Parse Det (items) and insert
    const detMatches = xmlRaw.matchAll(/<det\s+nItem=["']\d+["']>([\s\S]*?)<\/det>/gi);
    for (const match of detMatches) {
      const itemXml = match[1];
      const prodXml = extractTag(itemXml, 'prod');
      const cProd = extractTag(prodXml, 'cProd');
      const cEAN = extractTag(prodXml, 'cEAN');
      const xProd = extractTag(prodXml, 'xProd') || 'Produto XML';
      const ncm = extractTag(prodXml, 'NCM');
      const cfop = extractTag(prodXml, 'CFOP');
      const uCom = extractTag(prodXml, 'uCom');
      const qCom = parseFloat(extractTag(prodXml, 'qCom') || '0');
      const vUnCom = parseFloat(extractTag(prodXml, 'vUnCom') || '0');
      const vProd = parseFloat(extractTag(prodXml, 'vProd') || '0');
      const vDesc = parseFloat(extractTag(prodXml, 'vDesc') || '0');

      // Impostos
      const vIPI = parseFloat(extractTag(itemXml, 'vIPI') || '0');
      const vICMS = parseFloat(extractTag(itemXml, 'vICMS') || '0');
      const vPIS = parseFloat(extractTag(itemXml, 'vPIS') || '0');
      const vCOFINS = parseFloat(extractTag(itemXml, 'vCOFINS') || '0');

      // Tentar auto-vincular produto por Código de Barras (EAN) ou SKU (cProd)
      let boundProductId: string | null = null;
      if (cEAN || cProd) {
        let q = supabase
          .from('produtos')
          .select('id')
          .eq('loja_id', context.tenant.lojaId)
          .is('deleted_at', null);

        if (cEAN && cEAN !== 'SEM GTIN') {
          q = q.eq('codigo_barras', cEAN);
        } else {
          q = q.eq('sku', cProd);
        }

        const { data: bound } = await q.limit(1).maybeSingle();
        if (bound) boundProductId = bound.id;
      }

      await supabase
        .from('purchase_fiscal_entry_items')
        .insert({
          fiscal_entry_id: fiscalEntryId,
          produto_id: boundProductId,
          codigo_xml: cProd,
          ean_xml: cEAN,
          descricao_xml: xProd,
          ncm,
          cest: extractTag(prodXml, 'CEST') || null,
          cfop,
          unidade_xml: uCom,
          quantidade_xml: qCom,
          quantidade_recebida: 0,
          valor_unitario: vUnCom,
          valor_total: vProd,
          valor_desconto: vDesc,
          valor_frete_rateado: 0,
          valor_ipi: vIPI,
          valor_icms: vICMS,
          valor_pis: vPIS,
          valor_cofins: vCOFINS,
          custo_final_unitario: vUnCom,
          divergente: false,
        });
    }

    // Disparar Evento
    await EventBus.publish({
      name: 'PurchaseXMLImported',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        fiscalEntryId,
        chaveNfe: key,
        numeroNf,
        total: valorTotal,
      },
    });

    return { success: true, data: fiscalEntryId, error: null };
  }
}

/**
 * 11. ReconcilePurchaseXMLCommandHandler
 */
export class ReconcilePurchaseXMLCommandHandler implements CommandHandler<ReconcilePurchaseXMLCommand, string> {
  public async handle(command: ReconcilePurchaseXMLCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const { fiscalEntryId, justificativas, vencimentosParcelas } = command.payload;
    const payloadExtended = command.payload as any;
    const purchaseOrderId = payloadExtended.purchaseOrderId;
    const purchaseReceiptId = payloadExtended.purchaseReceiptId;
    const itensVinculados = payloadExtended.itensVinculados;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // 1. Atualizar vínculos de produtos manuais, se fornecidos
    if (itensVinculados) {
      for (const [itemId, prodId] of Object.entries(itensVinculados)) {
        await supabase
          .from('purchase_fiscal_entry_items')
          .update({ produto_id: prodId })
          .eq('id', itemId);
      }
    }

    // 2. Se fornecido vínculos de pedido ou recebimento físico, atualizar a nota
    if (purchaseOrderId || purchaseReceiptId) {
      const updateData: any = {};
      if (purchaseOrderId) updateData.purchase_order_id = purchaseOrderId;
      if (purchaseReceiptId) updateData.purchase_receipt_id = purchaseReceiptId;
      
      await supabase
        .from('purchase_fiscal_entries')
        .update(updateData)
        .eq('id', fiscalEntryId);
    }

    // 3. Obter a nota fiscal e itens
    const { data: fiscalEntry } = await supabase
      .from('purchase_fiscal_entries')
      .select('*')
      .eq('id', fiscalEntryId)
      .single();

    const { data: fiscalItems } = await supabase
      .from('purchase_fiscal_entry_items')
      .select('*')
      .eq('fiscal_entry_id', fiscalEntryId);

    if (!fiscalEntry || !fiscalItems || fiscalItems.length === 0) {
      return { success: false, data: null, error: 'Nota fiscal ou itens não encontrados.' };
    }

    // 4. Buscar itens do pedido e recebimento físico para comparação
    let orderItems: any[] = [];
    if (fiscalEntry.purchase_order_id) {
      const { data } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', fiscalEntry.purchase_order_id);
      orderItems = data || [];
    }

    let receiptItems: any[] = [];
    if (fiscalEntry.purchase_receipt_id) {
      const { data } = await supabase
        .from('purchase_receipt_items')
        .select('*')
        .eq('purchase_receipt_id', fiscalEntry.purchase_receipt_id);
      receiptItems = data || [];
    }

    // Obter CNPJ do fornecedor no banco para checar contra o XML
    let supplierCnpj = '';
    if (fiscalEntry.fornecedor_id) {
      const { data: sup } = await supabase
        .from('fornecedores')
        .select('cnpj')
        .eq('id', fiscalEntry.fornecedor_id)
        .single();
      if (sup) supplierCnpj = sup.cnpj || '';
    }

    // 5. Comparação e Classificação na Matriz de Divergências
    let entryDivergenceLevel: 'informativo' | 'medio' | 'alto' | 'critico' | null = null;
    let entryDivergente = false;

    // Checar CRÍTICO: CNPJ emitente diferente do fornecedor do pedido
    let invoiceCnpj = '';
    if (fiscalEntry.xml_json && (fiscalEntry.xml_json as any).supplier) {
      invoiceCnpj = (fiscalEntry.xml_json as any).supplier.cnpj || '';
    }

    const cleanInvoice = invoiceCnpj.replace(/\D/g, '');
    const cleanSupplier = supplierCnpj.replace(/\D/g, '');
    let isCnpjDivergent = false;
    if (cleanInvoice && cleanSupplier && cleanInvoice !== cleanSupplier) {
      isCnpjDivergent = true;
      entryDivergenceLevel = 'critico';
      entryDivergente = true;
    }

    for (const item of fiscalItems) {
      let itemDivergent = false;
      let itemDivergenceLevel: 'informativo' | 'medio' | 'alto' | 'critico' | null = null;
      let motivo = '';

      const orderItem = orderItems.find(o => o.produto_id === item.produto_id);
      const receiptItem = receiptItems.find(r => r.produto_id === item.produto_id);

      // Checar INFORMATIVO: código EAN ou SKU diverge do catálogo
      if (orderItem && item.ean_xml && orderItem.ean !== item.ean_xml) {
        itemDivergent = true;
        itemDivergenceLevel = 'informativo';
        motivo = `EAN no XML (${item.ean_xml}) diverge do cadastro do produto.`;
      }

      // Checar MÉDIO: preço unitário diverge do pedido
      if (orderItem) {
        const orderPrice = Number(orderItem.preco_unitario);
        const xmlPrice = Number(item.valor_unitario);
        if (Math.abs(orderPrice - xmlPrice) > 0.01) {
          itemDivergent = true;
          itemDivergenceLevel = 'medio';
          motivo = `Preço unitário no XML (R$ ${xmlPrice.toFixed(2)}) diverge do pedido (R$ ${orderPrice.toFixed(2)}).`;
        }
      }

      // Checar ALTO: quantidade diverge do recebimento físico (WMS check)
      if (receiptItem) {
        const qtyReceived = Number(receiptItem.quantidade_recebida);
        const qtyXml = Number(item.quantidade_xml);
        if (qtyReceived !== qtyXml) {
          itemDivergent = true;
          itemDivergenceLevel = 'alto';
          motivo = `Quantidade no XML (${qtyXml}) diverge do recebimento físico (${qtyReceived}).`;
        }
      }

      // Se CNPJ diverge, força crítico
      if (isCnpjDivergent) {
        itemDivergent = true;
        itemDivergenceLevel = 'critico';
        motivo = `CNPJ emitente diverge do fornecedor da compra. | ` + motivo;
      }

      // Verificar justificativa
      const just = justificativas[item.id] || '';
      if (itemDivergent && ['medio', 'alto', 'critico'].includes(itemDivergenceLevel || '') && !just) {
        return {
          success: false,
          data: null,
          error: `Divergência detectada no item "${item.descricao_xml}": ${motivo}. Uma justificativa contábil é obrigatória.`
        };
      }

      // Atualizar estatísticas do item
      await supabase
        .from('purchase_fiscal_entry_items')
        .update({
          divergente: itemDivergent,
          divergencia_nivel: itemDivergenceLevel,
          divergencia_motivo: itemDivergent ? (motivo + (just ? ` [Justificativa: ${just}]` : '')) : null,
        })
        .eq('id', item.id);

      if (itemDivergenceLevel) {
        if (!entryDivergenceLevel) {
          entryDivergenceLevel = itemDivergenceLevel;
        } else {
          const levels = ['informativo', 'medio', 'alto', 'critico'];
          const currentIdx = levels.indexOf(entryDivergenceLevel);
          const itemIdx = levels.indexOf(itemDivergenceLevel);
          if (itemIdx > currentIdx) {
            entryDivergenceLevel = itemDivergenceLevel;
          }
        }
        entryDivergente = true;
      }
    }

    // Salvar parcelas se fornecidas
    if (vencimentosParcelas && vencimentosParcelas.length > 0) {
      const xmlJson = { ...(fiscalEntry.xml_json as any || {}), installments: vencimentosParcelas.map((v, i) => ({ nDup: String(i+1), dVenc: v.vencimento, vDup: v.valor })) };
      await supabase
        .from('purchase_fiscal_entries')
        .update({ xml_json: xmlJson })
        .eq('id', fiscalEntryId);
    }

    // Atualizar status da nota fiscal
    await supabase
      .from('purchase_fiscal_entries')
      .update({
        status: entryDivergente ? 'divergente' : 'xml_importado',
      })
      .eq('id', fiscalEntryId);

    // Disparar Evento
    await EventBus.publish({
      name: 'PurchaseXMLReconciled',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        fiscalEntryId,
        divergente: entryDivergente,
        divergenciaNivel: entryDivergenceLevel,
      },
    });

    return { success: true, data: fiscalEntryId, error: null };
  }
}

/**
 * 12. ReleaseQuarantineLotCommandHandler
 */
export class ReleaseQuarantineLotCommandHandler implements CommandHandler<ReleaseQuarantineLotCommand, null> {
  public async handle(command: ReleaseQuarantineLotCommand, context: BusinessContext): Promise<CommandResult<null>> {
    const { loteId, status, justificativa } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'transferencia:receber');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // 1. Obter o lote
    const { data: lot } = await supabase
      .from('produto_lotes')
      .select('*')
      .eq('id', loteId)
      .single();

    if (!lot) {
      return { success: false, data: null, error: 'Lote não encontrado.' };
    }

    // 2. Atualizar o status do lote
    const { error: updateError } = await supabase
      .from('produto_lotes')
      .update({
        quarentena_status: status,
      })
      .eq('id', loteId);

    if (updateError) {
      return { success: false, data: null, error: updateError.message };
    }

    // 3. Atualizar números de série vinculados
    const serialStatus = status === 'liberado' ? 'disponivel' : 'quarentena';
    await supabase
      .from('produto_seriais')
      .update({ status: serialStatus })
      .eq('lote_id', loteId);

    // 4. Se o lote for reprovado, deduzir a quantidade do estoque do produto catálogo!
    if (status === 'reprovado') {
      const { data: prod } = await supabase
        .from('produtos')
        .select('estoque_atual')
        .eq('id', lot.produto_id)
        .single();

      if (prod) {
        const qtyToDeduct = Number(lot.quantidade_atual);
        const novoEstoque = Math.max(0, Number(prod.estoque_atual) - qtyToDeduct);

        await supabase
          .from('produtos')
          .update({ estoque_atual: novoEstoque })
          .eq('id', lot.produto_id);

        // Gravar movimentação de saída
        await supabase
          .from('movimentacoes_estoque')
          .insert({
            loja_id: lot.loja_id,
            produto_id: lot.produto_id,
            tipo: 'saida',
            quantidade: qtyToDeduct,
            motivo: `Lote ${lot.lote} reprovado na quarentena. Justificativa: ${justificativa || 'Sem justificativa'}`,
            usuario_id: context.actor.usuarioId !== 'anonymous' ? context.actor.usuarioId : null,
          });
      }
    }

    // Disparar Evento
    await EventBus.publish({
      name: 'QuarantineLotReleased',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        loteId,
        status,
        justificativa,
      },
    });

    return { success: true, data: null, error: null };
  }
}

/**
 * 13. AddAdditionalPurchaseCostCommandHandler
 */
export class AddAdditionalPurchaseCostCommandHandler implements CommandHandler<AddAdditionalPurchaseCostCommand, null> {
  public async handle(command: AddAdditionalPurchaseCostCommand, context: BusinessContext): Promise<CommandResult<null>> {
    const { fiscalEntryId, tipoCusto, valor, descricao } = command.payload;
    const supabase = await createClient();

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // 1. Inserir o custo adicional
    const { error: insertError } = await supabase
      .from('purchase_additional_costs')
      .insert({
        loja_id: context.tenant.lojaId,
        fiscal_entry_id: fiscalEntryId,
        tipo_custo: tipoCusto,
        valor,
        descricao: descricao || `Custo adicional retroativo de ${tipoCusto}`,
      });

    if (insertError) {
      return { success: false, data: null, error: insertError.message };
    }

    // 2. Obter nota fiscal e itens para rateio
    const { data: fiscalEntry } = await supabase
      .from('purchase_fiscal_entries')
      .select('*')
      .eq('id', fiscalEntryId)
      .single();

    const { data: items } = await supabase
      .from('purchase_fiscal_entry_items')
      .select('*')
      .eq('fiscal_entry_id', fiscalEntryId);

    if (!fiscalEntry || !items || items.length === 0) {
      return { success: true, data: null, error: null };
    }

    // 3. Rateio proporcional ao valor_total dos itens da nota
    const totalProdutos = items.reduce((acc, item) => acc + Number(item.valor_total), 0);
    const costHistoryItens: any[] = [];

    for (const item of items) {
      const proporcao = totalProdutos > 0 ? Number(item.valor_total) / totalProdutos : 1 / items.length;
      const share = valor * proporcao;
      const shareUnit = share / Number(item.quantidade_xml || 1);

      const novoCustoUnitario = BusinessHelper.round(Number(item.custo_final_unitario) + shareUnit, 2);

      // Obter custo anterior do produto no catálogo
      const { data: prod } = await supabase
        .from('produtos')
        .select('preco_custo, nome')
        .eq('id', item.produto_id)
        .single();

      const custoAnterior = prod ? Number(prod.preco_custo || 0) : Number(item.custo_final_unitario);

      // Atualizar preco_custo no catálogo
      await supabase
        .from('produtos')
        .update({
          preco_custo: novoCustoUnitario,
        })
        .eq('id', item.produto_id);

      // Atualizar custo final do item
      await supabase
        .from('purchase_fiscal_entry_items')
        .update({
          custo_final_unitario: novoCustoUnitario,
        })
        .eq('id', item.id);

      costHistoryItens.push({
        produtoId: item.produto_id,
        custoAnterior,
        custoNovo: novoCustoUnitario,
      });
    }

    // 4. Disparar evento para registrar no produto_custo_historico
    await EventBus.publish({
      name: 'ProductCostUpdated',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        fiscalEntryId,
        fornecedorId: fiscalEntry.fornecedor_id,
        itens: costHistoryItens,
      },
    });

    return { success: true, data: null, error: null };
  }
}

// ============================================
// TESOURARIA CORE & CONTABILIDADE (FASE 5A) HANDLERS
// ============================================

/**
 * 11. CreateFinancialTransactionCommandHandler
 */
export class CreateFinancialTransactionCommandHandler implements CommandHandler<CreateFinancialTransactionCommand, string> {
  public async handle(command: CreateFinancialTransactionCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { tipo, descricao, valor, categoria, accountId, dataVencimento, clienteId, fornecedorId, centroCusto, planoContas, origem, numeroParcela, totalParcelas, moeda, idempotencyKey, observacao, recorrente, recorrenciaId, recorrenciaOrigemId, recorrenciaTipo, recorrenciaIndice, recorrenciaTotal } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    // 1. Validar consistência contábil (Etapa 0)
    const valDec = await BusinessRegistry.validators.validateFinancialConsistency(context, {
      accountId,
      tipo,
      valor,
      dataVencimento,
      centroCusto,
      planoContas,
      idempotencyKey,
      status: 'pendente'
    });

    if (!valDec.allowed) {
      return { success: false, data: null, error: valDec.reason, decision: valDec };
    }

    // 2. Avaliar alçadas de aprovação dinâmicas (Melhoria 4)
    let workflowStatus = 'aprovado';
    let workflowAlcadaAtual = null;

    // Buscar regras de alçada no banco
    const { data: rules } = await supabase
      .from('financial_approval_rules')
      .select('*')
      .eq('loja_id', context.tenant.lojaId)
      .lte('valor_minimo', valor)
      .gte('valor_maximo', valor)
      .or(`departamento.eq.${centroCusto || 'Geral'},departamento.eq.Geral`)
      .order('valor_minimo', { ascending: false });

    if (tipo === 'despesa') {
      if (rules && rules.length > 0) {
        const rule = rules[0];
        workflowStatus = 'pendente_aprovacao';
        workflowAlcadaAtual = rule.cargo_aprovador;
      } else if (valor > 20000) {
        workflowStatus = 'pendente_aprovacao';
        workflowAlcadaAtual = 'dono';
      }
    }

    let finalObservacao = (observacao || "").trim();
    if (valDec.metadata?.bypass_saldo) {
      const bypassMsg = `[Bypass de Alçada] Lançamento permitido por alçada superior mesmo com saldo insuficiente. Saldo no momento: R$ ${Number(valDec.metadata.saldo_no_momento).toFixed(2)}.`;
      finalObservacao = finalObservacao 
        ? `${finalObservacao}\n\n${bypassMsg}`
        : bypassMsg;
    }

    // 3. Salvar no banco de dados (idempotência inclusa)
    const txData = {
      loja_id: context.tenant.lojaId,
      tipo,
      descricao,
      valor,
      valor_original: valor,
      categoria,
      account_id: accountId,
      data_vencimento: dataVencimento,
      cliente_id: clienteId || null,
      fornecedor_id: fornecedorId || null,
      centro_custo: centroCusto || null,
      plano_contas: planoContas || null,
      origem: origem || 'manual',
      numero_parcela: numeroParcela || 1,
      total_parcelas: totalParcelas || 1,
      moeda_transacao: moeda || 'BRL',
      workflow_status: workflowStatus,
      workflow_alcada_atual: workflowAlcadaAtual,
      idempotency_key: idempotencyKey || null,
      status: 'pendente',
      observacao: finalObservacao || null,
      audit_info: {
        created_by: context.actor.usuarioId,
        ip: context.environment.ip,
        browser: context.environment.browser,
        device: context.environment.device,
        bypass_saldo: valDec.metadata?.bypass_saldo || false,
        saldo_no_momento: valDec.metadata?.saldo_no_momento !== undefined ? valDec.metadata.saldo_no_momento : null,
        recorrencia: recorrente ? {
          recorrencia_id: recorrenciaId || null,
          recorrencia_origem_id: recorrenciaOrigemId || null,
          recorrencia_tipo: recorrenciaTipo || 'mensal_fixa',
          recorrencia_indice: recorrenciaIndice || null,
          recorrencia_total: recorrenciaTotal || null
        } : null
      }
    };

    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('financeiro')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .eq('loja_id', context.tenant.lojaId)
        .maybeSingle();

      if (existing) {
        return { success: true, data: existing.id, error: null };
      }
    }

    const { data: tx, error } = await supabase
      .from('financeiro')
      .insert(txData)
      .select('id')
      .single();

    if (error || !tx) {
      return { success: false, data: null, error: error?.message || 'Erro ao criar transação financeira.' };
    }

    // 4. Disparar Event Sourcing (FinancialCreated)
    await EventBus.publish({
      name: 'FinancialCreated',
      timestamp: new Date().toISOString(),
      context,
      payload: { transacaoId: tx.id, valor, tipo }
    });

    return { success: true, data: tx.id, error: null };
  }
}

/**
 * 12. ProcessFinancialPaymentCommandHandler
 */
export class ProcessFinancialPaymentCommandHandler implements CommandHandler<ProcessFinancialPaymentCommand, string> {
  public async handle(command: ProcessFinancialPaymentCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { transacaoId, accountId, valorPago, juros, multa, desconto, dataPagamento, idempotencyKey } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: tx, error: txError } = await supabase
      .from('financeiro')
      .select('*')
      .eq('id', transacaoId)
      .eq('loja_id', context.tenant.lojaId)
      .single();

    if (txError || !tx) {
      return { success: false, data: null, error: 'Transação contábil não encontrada.' };
    }

    if (tx.workflow_status === 'pendente_aprovacao') {
      return { success: false, data: null, error: 'Operação Bloqueada: Esta transação requer aprovação de alçada contábil.' };
    }

    const valDec = await BusinessRegistry.validators.validateFinancialConsistency(context, {
      accountId,
      tipo: 'baixa',
      valor: valorPago,
      dataPagamento,
      idempotencyKey
    });

    if (!valDec.allowed) {
      return { success: false, data: null, error: valDec.reason, decision: valDec };
    }

    // Soft Lock Bancário (Melhoria 3)
    const { data: account } = await supabase
      .from('finance_accounts')
      .select('locked_until')
      .eq('id', accountId)
      .single();

    const now = new Date();
    if (account?.locked_until && new Date(account.locked_until) > now) {
      return { success: false, data: null, error: 'Soft Lock: Conta bloqueada por transação concorrente. Tente novamente.' };
    }

    const lockTime = new Date(Date.now() + 3000).toISOString();
    await supabase
      .from('finance_accounts')
      .update({ locked_until: lockTime })
      .eq('id', accountId);

    const valorOriginal = Number(tx.valor_original || tx.valor);
    const valorPagoAcumulado = Number(tx.valor_pago || 0) + valorPago;
    
    const totalJuros = Number(tx.juros || 0) + Number(juros || 0);
    const totalMulta = Number(tx.multa || 0) + Number(multa || 0);
    const totalDesconto = Number(tx.desconto || 0) + Number(desconto || 0);

    const valorAlvoTotal = valorOriginal + totalJuros + totalMulta - totalDesconto;
    const statusNovo = valorPagoAcumulado >= valorAlvoTotal ? 'pago' : 'pendente';

    let finalObservacao = tx.observacao || "";
    if (valDec.metadata?.bypass_saldo) {
      const bypassMsg = `[Bypass de Alçada - Baixa] Lançamento liquidado por alçada superior mesmo com saldo insuficiente na conta. Saldo no momento: R$ ${Number(valDec.metadata.saldo_no_momento).toFixed(2)}.`;
      finalObservacao = finalObservacao 
        ? `${finalObservacao}\n\n${bypassMsg}`
        : bypassMsg;
    }

    const finalAuditInfo = {
      ...(tx.audit_info || {}),
      bypass_saldo: valDec.metadata?.bypass_saldo || false,
      saldo_no_momento: valDec.metadata?.saldo_no_momento !== undefined ? valDec.metadata.saldo_no_momento : (tx.audit_info?.saldo_no_momento || null)
    };

    const { error: updateError } = await supabase
      .from('financeiro')
      .update({
        valor_pago: valorPagoAcumulado,
        juros: totalJuros,
        multa: totalMulta,
        desconto: totalDesconto,
        status: statusNovo,
        data_pagamento: statusNovo === 'pago' ? (dataPagamento || now.toISOString().split('T')[0]) : null,
        account_id: accountId,
        idempotency_key: idempotencyKey || null,
        observacao: finalObservacao || null,
        audit_info: finalAuditInfo
      })
      .eq('id', transacaoId);

    if (updateError) {
      await supabase.from('finance_accounts').update({ locked_until: null }).eq('id', accountId);
      return { success: false, data: null, error: updateError.message };
    }

    // Publicar Evento no EventBus
    await EventBus.publish({
      name: 'FinancialPaid',
      timestamp: now.toISOString(),
      context,
      payload: {
        transacaoId,
        accountId,
        valorPago,
        tipo: tx.tipo,
        planoContas: tx.plano_contas || tx.categoria,
        centroCusto: tx.centro_custo || 'Geral',
        descricao: tx.descricao,
        historico: `Baixa contábil ${statusNovo === 'pago' ? 'total' : 'parcial'} do lançamento #${transacaoId.substring(0, 8)}`
      }
    });

    await supabase.from('finance_accounts').update({ locked_until: null }).eq('id', accountId);

    return { success: true, data: transacaoId, error: null };
  }
}

/**
 * 13. RenegotiateFinancialTransactionCommandHandler
 */
export class RenegotiateFinancialTransactionCommandHandler implements CommandHandler<RenegotiateFinancialTransactionCommand, string[]> {
  public async handle(command: RenegotiateFinancialTransactionCommand, context: BusinessContext): Promise<CommandResult<string[]>> {
    const supabase = await createClient();
    const { transacoesIds, novasParcelas, accountId, justificativa } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    if (!transacoesIds || transacoesIds.length === 0) {
      return { success: false, data: null, error: 'Selecione pelo menos um título para renegociação.' };
    }

    // 1. Cancelar títulos antigos
    for (const id of transacoesIds) {
      await supabase
        .from('financeiro')
        .update({
          status: 'cancelado',
          justificativa: `Renegociado: ${justificativa}`
        })
        .eq('id', id)
        .eq('loja_id', context.tenant.lojaId);
    }

    // 2. Criar novas parcelas vinculadas ao parent_id
    const criadasIds: string[] = [];
    for (let i = 0; i < novasParcelas.length; i++) {
      const p = novasParcelas[i];
      const { data: newTx } = await supabase
        .from('financeiro')
        .insert({
          loja_id: context.tenant.lojaId,
          grupo_id: context.tenant.grupoId || null,
          tipo: 'despesa',
          descricao: `Parcela Renegociada ${i + 1}/${novasParcelas.length} — Acordo`,
          valor: p.valor,
          valor_original: p.valor,
          categoria: 'renegociacao_acordo',
          account_id: accountId,
          data_vencimento: p.vencimento,
          status: 'pendente',
          parent_id: transacoesIds[0],
          numero_parcela: i + 1,
          total_parcelas: novasParcelas.length,
          justificativa
        })
        .select('id')
        .single();

      if (newTx) criadasIds.push(newTx.id);
    }

    // 3. Publicar evento no EventBus (Event Sourcing)
    await EventBus.publish({
      name: 'FinancialRenegotiated',
      timestamp: new Date().toISOString(),
      context,
      payload: { transacoesIds, criadasIds, justificativa }
    });

    return { success: true, data: criadasIds, error: null };
  }
}

/**
 * 14. RefundFinancialTransactionCommandHandler
 */
export class RefundFinancialTransactionCommandHandler implements CommandHandler<RefundFinancialTransactionCommand, string> {
  public async handle(command: RefundFinancialTransactionCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { transacaoId, justificativa } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: tx } = await supabase
      .from('financeiro')
      .select('*')
      .eq('id', transacaoId)
      .eq('loja_id', context.tenant.lojaId)
      .single();

    if (!tx || Number(tx.valor_pago || 0) <= 0) {
      return { success: false, data: null, error: 'Título contábil não possui liquidações para ser estornado.' };
    }

    const valorEstornado = Number(tx.valor_pago);

    const { error } = await supabase
      .from('financeiro')
      .update({
        valor_pago: 0,
        status: 'pendente',
        data_pagamento: null,
        justificativa: `Estornado: ${justificativa}`
      })
      .eq('id', transacaoId);

    if (error) return { success: false, data: null, error: error.message };

    await EventBus.publish({
      name: 'FinancialRefunded',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        transacaoId,
        accountId: tx.account_id,
        valorEstornado,
        tipo: tx.tipo,
        planoContas: tx.plano_contas || tx.categoria,
        centroCusto: tx.centro_custo || 'Geral',
        descricao: tx.descricao,
        justificativa
      }
    });

    return { success: true, data: transacaoId, error: null };
  }
}

/**
 * 15. CancelFinancialTransactionCommandHandler
 */
export class CancelFinancialTransactionCommandHandler implements CommandHandler<CancelFinancialTransactionCommand, string> {
  public async handle(command: CancelFinancialTransactionCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { transacaoId, justificativa } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { error } = await supabase
      .from('financeiro')
      .update({
        status: 'cancelado',
        justificativa
      })
      .eq('id', transacaoId)
      .eq('loja_id', context.tenant.lojaId);

    if (error) return { success: false, data: null, error: error.message };

    await EventBus.publish({
      name: 'FinancialCanceled',
      timestamp: new Date().toISOString(),
      context,
      payload: { transacaoId, justificativa }
    });

    return { success: true, data: transacaoId, error: null };
  }
}

/**
 * 16. CreateFinanceAccountCommandHandler
 */
export class CreateFinanceAccountCommandHandler implements CommandHandler<CreateFinanceAccountCommand, string> {
  public async handle(command: CreateFinanceAccountCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { nome, tipo, banco, agencia, conta, pix, limite, saldoNegativoPermitido, moeda } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: newAccount, error } = await supabase
      .from('finance_accounts')
      .insert({
        loja_id: context.tenant.lojaId,
        grupo_id: context.tenant.grupoId || null,
        nome,
        tipo,
        banco: banco || null,
        agencia: agencia || null,
        conta: conta || null,
        pix: pix || null,
        limite: limite || 0.00,
        saldo_negativo_permitido: saldoNegativoPermitido || false,
        moeda: moeda || 'BRL',
        saldo_atual: 0.00,
        saldo_disponivel: limite || 0.00,
        status: 'ativo'
      })
      .select('id')
      .single();

    if (error || !newAccount) {
      return { success: false, data: null, error: error?.message || 'Erro ao cadastrar conta de tesouraria.' };
    }

    return { success: true, data: newAccount.id, error: null };
  }
}

/**
 * 17. TransferFinanceFundsCommandHandler
 */
export class TransferFinanceFundsCommandHandler implements CommandHandler<TransferFinanceFundsCommand, string> {
  public async handle(command: TransferFinanceFundsCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { origemAccountId, destinoAccountId, valor, descricao } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const valDec = await BusinessRegistry.validators.validateFinancialConsistency(context, {
      accountId: origemAccountId,
      tipo: 'transferencia',
      valor
    });

    if (!valDec.allowed) {
      return { success: false, data: null, error: valDec.reason, decision: valDec };
    }

    const now = new Date();
    await EventBus.publish({
      name: 'FinancialFundsTransferred',
      timestamp: now.toISOString(),
      context,
      payload: {
        origemAccountId,
        destinoAccountId,
        valor,
        descricao: descricao || `Transferência de fundos corporativa`,
        planoContas: 'transferencia_interna',
        centroCusto: 'Geral'
      }
    });

    return { success: true, data: 'Transferência efetuada com sucesso.', error: null };
  }
}

/**
 * 18. ApproveFinancialWorkflowCommandHandler
 */
export class ApproveFinancialWorkflowCommandHandler implements CommandHandler<ApproveFinancialWorkflowCommand, string> {
  public async handle(command: ApproveFinancialWorkflowCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { transacaoId, status, justificativa } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: tx } = await supabase
      .from('financeiro')
      .select('*')
      .eq('id', transacaoId)
      .eq('loja_id', context.tenant.lojaId)
      .single();

    if (!tx) return { success: false, data: null, error: 'Lançamento financeiro não encontrado.' };

    const now = new Date();
    let assinaturaHash = null;

    if (status === 'aprovado') {
      const dataString = `${context.tenant.lojaId}-${context.actor.usuarioId}-${transacaoId}-${tx.valor}-${now.toISOString()}-${context.environment.ip || '127.0.0.1'}-${context.environment.browser || 'system'}`;
      assinaturaHash = crypto.createHash('sha256').update(dataString).digest('hex');
    }

    const { error } = await supabase
      .from('financeiro')
      .update({
        workflow_status: status === 'aprovado' ? 'aprovado' : 'rejeitado',
        workflow_alcada_atual: null,
        justificativa,
        assinatura_hash: assinaturaHash
      })
      .eq('id', transacaoId);

    if (error) return { success: false, data: null, error: error.message };

    await EventBus.publish({
      name: status === 'aprovado' ? 'FinancialWorkflowApproved' : 'FinancialWorkflowRejected',
      timestamp: now.toISOString(),
      context,
      payload: { transacaoId, assinaturaHash, justificativa }
    });

    return { success: true, data: transacaoId, error: null };
  }
}

/**
 * 19. CreateClosingPeriodCommandHandler
 */
export class CreateClosingPeriodCommandHandler implements CommandHandler<CreateClosingPeriodCommand, string> {
  public async handle(command: CreateClosingPeriodCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { ano, mes } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: newPeriod, error } = await supabase
      .from('closing_periods')
      .upsert({
        loja_id: context.tenant.lojaId,
        ano,
        mes,
        status: 'fechado',
        fechado_em: new Date().toISOString(),
        fechado_por: context.actor.usuarioId
      })
      .select('id')
      .single();

    if (error) return { success: false, data: null, error: error.message };

    return { success: true, data: newPeriod.id, error: null };
  }
}

/**
 * 20. ReopenClosingPeriodCommandHandler
 */
export class ReopenClosingPeriodCommandHandler implements CommandHandler<ReopenClosingPeriodCommand, string> {
  public async handle(command: ReopenClosingPeriodCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { ano, mes, justificativa } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: period, error } = await supabase
      .from('closing_periods')
      .update({
        status: 'aberto',
        reaberto_em: new Date().toISOString(),
        reaberto_por: context.actor.usuarioId,
        reabertura_justificativa: justificativa
      })
      .eq('loja_id', context.tenant.lojaId)
      .eq('ano', ano)
      .eq('mes', mes)
      .select('id')
      .single();

    if (error) return { success: false, data: null, error: error.message };

    return { success: true, data: period.id, error: null };
  }
}

/**
 * 21. UpdateFinancialBudgetCommandHandler
 */
export class UpdateFinancialBudgetCommandHandler implements CommandHandler<UpdateFinancialBudgetCommand, string> {
  public async handle(command: UpdateFinancialBudgetCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { ano, mes, centroCusto, planoContas, valorPrevisto } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: budget, error } = await supabase
      .from('financial_budgets')
      .upsert({
        loja_id: context.tenant.lojaId,
        ano,
        mes,
        centro_custo: centroCusto,
        plano_contas: planoContas,
        valor_previsto: valorPrevisto
      })
      .select('id')
      .single();

    if (error) return { success: false, data: null, error: error.message };

    return { success: true, data: budget.id, error: null };
  }
}

/**
 * 22. ProcessBankReconciliationCommandHandler
 */
export class ProcessBankReconciliationCommandHandler implements CommandHandler<ProcessBankReconciliationCommand, string> {
  public async handle(command: ProcessBankReconciliationCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { statementId, conciliacoes } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    for (const c of conciliacoes) {
      await supabase
        .from('bank_transactions')
        .update({
          status: c.status,
          transacao_id: c.erpTransacaoId || null,
          justificativa: c.justificativa || null
        })
        .eq('id', c.bankTransactionId);

      if (c.status === 'conciliado' && c.erpTransacaoId) {
        await supabase
          .from('financeiro')
          .update({
            status: 'pago'
          })
          .eq('id', c.erpTransacaoId);

        const { data: tx } = await supabase
          .from('financeiro')
          .select('*')
          .eq('id', c.erpTransacaoId)
          .single();

        if (tx) {
          await EventBus.publish({
            name: 'FinancialPaid',
            timestamp: new Date().toISOString(),
            context,
            payload: {
              transacaoId: tx.id,
              accountId: tx.account_id,
              valorPago: Number(tx.valor),
              tipo: tx.tipo,
              planoContas: tx.plano_contas || tx.categoria,
              centroCusto: tx.centro_custo || 'Geral',
              descricao: `Conciliado via extrato bancário: ${tx.descricao}`
            }
          });
        }
      }
    }

    return { success: true, data: 'Conciliação processada com sucesso.', error: null };
  }
}

/**
 * 23. ReprocessFinancialTransactionCommandHandler
 */
export class ReprocessFinancialTransactionCommandHandler implements CommandHandler<ReprocessFinancialTransactionCommand, string> {
  public async handle(command: ReprocessFinancialTransactionCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { transacaoId, motivo } = command.payload;

    const permissionDec = BusinessRegistry.permissions.check(context, 'financeiro:ajustar');
    if (!permissionDec.allowed) {
      return { success: false, data: null, error: permissionDec.reason, decision: permissionDec };
    }

    const { data: tx } = await supabase
      .from('financeiro')
      .select('*')
      .eq('id', transacaoId)
      .eq('loja_id', context.tenant.lojaId)
      .single();

    if (!tx) return { success: false, data: null, error: 'Transação não encontrada.' };

    await EventBus.publish({
      name: 'FinancialPaid',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        transacaoId: tx.id,
        accountId: tx.account_id,
        valorPago: Number(tx.valor_pago || tx.valor),
        tipo: tx.tipo,
        planoContas: tx.plano_contas || tx.categoria,
        centroCusto: tx.centro_custo || 'Geral',
        descricao: `Reprocessado: ${tx.descricao} - Motivo: ${motivo}`
      }
    });

    return { success: true, data: transacaoId, error: null };
  }
}

/**
 * 24. OpenCashSessionCommandHandler (CashEngine)
 */
export class OpenCashSessionCommandHandler implements CommandHandler<OpenCashSessionCommand, string> {
  public async handle(command: OpenCashSessionCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { operadorId, valorAbertura, accountId } = command.payload;

    const { data: newSession, error } = await supabase
      .from('caixas')
      .insert({
        loja_id: context.tenant.lojaId,
        operador_id: operadorId,
        valor_abertura: valorAbertura,
        valor_fechamento: 0.00,
        status: 'aberto',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error || !newSession) {
      return { success: false, data: null, error: error?.message || 'Erro ao abrir sessão de caixa.' };
    }

    await EventBus.publish({
      name: 'FinancialPaid',
      timestamp: new Date().toISOString(),
      context,
      payload: {
        transacaoId: null,
        accountId,
        valorPago: valorAbertura,
        tipo: 'receita',
        planoContas: 'receita_operacional',
        centroCusto: 'Vendas',
        descricao: `Abertura de sessão de caixa #${newSession.id.substring(0, 8)}`
      }
    });

    return { success: true, data: newSession.id, error: null };
  }
}

/**
 * 25. CloseCashSessionCommandHandler (CashEngine)
 */
export class CloseCashSessionCommandHandler implements CommandHandler<CloseCashSessionCommand, string> {
  public async handle(command: CloseCashSessionCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { caixaId, valorFechamento } = command.payload;

    const { error } = await supabase
      .from('caixas')
      .update({
        valor_fechamento: valorFechamento,
        status: 'fechado',
        closed_at: new Date().toISOString()
      })
      .eq('id', caixaId)
      .eq('loja_id', context.tenant.lojaId);

    if (error) return { success: false, data: null, error: error.message };

    return { success: true, data: caixaId, error: null };
  }
}

/**
 * 26. PerformCashInflowCommandHandler (CashEngine - Suprimento)
 */
export class PerformCashInflowCommandHandler implements CommandHandler<PerformCashInflowCommand, string> {
  public async handle(command: PerformCashInflowCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { caixaId, valor, motivo } = command.payload;

    const { data: movement, error } = await supabase
      .from('movimentacoes_caixa')
      .insert({
        caixa_id: caixaId,
        tipo: 'suprimento',
        valor,
        observacao: motivo,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error || !movement) {
      return { success: false, data: null, error: error?.message || 'Erro ao registrar suprimento.' };
    }

    return { success: true, data: movement.id, error: null };
  }
}

/**
 * 27. PerformCashOutflowCommandHandler (CashEngine - Sangria)
 */
export class PerformCashOutflowCommandHandler implements CommandHandler<PerformCashOutflowCommand, string> {
  public async handle(command: PerformCashOutflowCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { caixaId, valor, motivo } = command.payload;

    const { data: movement, error } = await supabase
      .from('movimentacoes_caixa')
      .insert({
        caixa_id: caixaId,
        tipo: 'sangria',
        valor,
        observacao: motivo,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error || !movement) {
      return { success: false, data: null, error: error?.message || 'Erro ao registrar sangria.' };
    }

    return { success: true, data: movement.id, error: null };
  }
}

/**
 * 28. ReconcileCashSessionCommandHandler (CashEngine - Conferência/Diferença)
 */
export class ReconcileCashSessionCommandHandler implements CommandHandler<ReconcileCashSessionCommand, string> {
  public async handle(command: ReconcileCashSessionCommand, context: BusinessContext): Promise<CommandResult<string>> {
    const supabase = await createClient();
    const { caixaId, valorContado, justificativa } = command.payload;

    const { data: caixa } = await supabase
      .from('caixas')
      .select('*')
      .eq('id', caixaId)
      .single();

    if (!caixa) return { success: false, data: null, error: 'Sessão de caixa não encontrada.' };

    const { data: movements } = await supabase
      .from('movimentacoes_caixa')
      .select('*')
      .eq('caixa_id', caixaId);

    const suprimentos = (movements || []).filter(m => m.tipo === 'suprimento').reduce((acc, m) => acc + Number(m.valor), 0);
    const sangrias = (movements || []).filter(m => m.tipo === 'sangria').reduce((acc, m) => acc + Number(m.valor), 0);

    const { data: vendas } = await supabase
      .from('vendas')
      .select('valor_total')
      .eq('caixa_id', caixaId);

    const faturamentoVendas = (vendas || []).reduce((acc, v) => acc + Number(v.valor_total), 0);

    const saldoSistemaProjetado = Number(caixa.valor_abertura) + suprimentos - sangrias + faturamentoVendas;
    const diferenca = valorContado - saldoSistemaProjetado;

    await supabase
      .from('caixas')
      .update({
        valor_fechamento: valorContado,
        status: 'fechado',
        closed_at: new Date().toISOString()
      })
      .eq('id', caixaId);

    if (Math.abs(diferenca) > 0.01) {
      const planoContas = diferenca > 0 ? 'receita_outras' : 'despesas_financeiras';
      const desc = diferenca > 0 ? 'Sobra de caixa' : 'Quebra de caixa';

      await EventBus.publish({
        name: 'FinancialPaid',
        timestamp: new Date().toISOString(),
        context,
        payload: {
          transacaoId: null,
          accountId: null,
          valorPago: Math.abs(diferenca),
          tipo: diferenca > 0 ? 'receita' : 'despesa',
          planoContas,
          centroCusto: 'Vendas',
          descricao: `Ajuste de caixa #${caixaId.substring(0, 8)} - ${desc} de R$ ${diferenca.toFixed(2)}`,
          historico: `Conferência física de fechamento do caixa #${caixaId.substring(0, 8)}. Justificativa: ${justificativa || 'Sem justificativa'}`
        }
      });
    }

    return { success: true, data: `Fechamento concluído. Diferença apurada: R$ ${diferenca.toFixed(2)}`, error: null };
  }
}
