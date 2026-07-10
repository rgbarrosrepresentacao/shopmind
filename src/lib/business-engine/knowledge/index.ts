// ============================================
// CORE BUSINESS RULES ENGINE — KNOWLEDGE PROVIDER (IA)
// ============================================

import { createClient } from '@/lib/supabase/server';
import type { BusinessContext } from '../types';
import { BusinessHelper } from '../helpers';

export class KnowledgeProvider {
  /**
   * Obtém um resumo consolidado do faturamento e margens para a IA.
   * O fluxo obriga a IA a consumir esta fonte de verdade em vez de rodar selects brutos.
   */
  public async getConsolidatedSalesSummary(
    context: BusinessContext,
    periodDays: number = 30
  ): Promise<Record<string, any>> {
    const supabase = await createClient();
    const storeFilter = context.tenant.lojaId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    let query = supabase
      .from('vendas')
      .select('id, total, subtotal, desconto, created_at, loja_id')
      .eq('status', 'concluida')
      .gte('created_at', startDate.toISOString());

    if (context.actor.tipo !== 'dono' && storeFilter) {
      query = query.eq('loja_id', storeFilter);
    }

    const { data: vendas, error } = await query;

    if (error || !vendas || vendas.length === 0) {
      return {
        totalVendido: 0,
        quantidadeVendas: 0,
        ticketMedio: 0,
        descontoMedio: 0,
        mensagem: 'Sem vendas registradas no período analisado.',
      };
    }

    const totalVendido = vendas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const totalSubtotal = vendas.reduce((acc, v) => acc + Number(v.subtotal || 0), 0);
    const totalDesconto = vendas.reduce((acc, v) => acc + Number(v.desconto || 0), 0);
    const quantidadeVendas = vendas.length;
    const ticketMedio = BusinessHelper.round(totalVendido / quantidadeVendas, 2);
    const percentualDesconto = totalSubtotal > 0 ? BusinessHelper.round((totalDesconto / totalSubtotal) * 100, 2) : 0;

    return {
      totalVendido: BusinessHelper.round(totalVendido, 2),
      quantidadeVendas,
      ticketMedio,
      totalDesconto: BusinessHelper.round(totalDesconto, 2),
      percentualDesconto,
      periodDays,
      mensagem: `A holding faturou ${BusinessHelper.formatCurrency(totalVendido)} em ${quantidadeVendas} vendas nos últimos ${periodDays} dias.`,
    };
  }

  /**
   * Obtém a saúde do estoque consolidado para responder perguntas de logística da IA.
   */
  public async getConsolidatedInventoryStatus(
    context: BusinessContext
  ): Promise<Record<string, any>> {
    const supabase = await createClient();
    
    let query = supabase
      .from('produtos')
      .select('id, nome, estoque_atual, estoque_minimo, preco_custo, preco_venda')
      .is('deleted_at', null)
      .eq('status', 'ativo');

    const { data: produtos, error } = await query;

    if (error || !produtos || produtos.length === 0) {
      return {
        totalItens: 0,
        valorCustoTotal: 0,
        rupturas: 0,
        alertaReposicao: 0,
      };
    }

    let totalItens = 0;
    let valorCustoTotal = 0;
    let rupturas = 0;
    let alertaReposicao = 0;

    for (const p of produtos) {
      const estoque = Number(p.estoque_atual || 0);
      const minimo = Number(p.estoque_minimo || 0);
      const custo = Number(p.preco_custo || 0);

      totalItens += estoque;
      valorCustoTotal += BusinessHelper.round(estoque * custo, 2);

      if (estoque <= 0) rupturas++;
      else if (minimo > 0 && estoque <= minimo) alertaReposicao++;
    }

    return {
      totalItens,
      totalProdutosCadastrados: produtos.length,
      valorCustoTotal: BusinessHelper.round(valorCustoTotal, 2),
      rupturas,
      alertaReposicao,
      mensagem: `Temos ${totalItens} unidades em estoque avaliadas em ${BusinessHelper.formatCurrency(valorCustoTotal)} de custo. Encontradas ${rupturas} rupturas e ${alertaReposicao} produtos abaixo do mínimo.`,
    };
  }

