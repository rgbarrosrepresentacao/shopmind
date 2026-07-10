'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { BusinessEngine, AdjustInventoryCommand } from '@/lib/business-engine';
import type {
  EstoqueKPIs,
  EstoqueAlerta,
  Movimentacao,
  MovimentacaoFilter,
  ProdutoGiro,
  ProdutoParado,
  ProdutoValorEstoque,
  AjusteEstoqueInput,
  MovimentacaoChartData,
  GiroClassificacao,
  AlertaTipo,
} from '@/lib/types/estoque';

// ============================================
// HELPER — Get current user's loja_id
// ============================================
async function getUserLojaId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('loja_id')
    .eq('id', user.id)
    .single();
  return data?.loja_id || null;
}

// ============================================
// KPIs DO ESTOQUE
// ============================================
export async function getEstoqueKPIs(): Promise<EstoqueKPIs> {
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, preco_custo, preco_venda, estoque_atual, estoque_minimo, status')
    .is('deleted_at', null)
    .eq('status', 'ativo');

  if (!produtos || produtos.length === 0) {
    return {
      totalProdutos: 0, itensEmEstoque: 0, valorTotalEstoque: 0,
      valorTotalVenda: 0, lucroPotencial: 0, semEstoque: 0,
      estoqueBaixo: 0, produtosParados30d: 0, produtosParados60d: 0,
      produtosParados90d: 0, produtosCriticos: 0, giroAlto: 0,
      giroMedio: 0, giroBaixo: 0, semGiro: 0, reposicaoNecessaria: 0,
    };
  }

  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

  // Get all produto IDs
  const produtoIds = produtos.map(p => p.id);

  // Last movements for each produto
  const { data: ultimasMovs } = await supabase
    .from('movimentacoes_estoque')
    .select('produto_id, created_at')
    .in('produto_id', produtoIds)
    .order('created_at', { ascending: false });

  // Map: produto_id -> last movement date
  const ultimaMovMap = new Map<string, Date>();
  if (ultimasMovs) {
    for (const m of ultimasMovs) {
      if (!ultimaMovMap.has(m.produto_id)) {
        ultimaMovMap.set(m.produto_id, new Date(m.created_at));
      }
    }
  }

  // Vendas nos últimos 90 dias (para calcular giro)
  const { data: vendasRecentes } = await supabase
    .from('venda_itens')
    .select('produto_id, quantidade, vendas!inner(created_at, status)')
    .in('produto_id', produtoIds)
    .gte('vendas.created_at', d90.toISOString())
    .eq('vendas.status', 'concluida');

  // Map: produto_id -> total vendido 30d
  const vendasMap30d = new Map<string, number>();
  if (vendasRecentes) {
    for (const v of vendasRecentes as any[]) {
      const vendaDate = new Date(v.vendas.created_at);
      if (vendaDate >= d30) {
        vendasMap30d.set(v.produto_id, (vendasMap30d.get(v.produto_id) || 0) + Number(v.quantidade));
      }
    }
  }

  let itensEmEstoque = 0, valorTotalEstoque = 0, valorTotalVenda = 0;
  let semEstoque = 0, estoqueBaixo = 0, produtosCriticos = 0, reposicaoNecessaria = 0;
  let produtosParados30d = 0, produtosParados60d = 0, produtosParados90d = 0;
  let giroAlto = 0, giroMedio = 0, giroBaixo = 0, semGiro = 0;

  for (const p of produtos) {
    const estoque = Number(p.estoque_atual);
    const minimo = Number(p.estoque_minimo);
    const custo = Number(p.preco_custo);
    const venda = Number(p.preco_venda);

    if (estoque > 0) {
      itensEmEstoque++;
      valorTotalEstoque += estoque * custo;
      valorTotalVenda += estoque * venda;
    }
    if (estoque <= 0) semEstoque++;
    if (estoque > 0 && minimo > 0 && estoque <= minimo) {
      estoqueBaixo++;
      produtosCriticos++;
    }
    if (minimo > 0 && estoque <= minimo) reposicaoNecessaria++;

    // Parados
    const ultima = ultimaMovMap.get(p.id);
    if (!ultima || ultima < d30) produtosParados30d++;
    if (!ultima || ultima < d60) produtosParados60d++;
    if (!ultima || ultima < d90) produtosParados90d++;

    // Giro baseado em vendas dos últimos 30d vs estoque
    const vendidos30d = vendasMap30d.get(p.id) || 0;
    if (vendidos30d === 0) {
      semGiro++;
    } else if (estoque > 0) {
      const giro = vendidos30d / Math.max(estoque, 1);
      if (giro >= 1) giroAlto++;
      else if (giro >= 0.3) giroMedio++;
      else giroBaixo++;
    } else {
      semGiro++;
    }
  }

  return {
    totalProdutos: produtos.length,
    itensEmEstoque,
    valorTotalEstoque,
    valorTotalVenda,
    lucroPotencial: valorTotalVenda - valorTotalEstoque,
    semEstoque,
    estoqueBaixo,
    produtosParados30d,
    produtosParados60d,
    produtosParados90d,
    produtosCriticos,
    giroAlto,
    giroMedio,
    giroBaixo,
    semGiro,
    reposicaoNecessaria,
  };
}

