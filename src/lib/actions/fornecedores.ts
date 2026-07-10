"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Fornecedor, FornecedorInsert } from "@/lib/types/compras";
import type {
  FornecedorKPIs,
  FornecedorListItem,
  FornecedorPerfil,
  ProdutoCustoComparacao,
  FornecedorIAInsight,
} from "@/lib/types/fornecedores";

// Helper para buscar perfil do usuário e validar tenant
async function getProfileAndUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");
  
  const { data: profile } = await supabase
    .from("usuarios")
    .select("loja_id, nome, tipo, email")
    .eq("id", user.id)
    .single();
    
  if (!profile) throw new Error("Perfil não encontrado.");
  return { user, profile };
}

// ============================================
// 1. KPIs DO PAINEL DE FORNECEDORES
// ============================================
export async function getFornecedoresKPIs(): Promise<FornecedorKPIs> {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // Buscar fornecedores
    const { data: fornecedores } = await supabase
      .from("fornecedores")
      .select("id, status")
      .eq("loja_id", profile.loja_id);

    const total = fornecedores?.length || 0;
    const ativos = fornecedores?.filter(f => f.status === "ativo").length || 0;
    const inativos = total - ativos;

    // Buscar compras concluídas
    const { data: compras } = await supabase
      .from("compras")
      .select("fornecedor_id, total, data_compra")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida");

    const totalComprado = (compras || []).reduce((acc, c) => acc + Number(c.total), 0);

    // Encontrar fornecedor líder
    const fornecedorGastos: Record<string, number> = {};
    (compras || []).forEach(c => {
      fornecedorGastos[c.fornecedor_id] = (fornecedorGastos[c.fornecedor_id] || 0) + Number(c.total);
    });

    let liderId = null;
    let liderValor = 0;
    Object.entries(fornecedorGastos).forEach(([fid, val]) => {
      if (val > liderValor) {
        liderValor = val;
        liderId = fid;
      }
    });

    let fornecedorLider = null;
    if (liderId) {
      const { data: lider } = await supabase
        .from("fornecedores")
        .select("nome")
        .eq("id", liderId)
        .single();
      fornecedorLider = lider?.nome || null;
    }

    // Última compra geral
    const { data: ultima } = await supabase
      .from("compras")
      .select("data_compra")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida")
      .order("data_compra", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Média de compras por fornecedor (dos que têm compras)
    const distinctSuppliersWithPurchases = Object.keys(fornecedorGastos).length;
    const ticketMedio = distinctSuppliersWithPurchases > 0 ? totalComprado / distinctSuppliersWithPurchases : 0;

    // Fornecedores ativos sem compras nos últimos 60 dias
    const d60 = new Date();
    d60.setDate(d60.getDate() - 60);
    const d60Str = d60.toISOString().split("T")[0];

    const { data: comprasRecentes } = await supabase
      .from("compras")
      .select("fornecedor_id")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida")
      .gte("data_compra", d60Str);

    const ativosComComprasRecentes = new Set((comprasRecentes || []).map(c => c.fornecedor_id));
    
    // Contar quantos fornecedores ATIVOS não têm compras recentes
    const ativosIds = (fornecedores || []).filter(f => f.status === "ativo").map(f => f.id);
    const semComprasRecentes = ativosIds.filter(id => !ativosComComprasRecentes.has(id)).length;

    return {
      total,
      ativos,
      inativos,
      totalComprado,
      fornecedorLider,
      ultimaCompra: ultima?.data_compra || null,
      ticketMedio,
      semComprasRecentes,
    };
  } catch (err) {
    console.error("Erro ao carregar KPIs de fornecedores:", err);
    return {
      total: 0, ativos: 0, inativos: 0, totalComprado: 0,
      fornecedorLider: null, ultimaCompra: null, ticketMedio: 0, semComprasRecentes: 0
    };
  }
}