  /**
   * 3. getSupplierPerformanceScorecard
   * Retorna os scores consolidados de fornecedores para a IA.
   */
  public async getSupplierPerformanceScorecard(
    context: BusinessContext
  ): Promise<Record<string, any>> {
    const supabase = await createClient();
    
    const { data: scores, error } = await supabase
      .from('supplier_score')
      .select('*, fornecedor:fornecedores(nome)')
      .eq('loja_id', context.tenant.lojaId);

    if (error || !scores || scores.length === 0) {
      return {
        fornecedoresCount: 0,
        fornecedores: [],
        mensagem: 'Sem histórico de avaliações de fornecedores registrado.',
      };
    }

    const mapped = scores.map(s => ({
      fornecedorId: s.fornecedor_id,
      nome: s.fornecedor?.nome || 'Desconhecido',
      leadTime: s.lead_time,
      pontualidade: s.pontualidade,
      devolucoes: s.indice_devolucao,
      notaGeral: s.nota_geral_ia || s.nota_geral,
      status: s.nota_geral_ia >= 75 ? 'Excelente' : s.nota_geral_ia >= 50 ? 'Regular' : 'Crítico',
    }));

    // Ordena por maior nota
    mapped.sort((a, b) => b.notaGeral - a.notaGeral);

    return {
      fornecedoresCount: mapped.length,
      fornecedores: mapped,
      mensagem: `Analisados ${mapped.length} fornecedores da holding. O fornecedor líder é "${mapped[0].nome}" (Nota: ${mapped[0].notaGeral.toFixed(0)}/100).`,
    };
  }

  /**
   * 4. getProcurementFinancials
   * Calcula economia acumulada, capital comprometido e ordens atrasadas para a IA CEO.
   */
  public async getProcurementFinancials(
    context: BusinessContext
  ): Promise<Record<string, any>> {
    const supabase = await createClient();

    // Buscar pedidos de compra ativos
    const { data: orders } = await supabase
      .from('purchase_orders')
      .select('status, valor_total, data_entrega_prevista')
      .eq('loja_id', context.tenant.lojaId);

    // Buscar cotações para calcular a economia (diferença entre cotação selecionada e a maior rejeitada)
    const { data: quotes } = await supabase
      .from('purchase_quotes')
      .select('purchase_request_id, valor_total, status');

    // Agrupar cotações por solicitação
    const quoteMap: Record<string, number[]> = {};
    (quotes || []).forEach(q => {
      if (!quoteMap[q.purchase_request_id]) quoteMap[q.purchase_request_id] = [];
      quoteMap[q.purchase_request_id].push(Number(q.valor_total));
    });

    let economiaTotal = 0;
    Object.values(quoteMap).forEach(prices => {
      if (prices.length >= 2) {
        // Ordena
        prices.sort((a, b) => a - b);
        // Economia = Preço máximo cotado - Preço mínimo cotado (vencedor)
        const econ = prices[prices.length - 1] - prices[0];
        if (econ > 0) economiaTotal += econ;
      }
    });

    let capitalComprometido = 0;
    let pedidosAbertos = 0;
    let pedidosAtrasados = 0;
    const hoje = new Date();

    (orders || []).forEach(o => {
      if (['rascunho', 'pendente_aprovacao', 'aprovado', 'em_transito'].includes(o.status)) {
        capitalComprometido += Number(o.valor_total);
        pedidosAbertos++;
        
        if (o.data_entrega_prevista) {
          const entrega = new Date(o.data_entrega_prevista);
          if (entrega < hoje) {
            pedidosAtrasados++;
          }
        }
      }
    });

    return {
      economiaAcumulada: BusinessHelper.round(economiaTotal, 2),
      capitalComprometido: BusinessHelper.round(capitalComprometido, 2),
      pedidosAbertos,
      pedidosAtrasados,
      mensagem: `A holding obteve uma economia de negociação de ${BusinessHelper.formatCurrency(economiaTotal)} nas últimas cotações. Há ${pedidosAbertos} pedidos abertos comprometendo ${BusinessHelper.formatCurrency(capitalComprometido)} em caixa (${pedidosAtrasados} atrasados).`,
    };
  }