// ============================================
// ALERTAS INTELIGENTES
// ============================================
export async function getEstoqueAlertas(): Promise<EstoqueAlerta[]> {
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, sku, foto_url, estoque_atual, estoque_minimo, unidade, preco_custo, preco_venda')
    .is('deleted_at', null)
    .eq('status', 'ativo');

  if (!produtos || produtos.length === 0) return [];

  const produtoIds = produtos.map(p => p.id);
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

  // Last movements
  const { data: ultimasMovs } = await supabase
    .from('movimentacoes_estoque')
    .select('produto_id, created_at')
    .in('produto_id', produtoIds)
    .order('created_at', { ascending: false });

  const ultimaMovMap = new Map<string, Date>();
  if (ultimasMovs) {
    for (const m of ultimasMovs) {
      if (!ultimaMovMap.has(m.produto_id)) {
        ultimaMovMap.set(m.produto_id, new Date(m.created_at));
      }
    }
  }

  // Sales last 30 days
  const { data: vendasItens } = await supabase
    .from('venda_itens')
    .select('produto_id, quantidade, vendas!inner(created_at, status)')
    .in('produto_id', produtoIds)
    .gte('vendas.created_at', d30.toISOString())
    .eq('vendas.status', 'concluida');

  const vendasMap = new Map<string, number>();
  if (vendasItens) {
    for (const v of vendasItens as any[]) {
      vendasMap.set(v.produto_id, (vendasMap.get(v.produto_id) || 0) + Number(v.quantidade));
    }
  }

  const alertas: EstoqueAlerta[] = [];

  for (const p of produtos) {
    const estoque = Number(p.estoque_atual);
    const minimo = Number(p.estoque_minimo);
    const vendidos30d = vendasMap.get(p.id) || 0;
    const ultima = ultimaMovMap.get(p.id);

    // Giro diário médio
    const giroDiario = vendidos30d / 30;
    const previsaoDias = giroDiario > 0 ? Math.floor(estoque / giroDiario) : null;

    const base = {
      produtoId: p.id,
      produtoNome: p.nome,
      produtoSku: p.sku,
      produtoFoto: p.foto_url,
      estoqueAtual: estoque,
      estoqueMinimo: minimo,
      unidade: p.unidade,
      quantidadeVendida30d: vendidos30d,
      previsaoDias: previsaoDias ?? undefined,
    };

    // CRÍTICO: sem estoque e com vendas recentes
    if (estoque <= 0) {
      alertas.push({
        ...base,
        tipo: 'critico' as AlertaTipo,
        mensagem: vendidos30d > 0
          ? `Estoque zerado! Vendeu ${vendidos30d} un. nos últimos 30 dias.`
          : `Estoque zerado. Produto sem movimentação.`,
        prioridade: 'alta',
      });
      continue;
    }

    // REPOSIÇÃO: abaixo do mínimo configurado
    if (minimo > 0 && estoque <= minimo) {
      alertas.push({
        ...base,
        tipo: 'proximo_minimo' as AlertaTipo,
        mensagem: previsaoDias !== null
          ? `Estoque crítico: ${estoque} un. Previsão de ruptura em ~${previsaoDias} dias.`
          : `Estoque abaixo do mínimo (${minimo} un.).`,
        prioridade: 'alta',
      });
    }

    // SEM MOVIMENTO: > 30 dias
    if (ultima && ultima < d30 && estoque > 0) {
      const dias = Math.floor((now.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
      if (dias >= 30) {
        alertas.push({
          ...base,
          tipo: 'sem_movimento' as AlertaTipo,
          mensagem: `Produto sem movimentação há ${dias} dias. Estoque: ${estoque} un.`,
          prioridade: dias > 90 ? 'alta' : dias > 60 ? 'media' : 'baixa',
          diasSemMovimento: dias,
        });
      }
    }

    // CAMPEA: alto giro (vendeu > 1x o estoque em 30d)
    if (vendidos30d > 0 && estoque > 0) {
      const giro = vendidos30d / estoque;
      if (giro >= 1.5) {
        alertas.push({
          ...base,
          tipo: 'campea_vendas' as AlertaTipo,
          mensagem: `Produto campeão! Vendeu ${vendidos30d} un. em 30 dias. Considere aumentar o estoque.`,
          prioridade: 'baixa',
        });
      }

      // REPOSIÇÃO em breve
      if (previsaoDias !== null && previsaoDias <= 7 && estoque > 0) {
        alertas.push({
          ...base,
          tipo: 'reposicao' as AlertaTipo,
          mensagem: `Estoque acaba em ~${previsaoDias} dias com o ritmo atual de vendas.`,
          prioridade: previsaoDias <= 3 ? 'alta' : 'media',
        });
      }
    }

    // EXCESSO: muito estoque e poucas vendas
    if (estoque > 0 && vendidos30d === 0 && estoque > 50) {
      alertas.push({
        ...base,
        tipo: 'excesso' as AlertaTipo,
        mensagem: `Excesso de estoque: ${estoque} un. paradas sem venda nos últimos 30 dias.`,
        prioridade: 'baixa',
      });
    }
  }

  // Sort by priority
  const prioOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
  return alertas.sort((a, b) => prioOrder[a.prioridade] - prioOrder[b.prioridade]);
}

// ============================================
// LISTAR MOVIMENTAÇÕES
// ============================================
export async function listMovimentacoes(filters: MovimentacaoFilter = {}) {
  const supabase = await createClient();
  const {
    search, tipo = 'todos', produto_id,
    dateFrom, dateTo, page = 1, perPage = 20,
  } = filters;

  let query = supabase
    .from('movimentacoes_estoque')
    .select(`
      *,
      produto:produtos(id, nome, sku, unidade, foto_url),
      usuario:usuarios(id, nome)
    `, { count: 'exact' });

  if (tipo !== 'todos') query = query.eq('tipo', tipo);
  if (produto_id) query = query.eq('produto_id', produto_id);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);

  query = query.order('created_at', { ascending: false });

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, error, count } = await query;

  if (error) return { data: [], count: 0, error: error.message };

  // Text filter client-side on produto name
  let result = (data as Movimentacao[]) || [];
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    result = result.filter(m =>
      m.produto?.nome?.toLowerCase().includes(term) ||
      m.produto?.sku?.toLowerCase().includes(term) ||
      m.motivo?.toLowerCase().includes(term)
    );
  }

  return { data: result, count: count || 0, error: null };
}