// ============================================
// 2. LISTAGEM AVANÇADA DE FORNECEDORES
// ============================================
export async function listFornecedoresAvancado(filters: {
  search?: string;
  status?: "todos" | "ativo" | "inativo";
  comprasFilter?: "todos" | "com_compras" | "sem_compras";
  inativosDias?: "todos" | "30" | "60" | "90" | "120";
  sortBy?: "nome" | "valor_comprado" | "qtd_compras" | "ultima_compra";
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
} = {}) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    if (profile.tipo === "caixa") {
      return { data: [], count: 0, error: "Sem permissão de acesso." };
    }

    const {
      search,
      status = "todos",
      comprasFilter = "todos",
      inativosDias = "todos",
      sortBy = "nome",
      sortDir = "desc",
      page = 1,
      perPage = 15,
    } = filters;

    // 1. Fetch todos os fornecedores do tenant
    let query = supabase
      .from("fornecedores")
      .select("*")
      .eq("loja_id", profile.loja_id);

    if (status !== "todos") {
      query = query.eq("status", status);
    }

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`nome.ilike.%${q}%,cnpj.ilike.%${q}%,email.ilike.%${q}%,contato.ilike.%${q}%`);
    }

    const { data: fornecedores, error } = await query;
    if (error) return { data: [], count: 0, error: error.message };

    // 2. Fetch todas as compras concluídas para agregar
    const { data: compras } = await supabase
      .from("compras")
      .select("id, fornecedor_id, total, data_compra")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida");

    // Fetch todos os itens comprados para saber quantidade de produtos
    const { data: itens } = await supabase
      .from("compra_itens")
      .select("compra_id, produto_id")
      .in("compra_id", (compras || []).map(c => c.id));

    // Mapear compras por fornecedor
    const comprasPorFornecedor: Record<string, any[]> = {};
    const produtosPorFornecedor: Record<string, Set<string>> = {};

    (compras || []).forEach(c => {
      if (!comprasPorFornecedor[c.fornecedor_id]) {
        comprasPorFornecedor[c.fornecedor_id] = [];
      }
      comprasPorFornecedor[c.fornecedor_id].push(c);
    });

    (itens || []).forEach(i => {
      const compra = (compras || []).find(c => c.id === i.compra_id);
      if (compra) {
        if (!produtosPorFornecedor[compra.fornecedor_id]) {
          produtosPorFornecedor[compra.fornecedor_id] = new Set();
        }
        produtosPorFornecedor[compra.fornecedor_id].add(i.produto_id);
      }
    });

    // 3. Montar lista agregada
    let list: FornecedorListItem[] = (fornecedores || []).map(f => {
      const fCompras = comprasPorFornecedor[f.id] || [];
      const fProdutos = produtosPorFornecedor[f.id] || new Set();
      
      // Ordenar compras do fornecedor por data desc para pegar a última
      const sortedCompras = [...fCompras].sort(
        (a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime()
      );

      const valorComprado = fCompras.reduce((acc, c) => acc + Number(c.total), 0);

      return {
        ...f,
        qtd_compras: fCompras.length,
        valor_comprado: valorComprado,
        ultima_compra: sortedCompras[0]?.data_compra || null,
        produtos_fornecidos_count: fProdutos.size,
      };
    });

    // 4. Aplicar filtros adicionais na memória
    // Filtro de compras
    if (comprasFilter === "com_compras") {
      list = list.filter(f => f.qtd_compras > 0);
    } else if (comprasFilter === "sem_compras") {
      list = list.filter(f => f.qtd_compras === 0);
    }

    // Filtro de inatividade
    if (inativosDias !== "todos") {
      const dias = parseInt(inativosDias);
      const limite = new Date();
      limite.setDate(limite.getDate() - dias);
      
      list = list.filter(f => {
        if (f.status !== "ativo") return false;
        if (!f.ultima_compra) return true; // sem compras é considerado inativo
        return new Date(f.ultima_compra) < limite;
      });
    }

    // 5. Aplicar ordenação
    list.sort((a, b) => {
      let valA: any = a[sortBy as keyof FornecedorListItem];
      let valB: any = b[sortBy as keyof FornecedorListItem];

      if (sortBy === "nome") {
        valA = a.nome.toLowerCase();
        valB = b.nome.toLowerCase();
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      // Tratamento de nulos
      if (valA === null || valA === undefined) valA = sortBy === "ultima_compra" ? 0 : -1;
      if (valB === null || valB === undefined) valB = sortBy === "ultima_compra" ? 0 : -1;

      if (sortBy === "ultima_compra") {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      return sortDir === "asc" ? valA - valB : valB - valA;
    });

    // 6. Paginação
    const totalCount = list.length;
    const from = (page - 1) * perPage;
    const paginatedList = list.slice(from, from + perPage);

    return { data: paginatedList, count: totalCount, error: null };
  } catch (err: any) {
    console.error("Erro na listagem avançada:", err);
    return { data: [], count: 0, error: err.message };
  }
}

// ============================================
// 3. BUSCAR PERFIL COMPLETO DO FORNECEDOR
// ============================================
export async function getFornecedorPerfilCompleto(id: string): Promise<{ data: FornecedorPerfil | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    if (profile.tipo === "caixa") {
      return { data: null, error: "Sem permissão de acesso." };
    }

    // 1. Buscar dados do fornecedor
    const { data: fornecedor, error: fError } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("id", id)
      .eq("loja_id", profile.loja_id)
      .single();

    if (fError || !fornecedor) {
      return { data: null, error: fError?.message || "Fornecedor não encontrado." };
    }

    // 2. Buscar compras concluídas deste fornecedor
    const { data: compras, error: cError } = await supabase
      .from("compras")
      .select("*, usuario:usuarios(nome)")
      .eq("fornecedor_id", id)
      .eq("status", "concluida")
      .order("data_compra", { ascending: false });

    if (cError) return { data: null, error: cError.message };

    // Buscar quantidade de itens por compra
    const compraIds = (compras || []).map(c => c.id);
    const { data: itensCount } = await supabase
      .from("compra_itens")
      .select("compra_id, quantidade")
      .in("compra_id", compraIds);

    const itensQtdMap: Record<string, number> = {};
    (itensCount || []).forEach(i => {
      itensQtdMap[i.compra_id] = (itensQtdMap[i.compra_id] || 0) + Number(i.quantidade);
    });

    const mappedCompras = (compras || []).map(c => ({
      ...c,
      usuario_nome: (c.usuario as any)?.nome || "Sistema",
      itens_count: Math.round(itensQtdMap[c.id] || 0),
    }));

    // 3. Buscar produtos fornecidos e agregar custos
    const { data: allItens } = await supabase
      .from("compra_itens")
      .select(`
        produto_id, nome_produto, quantidade, preco_unitario, created_at,
        produto:produtos(sku, estoque_atual, preco_venda)
      `)
      .in("compra_id", compraIds)
      .order("created_at", { ascending: false });

    const prodAgg: Record<string, {
      produto_id: string; nome: string; sku: string | null;
      estoque_atual: number; preco_venda: number;
      custos: number[]; ultima_compra: string;
    }> = {};

    (allItens || []).forEach(i => {
      const pid = i.produto_id;
      const custo = Number(i.preco_unitario);
      
      if (!prodAgg[pid]) {
        prodAgg[pid] = {
          produto_id: pid,
          nome: i.nome_produto,
          sku: (i.produto as any)?.sku || null,
          estoque_atual: Number((i.produto as any)?.estoque_atual || 0),
          preco_venda: Number((i.produto as any)?.preco_venda || 0),
          custos: [],
          ultima_compra: i.created_at, // O primeiro item no array (ordenado desc) é a última compra
        };
      }
      prodAgg[pid].custos.push(custo);
    });

    const mappedProdutos = Object.values(prodAgg).map(p => {
      const sum = p.custos.reduce((a, b) => a + b, 0);
      return {
        produto_id: p.produto_id,
        nome: p.nome,
        sku: p.sku,
        estoque_atual: p.estoque_atual,
        preco_venda: p.preco_venda,
        ultimo_custo: p.custos[0] || 0,
        min_custo: Math.min(...p.custos),
        max_custo: Math.max(...p.custos),
        avg_custo: sum / p.custos.length,
        ultima_compra: p.ultima_compra,
      };
    });

    // 4. Calcular métricas, ticket médio, recência, ranking e score
    const valor_total_comprado = mappedCompras.reduce((acc, c) => acc + Number(c.total), 0);
    const qtd_compras = mappedCompras.length;
    const ticket_medio = qtd_compras > 0 ? valor_total_comprado / qtd_compras : 0;

    // Recência (dias desde a última compra)
    let recencia = null;
    if (mappedCompras.length > 0) {
      const ultimaData = new Date(mappedCompras[0].data_compra);
      const hoje = new Date();
      recencia = Math.floor((hoje.getTime() - ultimaData.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Ranking de compras no tenant
    const { data: allComprasTenant } = await supabase
      .from("compras")
      .select("fornecedor_id, total")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida");

    const tGastos: Record<string, number> = {};
    (allComprasTenant || []).forEach(c => {
      tGastos[c.fornecedor_id] = (tGastos[c.fornecedor_id] || 0) + Number(c.total);
    });

    const sortedGastos = Object.entries(tGastos)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    const ranking = sortedGastos.indexOf(id) + 1;

    // Calcular SCORE de Relacionamento (0 a 100)
    // 1. Volume (40%): baseado no volume comprado em relação ao maior fornecedor
    const maiorVolume = sortedGastos.length > 0 ? tGastos[sortedGastos[0]] : 1;
    const ptsVolume = maiorVolume > 0 ? (valor_total_comprado / maiorVolume) * 40 : 0;

    // 2. Frequência (30%): 3 pontos por compra concluída, max 30 pontos
    const ptsFrequencia = Math.min(30, qtd_compras * 3);

    // 3. Recência (20%): compras recentes
    let ptsRecencia = 0;
    if (recencia !== null) {
      if (recencia <= 30) ptsRecencia = 20;
      else if (recencia <= 60) ptsRecencia = 15;
      else if (recencia <= 90) ptsRecencia = 10;
      else if (recencia <= 120) ptsRecencia = 5;
    }

    // 4. Status Ativo (10%)
    const ptsStatus = fornecedor.status === "ativo" ? 10 : 0;

    const score = Math.round(ptsVolume + ptsFrequencia + ptsRecencia + ptsStatus);

    // 5. Buscar logs de auditoria
    const { data: logs } = await supabase
      .from("logs_atividade")
      .select(`
        id, acao, dados_anteriores, dados_novos, created_at,
        usuario:usuarios(nome)
      `)
      .eq("entidade", "fornecedor")
      .eq("entidade_id", id)
      .order("created_at", { ascending: false });

    const mappedLogs = (logs || []).map(l => ({
      id: l.id,
      usuario_nome: (l.usuario as any)?.nome || "Sistema",
      acao: l.acao,
      dados_anteriores: l.dados_anteriores,
      dados_novos: l.dados_novos,
      created_at: l.created_at,
    }));

    const perfil: FornecedorPerfil = {
      fornecedor: fornecedor as Fornecedor,
      valor_total_comprado,
      qtd_compras,
      ticket_medio,
      ranking: ranking > 0 ? ranking : 1,
      score: Math.min(100, Math.max(0, score)),
      recencia,
      compras: mappedCompras,
      produtos: mappedProdutos,
      logs: mappedLogs,
    };

    return { data: perfil, error: null };
  } catch (err: any) {
    console.error("Erro ao buscar perfil completo:", err);
    return { data: null, error: err.message };
  }
}

// ============================================
// 4. COMPARADOR DE CUSTOS DE PRODUTOS
// ============================================
export async function getProdutosComparadorCusto(search?: string): Promise<{ data: ProdutoCustoComparacao[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // Buscar compras concluídas do tenant
    const { data: compras } = await supabase
      .from("compras")
      .select("id, fornecedor_id, status, fornecedor:fornecedores(nome)")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida");

    if (!compras || compras.length === 0) return { data: [], error: null };

    const compraIds = compras.map(c => c.id);

    // Buscar itens destas compras
    const { data: itens } = await supabase
      .from("compra_itens")
      .select(`
        produto_id, nome_produto, quantidade, preco_unitario, created_at, compra_id,
        produto:produtos(sku, estoque_atual, preco_venda)
      `)
      .in("compra_id", compraIds);

    if (!itens || itens.length === 0) return { data: [], error: null };

    // Agrupar por produto, depois por fornecedor
    // prodId -> { produto_id, nome, sku, estoque_atual, preco_venda, fornecedores: { fornecedor_id -> { custos: [], ultima_compra } } }
    const prodMap: Record<string, {
      produto_id: string; nome: string; sku: string | null;
      estoque_atual: number; preco_venda: number;
      fornecedores: Record<string, { custos: number[]; ultima_compra: string }>;
    }> = {};

    itens.forEach(i => {
      const pid = i.produto_id;
      const compra = compras.find(c => c.id === i.compra_id);
      if (!compra) return;
      const fid = compra.fornecedor_id;
      const custo = Number(i.preco_unitario);

      if (!prodMap[pid]) {
        prodMap[pid] = {
          produto_id: pid,
          nome: i.nome_produto,
          sku: (i.produto as any)?.sku || null,
          estoque_atual: Number((i.produto as any)?.estoque_atual || 0),
          preco_venda: Number((i.produto as any)?.preco_venda || 0),
          fornecedores: {},
        };
      }

      if (!prodMap[pid].fornecedores[fid]) {
        prodMap[pid].fornecedores[fid] = { custos: [], ultima_compra: i.created_at };
      }
      prodMap[pid].fornecedores[fid].custos.push(custo);
      // Manter a data mais recente
      if (new Date(i.created_at) > new Date(prodMap[pid].fornecedores[fid].ultima_compra)) {
        prodMap[pid].fornecedores[fid].ultima_compra = i.created_at;
      }
    });

    // Converter para array e filtrar apenas produtos que possuem 2 OU MAIS fornecedores (para haver comparação!)
    let comparacoes: ProdutoCustoComparacao[] = [];

    Object.values(prodMap).forEach(p => {
      const fKeys = Object.keys(p.fornecedores);
      if (fKeys.length < 2) return; // Precisa de pelo menos 2 fornecedores

      const fornecedoresComparacao = fKeys.map(fid => {
        const comp = compras.find(c => c.fornecedor_id === fid);
        const fNome = (comp?.fornecedor as any)?.nome || "Desconhecido";
        const custosList = p.fornecedores[fid].custos;
        // O custo atual é o último pago (primeiro ou baseado na data de compra desc, simplificando com o custo médio ou último)
        const ultimoCusto = custosList[custosList.length - 1]; 

        return {
          fornecedor_id: fid,
          fornecedor_nome: fNome,
          custo: ultimoCusto,
          ultima_compra: p.fornecedores[fid].ultima_compra,
        };
      }).sort((a, b) => a.custo - b.custo); // Ordenados pelo menor custo

      const menor_custo = fornecedoresComparacao[0].custo;
      const maior_custo = fornecedoresComparacao[fornecedoresComparacao.length - 1].custo;
      const diferenca_percentual = menor_custo > 0 ? ((maior_custo - menor_custo) / menor_custo) * 100 : 0;
      
      // Economia potencial = (Maior Custo - Menor Custo) * Estoque Atual (ou se estoque <= 0, simula para 10 unidades)
      const quantidadeSimulada = p.estoque_atual > 0 ? p.estoque_atual : 10;
      const economia_potencial = (maior_custo - menor_custo) * quantidadeSimulada;

      comparacoes.push({
        produto_id: p.produto_id,
        nome: p.nome,
        sku: p.sku,
        estoque_atual: p.estoque_atual,
        preco_venda: p.preco_venda,
        menor_custo,
        maior_custo,
        diferenca_percentual,
        economia_potencial,
        fornecedores: fornecedoresComparacao,
      });
    });

    // Filtrar por busca textual
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      comparacoes = comparacoes.filter(c => 
        c.nome.toLowerCase().includes(term) || 
        (c.sku && c.sku.toLowerCase().includes(term))
      );
    }

    // Ordenar por maior economia potencial desc
    comparacoes.sort((a, b) => b.economia_potencial - a.economia_potencial);

    return { data: comparacoes, error: null };
  } catch (err: any) {
    console.error("Erro no comparador de custos:", err);
    return { data: [], error: err.message };
  }
}

// ============================================
// 5. IA GERENTE — INSIGHTS DE FORNECEDORES
// ============================================
export async function getFornecedoresIAInsights(): Promise<{ data: FornecedorIAInsight[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    const insights: FornecedorIAInsight[] = [];

    // 1. Alertar sobre fornecedores inativos (sem compras há mais de 90 dias)
    const d90 = new Date();
    d90.setDate(d90.getDate() - 90);
    const d90Str = d90.toISOString().split("T")[0];

    // Buscar todos fornecedores ativos
    const { data: fornecedores } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("loja_id", profile.loja_id)
      .eq("status", "ativo");

    // Buscar compras concluídas recentes
    const { data: compras90d } = await supabase
      .from("compras")
      .select("fornecedor_id")
      .eq("loja_id", profile.loja_id)
      .eq("status", "concluida")
      .gte("data_compra", d90Str);

    const ativosComCompras = new Set((compras90d || []).map(c => c.fornecedor_id));
    const inativos90d = (fornecedores || []).filter(f => !ativosComCompras.has(f.id));

    if (inativos90d.length > 0) {
      insights.push({
        id: "fornecedores-inativos-alerta",
        tipo: "alerta",
        titulo: `${inativos90d.length} Fornecedor(es) sem Compras Recentes`,
        descricao: `Identifiquei que fornecedores estratégicos como "${inativos90d[0].nome}" estão há mais de 90 dias sem novos pedidos. Considere reavaliar a parceria ou programar reposição.`,
      });
    }

    // 2. Alertar sobre economia potencial (Comparador de Custos)
    const comparacoesRes = await getProdutosComparadorCusto();
    const comparacoes = comparacoesRes.data || [];
    
    const economiaTotal = comparacoes.reduce((acc, c) => acc + c.economia_potencial, 0);
    if (economiaTotal > 0 && comparacoes.length > 0) {
      const topProduto = comparacoes[0];
      insights.push({
        id: "economia-potencial-compras",
        tipo: "sucesso",
        titulo: `Oportunidade de Economia: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(economiaTotal)}`,
        descricao: `Você pode economizar trocando de fornecedores para ${comparacoes.length} produtos. Comprando "${topProduto.nome}" do fornecedor "${topProduto.fornecedores[0].fornecedor_nome}" (R$ ${topProduto.menor_custo.toFixed(2)}) em vez de "${topProduto.fornecedores[topProduto.fornecedores.length-1].fornecedor_nome}" (R$ ${topProduto.maior_custo.toFixed(2)}), a economia é imediata.`,
        acao: "comparador",
        acaoLabel: "Ver Comparador",
      });
    }

    // 3. Alertar sobre aumento de custos recentes
    // Buscar itens onde o custo unitário subiu em relação ao custo anterior
    const { data: aumentos } = await supabase
      .from("compra_itens")
      .select(`
        nome_produto, preco_unitario, custo_anterior,
        compra:compras(fornecedor:fornecedores(nome))
      `)
      .eq("atualizar_custo", true)
      .not("custo_anterior", "is", null)
      .order("created_at", { ascending: false })
      .limit(3);

    const realAumentos = (aumentos || []).filter(a => Number(a.preco_unitario) > Number(a.custo_anterior));
    if (realAumentos.length > 0) {
      const item = realAumentos[0];
      const diff = Number(item.preco_unitario) - Number(item.custo_anterior);
      const pct = (diff / Number(item.custo_anterior)) * 100;
      const fNome = (item.compra as any)?.fornecedor?.nome || "fornecedor atual";

      insights.push({
        id: "aumento-custo-recente",
        tipo: "perigo",
        titulo: `Aumento de Custo em "${item.nome_produto}"`,
        descricao: `O custo unitário de "${item.nome_produto}" subiu em ${pct.toFixed(1)}% (de R$ ${Number(item.custo_anterior).toFixed(2)} para R$ ${Number(item.preco_unitario).toFixed(2)}) no fornecedor "${fNome}". Recomendo readequar a margem de venda ou buscar concorrentes.`,
      });
    }

    // Insight Padrão de Boas-Vindas se não houver dados suficientes
    if (insights.length === 0) {
      insights.push({
        id: "ia-fornecedores-boasvindas",
        tipo: "info",
        titulo: "IA Gerente — Inteligência de Compras",
        descricao: "Estou pronta para analisar seus preços de custo históricos, variações de tabela e sugerir parcerias mais rentáveis. Registre compras de múltiplos fornecedores para habilitar a análise.",
      });
    }

    return { data: insights, error: null };
  } catch (err: any) {
    console.error("Erro nos insights de fornecedores:", err);
    return { data: [], error: err.message };
  }
}

// ============================================
// 6. CRUD: CADASTRAR FORNECEDOR COMPLETO (com Auditoria)
// ============================================
export async function createFornecedorCompleto(input: FornecedorInsert) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Estoquista, gerente e dono podem criar
    if (!["dono", "gerente", "estoquista"].includes(profile.tipo)) {
      return { data: null, error: "Sem permissão para cadastrar fornecedores." };
    }

    if (!input.nome.trim()) {
      return { data: null, error: "O nome do fornecedor é obrigatório." };
    }

    const { data: fornecedor, error } = await supabase
      .from("fornecedores")
      .insert({
        loja_id: profile.loja_id,
        nome: input.nome.trim(),
        cnpj: input.cnpj?.trim() || null,
        telefone: input.telefone?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
        email: input.email?.trim() || null,
        contato: input.contato?.trim() || null,
        observacao: input.observacao?.trim() || null,
        status: "ativo",
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Registrar log de auditoria
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "criacao",
      entidade: "fornecedor",
      entidade_id: fornecedor.id,
      dados_novos: fornecedor,
    });

    revalidatePath("/dashboard/fornecedores");
    return { data: fornecedor as Fornecedor, error: null };
  } catch (err: any) {
    console.error("Erro ao cadastrar fornecedor:", err);
    return { data: null, error: err.message };
  }
}

