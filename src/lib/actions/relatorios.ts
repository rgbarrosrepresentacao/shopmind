"use server";

import { createClient } from "@/lib/supabase/server";

export interface KPIStats {
  faturamentoTotal: number;
  ticketMedio: number;
  totalVendas: number;
  cmvTotal: number;
  lucroEstimado: number;
}

export interface DREInfo {
  receitaBruta: number;
  cmv: number;
  lucroBruto: number;
  despesas: number;
  lucroLiquido: number;
}

export interface TopProduct {
  id: string;
  nome: string;
  quantidade: number;
  totalFaturado: number;
  fotoUrl: string | null;
}

export interface FaturamentoDiario {
  data: string;
  valor: number;
  quantidade: number;
}

// ============================================
// OBTER DADOS DE RELATÓRIO E FINANCEIRO
// ============================================
export async function getRelatorioDashboard(
  dias: number = 30
): Promise<{
  kpis: KPIStats;
  dre: DREInfo;
  topProdutos: TopProduct[];
  faturamentoGrafico: FaturamentoDiario[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        kpis: { faturamentoTotal: 0, ticketMedio: 0, totalVendas: 0, cmvTotal: 0, lucroEstimado: 0 },
        dre: { receitaBruta: 0, cmv: 0, lucroBruto: 0, despesas: 0, lucroLiquido: 0 },
        topProdutos: [],
        faturamentoGrafico: [],
        error: "Usuário não autenticado."
      };
    }

    const { data: profile } = await supabase
      .from("usuarios")
      .select("loja_id")
      .eq("id", user.id)
      .single();

    if (!profile?.loja_id) {
      return {
        kpis: { faturamentoTotal: 0, ticketMedio: 0, totalVendas: 0, cmvTotal: 0, lucroEstimado: 0 },
        dre: { receitaBruta: 0, cmv: 0, lucroBruto: 0, despesas: 0, lucroLiquido: 0 },
        topProdutos: [],
        faturamentoGrafico: [],
        error: "Loja ativa não associada ao usuário."
      };
    }

    // Calcular data de início do filtro
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - dias);
    const dateLimitISO = dateLimit.toISOString();

    // 1. Obter todas as vendas concluídas da loja no período
    const { data: vendas, error: vendasError } = await supabase
      .from("vendas")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida")
      .gte("created_at", dateLimitISO)
      .order("created_at", { ascending: true });

    if (vendasError) {
      return {
        kpis: { faturamentoTotal: 0, ticketMedio: 0, totalVendas: 0, cmvTotal: 0, lucroEstimado: 0 },
        dre: { receitaBruta: 0, cmv: 0, lucroBruto: 0, despesas: 0, lucroLiquido: 0 },
        topProdutos: [],
        faturamentoGrafico: [],
        error: vendasError.message
      };
    }

    const vendaIds = (vendas || []).map(v => v.id);

    // 2. Obter itens de vendas para calcular CMV e Top Produtos
    let vendaItens: any[] = [];
    if (vendaIds.length > 0) {
      const { data: itens, error: itensError } = await supabase
        .from("venda_itens")
        .select(`
          id,
          venda_id,
          produto_id,
          nome_produto,
          quantidade,
          preco_unitario,
          desconto,
          total,
          produto:produtos(preco_custo, foto_url)
        `)
        .in("venda_id", vendaIds);

      if (!itensError && itens) {
        vendaItens = itens;
      }
    }

    // 3. Obter despesas financeiras pagas no período
    const { data: despesas, error: despesasError } = await supabase
      .from("financeiro")
      .select("valor")
      .eq("loja_id", profile.loja_id)
      .eq("tipo", "despesa")
      .eq("status", "pago")
      .gte("data_pagamento", dateLimitISO.split("T")[0]);

    const totalDespesas = (despesas || []).reduce((acc, d) => acc + Number(d.valor), 0);

    // --- CÁLCULOS DOS KPIS E DRE ---
    const totalFaturamento = (vendas || []).reduce((acc, v) => acc + Number(v.total), 0);
    const qtdeVendas = (vendas || []).length;
    const ticketMedio = qtdeVendas > 0 ? totalFaturamento / qtdeVendas : 0;

    let cmvTotal = 0;
    const productAggregation: Record<string, { nome: string; quantidade: number; totalFaturado: number; fotoUrl: string | null }> = {};

    vendaItens.forEach(item => {
      const qtde = Number(item.quantidade) || 0;
      const custoUnitario = Number(item.produto?.preco_custo) || 0;
      cmvTotal += qtde * custoUnitario;

      // Agregação de produtos mais vendidos
      const prodId = item.produto_id;
      if (!productAggregation[prodId]) {
        productAggregation[prodId] = {
          nome: item.nome_produto || "Produto Desconhecido",
          quantidade: 0,
          totalFaturado: 0,
          fotoUrl: item.produto?.foto_url || null
        };
      }
      productAggregation[prodId].quantidade += qtde;
      productAggregation[prodId].totalFaturado += Number(item.total) || 0;
    });

    const lucroEstimado = totalFaturamento - cmvTotal;

    const kpis: KPIStats = {
      faturamentoTotal: totalFaturamento,
      ticketMedio,
      totalVendas: qtdeVendas,
      cmvTotal,
      lucroEstimado
    };

    const dre: DREInfo = {
      receitaBruta: totalFaturamento,
      cmv: cmvTotal,
      lucroBruto: totalFaturamento - cmvTotal,
      despesas: totalDespesas,
      lucroLiquido: (totalFaturamento - cmvTotal) - totalDespesas
    };

    // --- TOP PRODUTOS ---
    const topProdutos: TopProduct[] = Object.entries(productAggregation)
      .map(([id, info]) => ({
        id,
        nome: info.nome,
        quantidade: info.quantidade,
        totalFaturado: info.totalFaturado,
        fotoUrl: info.fotoUrl
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    // --- FATURAMENTO DIÁRIO (GRÁFICO) ---
    const dateMap: Record<string, { valor: number; quantidade: number }> = {};
    
    // Inicializar o mapa com todas as datas do período para não deixar buracos
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      dateMap[dateStr] = { valor: 0, quantidade: 0 };
    }

    (vendas || []).forEach(v => {
      const date = new Date(v.created_at);
      const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      
      // Apenas adiciona ao mapa se a data existir no período (evitar outliers de fuso horário)
      if (dateMap[dateStr]) {
        dateMap[dateStr].valor += Number(v.total) || 0;
        dateMap[dateStr].quantidade += 1;
      }
    });

    const faturamentoGrafico: FaturamentoDiario[] = Object.entries(dateMap).map(([data, stats]) => ({
      data,
      valor: stats.valor,
      quantidade: stats.quantidade
    }));

    return {
      kpis,
      dre,
      topProdutos,
      faturamentoGrafico,
      error: null
    };
  } catch (error: any) {
    console.error("Erro em getRelatorioDashboard:", error);
    return {
      kpis: { faturamentoTotal: 0, ticketMedio: 0, totalVendas: 0, cmvTotal: 0, lucroEstimado: 0 },
      dre: { receitaBruta: 0, cmv: 0, lucroBruto: 0, despesas: 0, lucroLiquido: 0 },
      topProdutos: [],
      faturamentoGrafico: [],
      error: error.message || "Erro interno."
    };
  }
}