// ============================================
// GRÁFICO DE MOVIMENTAÇÕES (últimos 30 dias)
// ============================================
export async function getMovimentacoesChart(): Promise<MovimentacaoChartData[]> {
  const supabase = await createClient();
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);

  const { data } = await supabase
    .from('movimentacoes_estoque')
    .select('tipo, quantidade, created_at')
    .gte('created_at', d30.toISOString())
    .order('created_at', { ascending: true });

  if (!data) return [];

  // Group by date
  const dateMap = new Map<string, { entradas: number; saidas: number; vendas: number }>();
  for (const m of data) {
    const date = m.created_at.split('T')[0];
    if (!dateMap.has(date)) dateMap.set(date, { entradas: 0, saidas: 0, vendas: 0 });
    const day = dateMap.get(date)!;
    const qty = Number(m.quantidade);
    if (m.tipo === 'entrada' || m.tipo === 'compra') day.entradas += qty;
    else if (m.tipo === 'venda') day.vendas += qty;
    else if (m.tipo === 'saida' || m.tipo === 'perda') day.saidas += qty;
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, vals]) => ({ data, ...vals }));
}

// ============================================
// AJUSTE MANUAL DE ESTOQUE
// ============================================
export async function ajustarEstoque(input: AjusteEstoqueInput): Promise<{ error: string | null }> {
  try {
    const context = await BusinessEngine.getContext();
    const command = new AdjustInventoryCommand({
      produtoId: input.produto_id,
      quantidade: input.quantidade,
      motivo: input.motivo,
      tipo: input.tipo,
    });

    const result = await BusinessEngine.executeCommand(command, context);

    if (!result.success) {
      return { error: result.error || 'Erro ao ajustar estoque no Core Engine.' };
    }

    revalidatePath('/dashboard/estoque');
    revalidatePath('/dashboard/produtos');
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Erro inesperado no servidor.' };
  }
}