// ============================================
// 7. CRUD: EDITAR FORNECEDOR (Auditoria + RBAC de Estoquista)
// ============================================
export async function updateFornecedorCompleto(id: string, input: Partial<Fornecedor>) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // 1. Validar perfil e permissão geral
    if (!["dono", "gerente", "estoquista"].includes(profile.tipo)) {
      return { data: null, error: "Sem permissão para editar fornecedores." };
    }

    // Buscar dados atuais do fornecedor para auditoria e validação de regras
    const { data: current, error: fetchErr } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("id", id)
      .eq("loja_id", profile.loja_id)
      .single();

    if (fetchErr || !current) {
      return { data: null, error: fetchErr?.message || "Fornecedor não encontrado." };
    }

    // 2. Aplicar Restrições Específicas do Estoquista
    const updateData: Record<string, any> = {};

    if (profile.tipo === "estoquista") {
      // Estoquista pode apenas alterar: nome, contato, telefone, whatsapp, email, observacao
      // Ele NÃO pode alterar CNPJ (dado fiscal) ou status (deativação/reativação)
      
      if (input.cnpj !== undefined && input.cnpj !== current.cnpj) {
        return { data: null, error: "Operador Estoquista não tem permissão para alterar dados fiscais críticos (CNPJ)." };
      }
      if (input.status !== undefined && input.status !== current.status) {
        return { data: null, error: "Operador Estoquista não tem permissão para ativar ou desativar fornecedores." };
      }

      // Filtrar apenas dados básicos permitidos
      const allowedKeys = ["nome", "contato", "telefone", "whatsapp", "email", "observacao"];
      allowedKeys.forEach(key => {
        if (input[key as keyof Partial<Fornecedor>] !== undefined) {
          updateData[key] = (input[key as keyof Partial<Fornecedor>] as any)?.trim() || null;
        }
      });

      // Validação básica do nome
      if (updateData.nome !== undefined && !updateData.nome) {
        return { data: null, error: "O nome do fornecedor não pode ser deixado em branco." };
      }
    } else {
      // Dono e Gerente têm acesso total
      const keys = ["nome", "cnpj", "contato", "telefone", "whatsapp", "email", "observacao", "endereco", "status"];
      keys.forEach(key => {
        if (input[key as keyof Partial<Fornecedor>] !== undefined) {
          const val = input[key as keyof Partial<Fornecedor>];
          updateData[key] = typeof val === "string" ? val.trim() : val;
        }
      });

      if (updateData.nome !== undefined && !updateData.nome) {
        return { data: null, error: "O nome do fornecedor é obrigatório." };
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { data: current as Fornecedor, error: null };
    }

    // 3. Atualizar registro
    const { data: updated, error } = await supabase
      .from("fornecedores")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // 4. Gravar log de auditoria da edição
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "edicao",
      entidade: "fornecedor",
      entidade_id: id,
      dados_anteriores: current,
      dados_novos: updated,
    });

    revalidatePath("/dashboard/fornecedores");
    revalidatePath(`/dashboard/fornecedores/${id}`);
    return { data: updated as Fornecedor, error: null };
  } catch (err: any) {
    console.error("Erro ao atualizar fornecedor:", err);
    return { data: null, error: err.message };
  }
}