  /**
   * 5. getPurchaseSuggestions (IA Compradora com Transferência Holding Prioritária)
   * Analisa estoques e sugere reabastecimentos, priorizando transferência interna se houver excesso.
   */
  public async getPurchaseSuggestions(
    context: BusinessContext,
    budgetLimit: number = 80000
  ): Promise<Record<string, any>> {
    const supabase = await createClient();

    // 1. Buscar todos os produtos do grupo empresarial
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome, sku, preco_custo, preco_venda, estoque_atual, estoque_minimo, loja_id')
      .is('deleted_at', null)
      .eq('status', 'ativo');

    if (!produtos || produtos.length === 0) {
      return { sugestoes: [], totalEstimado: 0, mensagem: 'Sem produtos para analisar.' };
    }

    const sugestoes: any[] = [];
    let custoTotalAcumulado = 0;

    // Agrupar produtos por SKU para analisar o estoque em nível de HOLDING (Produto Mestre)
    const skuMap: Record<string, any[]> = {};
    produtos.forEach(p => {
      if (!p.sku) return;
      if (!skuMap[p.sku]) skuMap[p.sku] = [];
      skuMap[p.sku].push(p);
    });

    // Analisar cada SKU
    for (const [sku, items] of Object.entries(skuMap)) {
      // Filtrar itens da loja ativa que precisam de reabastecimento (estoque < minimo)
      const activeLojaItem = items.find(i => i.loja_id === context.tenant.lojaId);
      if (!activeLojaItem) continue;

      const est = Number(activeLojaItem.estoque_atual || 0);
      const min = Number(activeLojaItem.estoque_minimo || 0);

      if (est < min) {
        // Precisa de reposição!
        const qtySugerida = Math.max(1, Math.ceil(min * 2 - est));
        const custoUnitario = Number(activeLojaItem.preco_custo || 0);
        const custoTotalItem = BusinessHelper.round(custoUnitario * qtySugerida, 2);

        // A. Verificar se existe OUTRA FILIAL com ESTOQUE EXCEDENTE (Estoque > Mínimo * 2)
        const filialComExcesso = items.find(i => i.loja_id !== context.tenant.lojaId && Number(i.estoque_atual) > Number(i.estoque_minimo) * 2);

        if (filialComExcesso) {
          // SUGERE TRANSFERÊNCIA INTERNA (Economia logístico-financeira!)
          sugestoes.push({
            produtoId: activeLojaItem.id,
            nome: activeLojaItem.nome,
            sku,
            quantidadeSugerida: Math.min(qtySugerida, Number(filialComExcesso.estoque_atual) - Number(filialComExcesso.estoque_minimo)),
            tipoAcao: 'transferencia',
            origemRecomendada: `Filial Concorrente (Transferência interna)`,
            motivo: `Estoque atual (${est}) está abaixo do mínimo (${min}). Foi detectado excesso de estoque (${filialComExcesso.estoque_atual}) na filial parceira. Priorizada transferência para economia de caixa.`,
            custoEstimado: 0.00,
          });
        } else {
          // Se estourar o limite de orçamento do comprador, descarta sugestão
          if (custoTotalAcumulado + custoTotalItem > budgetLimit) {
            continue;
          }

          // SUGERE COMPRA EXTERNA (Não há estoque interno sobressalente)
          custoTotalAcumulado += custoTotalItem;
          sugestoes.push({
            produtoId: activeLojaItem.id,
            nome: activeLojaItem.nome,
            sku,
            quantidadeSugerida: qtySugerida,
            tipoAcao: 'compra',
            origemRecomendada: 'Fornecedor Credenciado (Compra externa)',
            motivo: `Estoque crítico (${est}) inferior ao mínimo (${min}). Não há estoque excedente em outras filiais da holding. Necessário comprar para evitar ruptura.`,
            custoEstimado: custoTotalItem,
          });
        }
      }
    }

    return {
      sugestoes,
      totalEstimado: BusinessHelper.round(custoTotalAcumulado, 2),
      budgetLimit,
      mensagem: `A IA Compradora analisou a holding e gerou ${sugestoes.length} recomendações para abastecimento nos próximos 30 dias (Investimento estimado: ${BusinessHelper.formatCurrency(custoTotalAcumulado)} de um teto de ${BusinessHelper.formatCurrency(budgetLimit)}).`,
    };
  }
}