// ============================================
// GIRO DE ESTOQUE
// ============================================
export async function getProdutosGiro(): Promise<ProdutoGiro[]> {
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, sku, estoque_atual, estoque_minimo, unidade, created_at')
    .is('deleted_at', null)
    .eq('status', 'ativo');

  if (!produtos || produtos.length === 0) return [];

  const produtoIds = produtos.map(p => p.id);
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

  const { data: vendas } = await supabase
    .from('venda_itens')
    .select('produto_id, quantidade, vendas!inner(created_at, status)')
    .in('produto_id', produtoIds)
    .gte('vendas.created_at', d90.toISOString())
    .eq('vendas.status', 'concluida');

  const vendas30 = new Map<string, number>();
  const vendas60 = new Map<string, number>();
  const vendas90 = new Map<string, number>();

  if (vendas) {
    for (const v of vendas as any[]) {
      const data = new Date(v.vendas.created_at);
      const qty = Number(v.quantidade);
      if (data >= d30) vendas30.set(v.produto_id, (vendas30.get(v.produto_id) || 0) + qty);
      if (data >= d60) vendas60.set(v.produto_id, (vendas60.get(v.produto_id) || 0) + qty);
      vendas90.set(v.produto_id, (vendas90.get(v.produto_id) || 0) + qty);
    }
  }

  return produtos.map(p => {
    const estoque = Number(p.estoque_atual);
    const v30 = vendas30.get(p.id) || 0;
    const v60 = vendas60.get(p.id) || 0;
    const v90 = vendas90.get(p.id) || 0;
    const giroMensal = estoque > 0 ? v30 / Math.max(estoque, 1) : 0;
    const giroDiario = v30 / 30;
    const previsaoRuptura = giroDiario > 0 && estoque > 0 ? Math.floor(estoque / giroDiario) : null;

    let classificacao: GiroClassificacao;
    if (v30 === 0) classificacao = 'sem_giro';
    else if (giroMensal >= 1) classificacao = 'alto';
    else if (giroMensal >= 0.3) classificacao = 'medio';
    else classificacao = 'baixo';

    const diasEmEstoque = Math.floor(
      (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      produtoId: p.id,
      produtoNome: p.nome,
      produtoSku: p.sku,
      estoqueAtual: estoque,
      unidade: p.unidade,
      totalVendido30d: v30,
      totalVendido60d: v60,
      totalVendido90d: v90,
      giroMensal,
      classificacao,
      diasEmEstoque,
      previsaoRuptura,
    };
  }).sort((a, b) => b.totalVendido30d - a.totalVendido30d);
}

// ============================================
// PRODUTOS PARADOS
// ============================================
export async function getProdutosParados(diasMinimos = 30): Promise<ProdutoParado[]> {
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, sku, foto_url, estoque_atual, unidade, preco_custo, categoria:categorias(nome)')
    .is('deleted_at', null)
    .eq('status', 'ativo')
    .gt('estoque_atual', 0);

  if (!produtos || produtos.length === 0) return [];

  const produtoIds = produtos.map(p => p.id);

  const { data: ultimasMovs } = await supabase
    .from('movimentacoes_estoque')
    .select('produto_id, created_at')
    .in('produto_id', produtoIds)
    .order('created_at', { ascending: false });

  const ultimaMovMap = new Map<string, Date>();
  if (ultimasMovs) {
    for (const m of ultimasMovs) {
      if (!ultimaMovMap.has(m.produto_id)) {
        ultimaMovMap.set(m.produto_id, new Date(m.created_at));
      }
    }
  }

  const now = new Date();
  const limiteDate = new Date(now);
  limiteDate.setDate(limiteDate.getDate() - diasMinimos);

  const parados: ProdutoParado[] = [];
  for (const p of produtos as any[]) {
    const ultima = ultimaMovMap.get(p.id);
    if (!ultima || ultima < limiteDate) {
      const dias = ultima
        ? Math.floor((now.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      parados.push({
        produtoId: p.id,
        produtoNome: p.nome,
        produtoSku: p.sku,
        produtoFoto: p.foto_url,
        estoqueAtual: Number(p.estoque_atual),
        valorEstoque: Number(p.estoque_atual) * Number(p.preco_custo),
        unidade: p.unidade,
        ultimaMovimentacao: ultima?.toISOString() || null,
        diasSemMovimento: dias,
        categoria: p.categoria?.nome || null,
      });
    }
  }

  return parados.sort((a, b) => b.diasSemMovimento - a.diasSemMovimento);
}

// ============================================
// VALOR DO ESTOQUE
// ============================================
export async function getValorEstoque(): Promise<ProdutoValorEstoque[]> {
  const supabase = await createClient();

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, sku, foto_url, estoque_atual, unidade, preco_custo, preco_venda, categoria:categorias(nome)')
    .is('deleted_at', null)
    .eq('status', 'ativo')
    .gt('estoque_atual', 0)
    .order('estoque_atual', { ascending: false });

  if (!produtos) return [];

  return (produtos as any[]).map(p => {
    const estoque = Number(p.estoque_atual);
    const custo = Number(p.preco_custo);
    const venda = Number(p.preco_venda);
    const valorCusto = estoque * custo;
    const valorVenda = estoque * venda;
    const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;

    return {
      produtoId: p.id,
      produtoNome: p.nome,
      produtoSku: p.sku,
      produtoFoto: p.foto_url,
      categoria: p.categoria?.nome || null,
      estoqueAtual: estoque,
      unidade: p.unidade,
      precoCusto: custo,
      precoVenda: venda,
      valorCustoTotal: valorCusto,
      valorVendaTotal: valorVenda,
      lucroPotencial: valorVenda - valorCusto,
      margemPercent: margem,
    };
  });
}