// ============================================
// 8. CRUD: ATIVAR / DESATIVAR FORNECEDOR (Apenas Dono e Gerente)
// ============================================
export async function toggleFornecedorStatus(id: string, status: "ativo" | "inativo") {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Apenas Dono e Gerente
    if (!["dono", "gerente"].includes(profile.tipo)) {
      return { success: false, error: "Apenas Dono e Gerente podem desativar ou reativar fornecedores." };
    }

    const { data: current, error: fetchErr } = await supabase
      .from("fornecedores")
      .select("status")
      .eq("id", id)
      .eq("loja_id", profile.loja_id)
      .single();

    if (fetchErr || !current) {
      return { success: false, error: "Fornecedor não encontrado." };
    }

    if (current.status === status) {
      return { success: true, error: null };
    }

    const { error } = await supabase
      .from("fornecedores")
      .update({ status })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    // Gravar log de auditoria correspondente
    const acao = status === "ativo" ? "reativacao" : "desativacao";
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: acao,
      entidade: "fornecedor",
      entidade_id: id,
      dados_anteriores: { status: current.status },
      dados_novos: { status },
    });

    revalidatePath("/dashboard/fornecedores");
    revalidatePath(`/dashboard/fornecedores/${id}`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Erro ao alterar status do fornecedor:", err);
    return { success: false, error: err.message };
  }
}

// ============================================
// COMPATIBILIDADE: LISTAR FORNECEDORES ATIVOS
// ============================================
export async function listFornecedores(search?: string) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    let query = supabase
      .from("fornecedores")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .eq("status", "ativo")
      .order("nome", { ascending: true });

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`nome.ilike.%${q}%,cnpj.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error } = await query.limit(50);
    if (error) return { data: [], error: error.message };
    return { data: (data || []) as Fornecedor[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

// ============================================
// COMPATIBILIDADE: CADASTRO RÁPIDO DE FORNECEDOR
// ============================================
export async function createFornecedorRapido(input: FornecedorInsert) {
  return createFornecedorCompleto(input);
}
