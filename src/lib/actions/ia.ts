"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { callOpenAI, generateSafetyUserHash } from "@/lib/ai/openai";
import { getFinanceiroKPIs } from "@/lib/actions/financeiro";
import {
  getEstoqueCorporativoKPIs,
  getSmartTransferSuggestions,
  getEstoqueCorporativoMatrix,
  getSmartForecastingAndSuggestions,
} from "@/lib/actions/transferencias";
import type {
  IACreditos,
  IALog,
  IAPacoteCreditos,
  IACreditosCompra,
  IAStoreContext,
  IAAdminMetrics,
} from "@/lib/types/ia";

// Helper to validate and return active user profile and tienda context
async function getProfileAndUser(allowEstoquista = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");
  
  const { data: profile } = await supabase
    .from("usuarios")
    .select("loja_id, nome, tipo, email")
    .eq("id", user.id)
    .single();
    
  if (!profile) throw new Error("Perfil não encontrado.");
  
  const allowedRoles = allowEstoquista ? ["dono", "gerente", "estoquista"] : ["dono", "gerente"];
  if (!allowedRoles.includes(profile.tipo)) {
    throw new Error("Acesso negado. Permissões insuficientes para esta operação.");
  }
  
  return { user, profile };
}

// ============================================
// 1. CRÉDITOS E CONSUMO (BUSCA E RENOVAÇÃO AUTOMÁTICA)
// ============================================
export async function getStoreIACreditos(): Promise<{ data: IACreditos | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser(true); // Estoquista can view credits usage card
    const lojaId = profile.loja_id;

    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();

    // Buscar créditos do mês corrente
    const { data, error } = await supabase
      .from("ia_creditos")
      .select("*")
      .eq("loja_id", lojaId)
      .eq("mes", mes)
      .eq("ano", ano)
      .maybeSingle();

    if (error) return { data: null, error: error.message };

    if (data) {
      return { data: data as IACreditos, error: null };
    }

    // Se não existir registro para o mês corrente, criar automaticamente com 50 consultas gratuitas
    const renovaData = new Date(ano, mes, 0); // Último dia do mês atual
    const renovaEmStr = renovaData.toISOString().split("T")[0];

    const newCredits = {
      loja_id: lojaId,
      mes,
      ano,
      consultas_incluidas: 50,
      consultas_utilizadas: 0,
      consultas_extras: 0,
      limite_diario: 15,
      renova_em: renovaEmStr,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("ia_creditos")
      .insert(newCredits)
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao criar créditos automáticos:", insertError);
      return { data: null, error: insertError.message };
    }

    // Registrar log de atividade
    await supabase.from("logs_atividade").insert({
      loja_id: lojaId,
      acao: "criar",
      entidade: "ia_creditos",
      entidade_id: inserted.id,
      dados_novos: inserted,
    });

    return { data: inserted as IACreditos, error: null };
  } catch (err: any) {
    console.error("Erro ao carregar créditos de IA:", err);
    return { data: null, error: err.message };
  }
}

// ============================================
// 2. CONTEXTO SEGURO DA LOJA (GATHERERS)
// ============================================

async function getSalesSummary(supabase: any, lojaId: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString();

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  seteDiasAtras.setHours(0, 0, 0, 0);
  const seteDiasAtrasStr = seteDiasAtras.toISOString();

  // Vendas de hoje
  const { data: hojeVendas } = await supabase
    .from("vendas")
    .select("total")
    .eq("loja_id", lojaId)
    .eq("status", "concluida")
    .gte("created_at", hojeStr);

  // Vendas dos últimos 7 dias
  const { data: semanaVendas } = await supabase
    .from("vendas")
    .select("total")
    .eq("loja_id", lojaId)
    .eq("status", "concluida")
    .gte("created_at", seteDiasAtrasStr);

  const faturamentoHoje = (hojeVendas || []).reduce((acc: number, v: any) => acc + Number(v.total), 0);
  const qtdVendasHoje = (hojeVendas || []).length;
  const faturamentoSemana = (semanaVendas || []).reduce((acc: number, v: any) => acc + Number(v.total), 0);
  const qtdSemana = (semanaVendas || []).length;
  const ticketMedioSemana = qtdSemana > 0 ? faturamentoSemana / qtdSemana : 0;

  // Produto mais vendido (ranking de itens)
  const { data: rankingItens } = await supabase
    .from("venda_itens")
    .select("produto_nome, quantidade")
    .eq("loja_id", lojaId);

  const itemCounts: Record<string, number> = {};
  (rankingItens || []).forEach((item: any) => {
    itemCounts[item.produto_nome] = (itemCounts[item.produto_nome] || 0) + Number(item.quantidade);
  });

  let produtoMaisVendido = "Nenhuma venda registrada";
  let maxQtd = 0;
  Object.entries(itemCounts).forEach(([name, count]) => {
    if (count > maxQtd) {
      maxQtd = count;
      produtoMaisVendido = name;
    }
  });

  return {
    faturamentoHoje,
    qtdVendasHoje,
    faturamentoSemana,
    ticketMedioSemana,
    produtoMaisVendido,
  };
}

async function getStockSummary(supabase: any, lojaId: string) {
  const { data: list } = await supabase
    .from("produtos")
    .select("nome, estoque, estoque_minimo")
    .eq("loja_id", lojaId)
    .eq("ativo", true);

  const produtos = list || [];
  const totalItens = produtos.length;
  const itensSemEstoque = produtos.filter((p: any) => Number(p.estoque) <= 0).length;
  const itensEstoqueBaixo = produtos.filter((p: any) => Number(p.estoque) < Number(p.estoque_minimo)).length;

  const itensEstoqueCriticoLista = produtos
    .filter((p: any) => Number(p.estoque) < Number(p.estoque_minimo))
    .slice(0, 5)
    .map((p: any) => ({
      nome: p.nome,
      estoque: Number(p.estoque),
      minimo: Number(p.estoque_minimo),
    }));

  return {
    totalItens,
    itensSemEstoque,
    itensEstoqueBaixo,
    itensEstoqueCriticoLista,
  };
}

async function getCustomerSummary(supabase: any, lojaId: string) {
  // Obter todos os clientes (filtrados por RLS de grupo)
  const { data: groupClientes } = await supabase
    .from("clientes")
    .select("id, loja_id")
    .is("deleted_at", null);

  // Buscar estatísticas específicas desta loja
  const { data: statsData } = await supabase
    .from("cliente_loja_stats")
    .select("cliente_id")
    .eq("loja_id", lojaId);

  const statsSet = new Set(statsData?.map((s: any) => s.cliente_id) || []);

  let activeStoreClientCount = 0;
  if (groupClientes) {
    for (const c of groupClientes) {
      if (statsSet.has(c.id) || c.loja_id === lojaId) {
        activeStoreClientCount++;
      }
    }
  }

  // Inadimplentes (receitas vencidas)
  const hojeStr = new Date().toISOString().split("T")[0];
  const { data: contasAtrasadas } = await supabase
    .from("financeiro")
    .select("valor, cliente_id")
    .eq("loja_id", lojaId)
    .eq("tipo", "receita")
    .eq("status", "pendente")
    .lt("data_vencimento", hojeStr);

  const listAtrasadas = contasAtrasadas || [];
  const uniqueInadimplentes = new Set(listAtrasadas.map((c: any) => c.cliente_id).filter(Boolean));
  const valorTotalAtraso = listAtrasadas.reduce((acc: number, c: any) => acc + Number(c.valor), 0);

  return {
    totalClientes: activeStoreClientCount,
    clientesComAtrasos: uniqueInadimplentes.size,
    valorTotalAtraso,
  };
}

async function getFinanceSummary(lojaId: string) {
  // Chamamos os KPIs financeiros reais calculados em tempo real na Server Action da Fase 11
  const kpis = await getFinanceiroKPIs();
  return {
    saldoConsolidado: kpis.saldoConsolidado,
    receitasMes: kpis.receitasMes,
    despesasMes: kpis.despesasMes,
    aReceberPendente: kpis.contasReceberPendente,
    aPagarPendente: kpis.contasPagarPendente,
    saudeFinanceiraScore: kpis.saudeFinanceiraScore,
  };
}

async function getSupplierSummary(supabase: any, lojaId: string) {
  const { data: suppliers } = await supabase
    .from("fornecedores")
    .select("id")
    .eq("loja_id", lojaId);

  const { data: compras } = await supabase
    .from("compras")
    .select("total, fornecedor:fornecedores(nome)")
    .eq("loja_id", lojaId)
    .eq("status", "concluida");

  const supplierPurchases: Record<string, number> = {};
  (compras || []).forEach((c: any) => {
    const fNome = c.fornecedor?.nome || "Desconhecido";
    supplierPurchases[fNome] = (supplierPurchases[fNome] || 0) + Number(c.total);
  });

  let fornecedorLider = "Nenhum fornecedor registrado";
  let maxGasto = 0;
  Object.entries(supplierPurchases).forEach(([f, val]) => {
    if (val > maxGasto) {
      maxGasto = val;
      fornecedorLider = f;
    }
  });

  return {
    totalFornecedores: (suppliers || []).length,
    fornecedorLider,
    gastoFornecedorLider: maxGasto,
  };
}

async function getCashierSummary(supabase: any, lojaId: string) {
  const { data: activeCaixas } = await supabase
    .from("caixas")
    .select("valor_abertura, valor_fechamento, status")
    .eq("loja_id", lojaId);

  const openCaixas = (activeCaixas || []).filter((c: any) => c.status === "aberto");
  const saldoCaixaFisico = openCaixas.reduce((acc: number, c: any) => acc + Number(c.valor_abertura), 0);

  return {
    caixasAbertos: openCaixas.length,
    saldoCaixaFisico,
    diferencaCaixaRecente: 0, // Placeholder operacional
  };
}

async function getProductSummary(supabase: any, lojaId: string) {
  const { data: list } = await supabase
    .from("produtos")
    .select("nome, categoria, preco_custo, preco_venda")
    .eq("loja_id", lojaId)
    .eq("ativo", true);

  const produtos = list || [];
  
  // Categorias mais populares
  const categories: Record<string, number> = {};
  produtos.forEach((p: any) => {
    if (p.categoria) categories[p.categoria] = (categories[p.categoria] || 0) + 1;
  });

  let categoriaMaisPopular = "Nenhuma categoria cadastrada";
  let maxCat = 0;
  Object.entries(categories).forEach(([cat, val]) => {
    if (val > maxCat) {
      maxCat = val;
      categoriaMaisPopular = cat;
    }
  });

  // Produtos com maior margem de lucro percentual
  const margemList = produtos
    .map((p: any) => {
      const custo = Number(p.preco_custo);
      const venda = Number(p.preco_venda);
      const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
      return { nome: p.nome, margem };
    })
    .sort((a: any, b: any) => b.margem - a.margem)
    .slice(0, 5);

  return {
    totalProdutosCatalogados: produtos.length,
    categoriaMaisPopular,
    produtosMaiorMargem: margemList,
  };
}

async function getLoyaltySummary(supabase: any, lojaId: string) {
  // 1. Config do programa
  const { data: config } = await supabase
    .from("configuracoes_loja")
    .select("fidelidade_ativo")
    .eq("loja_id", lojaId)
    .maybeSingle();
  const fidelidadeAtivo = !!config?.fidelidade_ativo;

  // 2. Campanhas ativas
  const hojeStr = new Date().toISOString().split("T")[0];
  const { count: totalCampanhasAtivas } = await supabase
    .from("campanhas_fidelidade")
    .select("id", { count: "exact", head: true })
    .eq("loja_id", lojaId)
    .eq("status", "ativo")
    .lte("inicio", hojeStr)
    .gte("fim", hojeStr);

  // 3. Pontos acumulados/resgatados
  const { data: pontosSum } = await supabase
    .from("cliente_pontos")
    .select("total_pontos_acumulados, total_pontos_resgatados")
    .eq("loja_id", lojaId);

  const totalPontosAcumulados = pontosSum ? pontosSum.reduce((acc: number, p: any) => acc + (p.total_pontos_acumulados || 0), 0) : 0;
  const totalPontosResgatados = pontosSum ? pontosSum.reduce((acc: number, p: any) => acc + (p.total_pontos_resgatados || 0), 0) : 0;

  // 4. Cashback gerado/utilizado/saldo
  const { data: cashbackSum } = await supabase
    .from("cliente_cashback")
    .select("total_gerado, total_utilizado, saldo_cashback")
    .eq("loja_id", lojaId);

  const totalCashbackGerado = cashbackSum ? cashbackSum.reduce((acc: number, c: any) => acc + Number(c.total_gerado || 0), 0) : 0;
  const totalCashbackUtilizado = cashbackSum ? cashbackSum.reduce((acc: number, c: any) => acc + Number(c.total_utilizado || 0), 0) : 0;
  const saldoCashbackDisponivel = cashbackSum ? cashbackSum.reduce((acc: number, c: any) => acc + Number(c.saldo_cashback || 0), 0) : 0;

  // 5. Contagem VIP (Lida de cliente_loja_stats)
  const { data: clientesVip } = await supabase
    .from("cliente_loja_stats")
    .select("nivel_vip")
    .eq("loja_id", lojaId);

  const clientesPorNivelVip = { Bronze: 0, Prata: 0, Ouro: 0, Diamante: 0, VIP: 0 };
  if (clientesVip) {
    clientesVip.forEach((c: any) => {
      const nivel = (c.nivel_vip || "Bronze") as keyof typeof clientesPorNivelVip;
      if (clientesPorNivelVip[nivel] !== undefined) {
        clientesPorNivelVip[nivel]++;
      } else {
        clientesPorNivelVip["Bronze"]++;
      }
    });
  }

  // 6. Inativos (Lidos de cliente_loja_stats baseado em ultima_compra da filial)
  const hoje = new Date();
  const d30 = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const d60 = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const d90 = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const d120 = new Date(hoje.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();

  const { data: inativosData } = await supabase
    .from("cliente_loja_stats")
    .select("ultima_compra")
    .eq("loja_id", lojaId);

  let clientesInativos30d = 0;
  let clientesInativos60d = 0;
  let clientesInativos90d = 0;
  let clientesInativos120d = 0;

  if (inativosData) {
    inativosData.forEach((c: any) => {
      if (!c.ultima_compra) return;
      const ult = c.ultima_compra;
      if (ult < d120) {
        clientesInativos120d++;
        clientesInativos90d++;
        clientesInativos60d++;
        clientesInativos30d++;
      } else if (ult < d90) {
        clientesInativos90d++;
        clientesInativos60d++;
        clientesInativos30d++;
      } else if (ult < d60) {
        clientesInativos60d++;
        clientesInativos30d++;
      } else if (ult < d30) {
        clientesInativos30d++;
      }
    });
  }

  return {
    fidelidadeAtivo,
    totalCampanhasAtivas: totalCampanhasAtivas || 0,
    totalPontosAcumulados,
    totalPontosResgatados,
    totalCashbackGerado: Number(totalCashbackGerado.toFixed(2)),
    totalCashbackUtilizado: Number(totalCashbackUtilizado.toFixed(2)),
    saldoCashbackDisponivel: Number(saldoCashbackDisponivel.toFixed(2)),
    clientesPorNivelVip,
    clientesInativos30d,
    clientesInativos60d,
    clientesInativos90d,
    clientesInativos120d,
  };
}

async function getFiscalSummary(supabase: any, lojaId: string) {
  // 1. Obter contagem de documentos e valores
  const { data: docs } = await supabase
    .from("documentos_fiscais")
    .select("tipo_documento, status, valor_total, usuario:usuarios(nome)")
    .eq("loja_id", lojaId);

  const docList = docs || [];

  const totalEmitidos = docList.filter((d: any) => d.status !== "cancelado").length;
  const totalCancelados = docList.filter((d: any) => d.status === "cancelado").length;
  const faturamentoComercial = docList
    .filter((d: any) => d.status !== "cancelado")
    .reduce((acc: number, d: any) => acc + Number(d.valor_total), 0);

  const ativosOrcamentos = docList.filter((d: any) => d.tipo_documento === "orcamento" && d.status !== "cancelado").length;
  const ativosPedidos = docList.filter((d: any) => d.tipo_documento === "pedido" && d.status !== "cancelado").length;

  // 2. Obter contagem de reimpressões no histórico
  const { count: totalReimpresso } = await supabase
    .from("historico_documentos")
    .select("id", { count: "exact", head: true })
    .eq("loja_id", lojaId)
    .eq("acao", "reimpressao");

  // 3. Agrupar operadores por volume de emissão
  const operatorCounts: Record<string, number> = {};
  docList.forEach((d: any) => {
    if (d.status !== "cancelado") {
      const opName = d.usuario?.nome || "Operador";
      operatorCounts[opName] = (operatorCounts[opName] || 0) + 1;
    }
  });

  const topOperadores = Object.entries(operatorCounts)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    totalEmitidos,
    totalCancelados,
    faturamentoComercial: Number(faturamentoComercial.toFixed(2)),
    ativosOrcamentos,
    ativosPedidos,
    reimpressoes: totalReimpresso || 0,
    topOperadores,
  };
}

// Compilar dossiê estruturado da loja
async function buildStoreContext(supabase: any, lojaId: string, tipo: string): Promise<IAStoreContext> {
  const { data: loja } = await supabase.from("lojas").select("nome_loja").eq("id", lojaId).single();
  const nomeLoja = loja?.nome_loja || "Minha Loja ShopMind";

  const context: IAStoreContext = { nomeLoja };

  // Otimização de context: Buscamos apenas os resumos envolvidos no escopo da pergunta
  if (tipo === "geral" || tipo === "pdv" || tipo === "produtos") {
    context.sales = await getSalesSummary(supabase, lojaId);
    context.product = await getProductSummary(supabase, lojaId);
  }
  if (tipo === "geral" || tipo === "estoque" || tipo === "compras") {
    context.stock = await getStockSummary(supabase, lojaId);
    context.product = await getProductSummary(supabase, lojaId);
  }
  if (tipo === "geral" || tipo === "clientes" || tipo === "inadimplencia") {
    context.customer = await getCustomerSummary(supabase, lojaId);
  }
  if (tipo === "geral" || tipo === "financeiro" || tipo === "relatorios") {
    context.finance = await getFinanceSummary(lojaId);
  }
  if (tipo === "geral" || tipo === "fornecedores" || tipo === "compras") {
    context.supplier = await getSupplierSummary(supabase, lojaId);
  }
  if (tipo === "geral" || tipo === "caixa" || tipo === "pdv") {
    context.cashier = await getCashierSummary(supabase, lojaId);
  }
  if (tipo === "geral" || tipo === "clientes" || tipo === "fidelidade") {
    context.loyalty = await getLoyaltySummary(supabase, lojaId);
  }
  if (tipo === "geral" || tipo === "fiscal" || tipo === "documentos") {
    context.fiscal = await getFiscalSummary(supabase, lojaId);
  }

  if (tipo === "geral" || tipo === "estoque" || tipo === "transferencia") {
    try {
      const kpisCorp = await getEstoqueCorporativoKPIs();
      const suggestions = await getSmartTransferSuggestions();
      const matrix = await getEstoqueCorporativoMatrix();
      
      const formattedMatrix = (matrix.rows || []).map(r => {
        const lojasDet: Record<string, any> = {};
        Object.entries(r.estoquesPorLoja).forEach(([lId, e]) => {
          const lojaNome = matrix.lojasList.find(l => l.id === lId)?.nome_loja || lId;
          lojasDet[lojaNome] = {
            estoque: e.estoque_atual,
            reservado: e.estoque_reservado,
            minimo: e.estoque_minimo,
            status: e.status_estoque
          };
        });
        return {
          produto: r.produtoNome,
          sku: r.produtoSku,
          totalGrupo: r.estoqueTotalGrupo,
          valorGrupo: r.valorTotalGrupo,
          porFilial: lojasDet
        };
      }).slice(0, 35); // Limitar para evitar sobrecarga de tokens

      context.corporateStock = {
        kpis: kpisCorp,
        suggestions: suggestions.map(s => ({
          produto: s.produtoNome,
          origem: s.lojaOrigemNome,
          destino: s.lojaDestinoNome,
          quantidadeSugerida: s.quantidadeSugerida,
          razao: s.razao
        })),
        matrixSummary: formattedMatrix
      };

      const forecast = await getSmartForecastingAndSuggestions();
      if (!forecast.error) {
        context.predictiveStock = {
          previsoes: (forecast.previsoes || []).slice(0, 20),
          sugestoes: (forecast.sugestoes || []).slice(0, 20),
          sugestoesCompra: (forecast.sugestoesCompra || []).slice(0, 20)
        };
      }
    } catch (err) {
      console.error("Erro ao incluir dados de estoque corporativo no contexto da IA:", err);
    }
  }

  return context;
}

// ============================================
// 3. CORE: ENGINE DE PERGUNTAS COM CONTROLE E CACHE
// ============================================
export async function askIAGerente(
  pergunta: string,
  tipo: string = "geral"
): Promise<{ success: boolean; content?: string; isCached?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser(); // Blocks Caixa and Estoquistas from full LLM chat
    const lojaId = profile.loja_id;

    if (!pergunta || pergunta.trim() === "") {
      return { success: false, error: "A pergunta não pode estar vazia." };
    }

    const trimmedPergunta = pergunta.trim();

    // --------------------------------------------------------
    // REQUISITO 1: CACHE DE PERGUNTAS REPETIDAS (ÚLTIMAS 12 HORAS)
    // --------------------------------------------------------
    const dozeHorasAtras = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: cachedLog } = await supabase
      .from("ia_logs")
      .select("*")
      .eq("loja_id", lojaId)
      .eq("status", "concluida")
      .ilike("pergunta", trimmedPergunta)
      .gt("created_at", dozeHorasAtras)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedLog) {
      // Registrar entrada de log cached (grátis!)
      const cachedRecord = {
        loja_id: lojaId,
        usuario_id: user.id,
        tipo,
        pergunta: trimmedPergunta,
        resposta: cachedLog.resposta,
        modelo: cachedLog.modelo,
        tokens_entrada: 0,
        tokens_saida: 0,
        tokens_total: 0,
        custo_estimado: 0,
        is_cached: true,
        status: "concluida",
      };

      await supabase.from("ia_logs").insert(cachedRecord);
      await supabase.from("logs_atividade").insert({
        loja_id: lojaId,
        usuario_id: user.id,
        acao: "consulta_ia_realizada",
        entidade: "ia_logs",
        dados_novos: { ...cachedRecord, msg: "Resposta recuperada do cache local." },
      });

      return {
        success: true,
        content: cachedLog.resposta,
        isCached: true,
      };
    }

    // --------------------------------------------------------
    // REQUISITO 2: CONTROLE E LIMITE MENSAL E DIÁRIO DE CRÉDITOS
    // --------------------------------------------------------
    // A. Limite Mensal
    const creditosRes = await getStoreIACreditos();
    if (creditosRes.error || !creditosRes.data) {
      return { success: false, error: creditosRes.error || "Erro ao consultar créditos da loja." };
    }

    const creditos = creditosRes.data;
    const limiteTotal = creditos.consultas_incluidas + creditos.consultas_extras;
    const saldoDisponivel = limiteTotal - creditos.consultas_utilizadas;

    if (saldoDisponivel <= 0) {
      // Gravar log de limite atingido
      await supabase.from("ia_logs").insert({
        loja_id: lojaId,
        usuario_id: user.id,
        tipo,
        pergunta: trimmedPergunta,
        resposta: "Limite de consultas mensais de IA esgotado.",
        status: "bloqueada",
      });
      await supabase.from("logs_atividade").insert({
        loja_id: lojaId,
        usuario_id: user.id,
        acao: "limite_ia_atingido",
        entidade: "ia_creditos",
        entidade_id: creditos.id,
      });

      return {
        success: false,
        error: "Você atingiu o limite mensal de 50 consultas de IA da sua loja. Compre créditos adicionais para reativar as análises.",
      };
    }

    // B. Limite Diário
    const startOfToday = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
    const { count: dailyQueriesCount } = await supabase
      .from("ia_logs")
      .select("*", { count: "exact", head: true })
      .eq("loja_id", lojaId)
      .eq("status", "concluida")
      .eq("is_cached", false)
       const queriesToday = dailyQueriesCount || 0;
    if (queriesToday >= creditos.limite_diario) {
      // Gravar log de limite diário atingido
      await supabase.from("ia_logs").insert({
        loja_id: lojaId,
        usuario_id: user.id,
        tipo,
        pergunta: trimmedPergunta,
        resposta: "Limite de consultas diárias de IA atingido.",
        status: "bloqueada",
      });
      await supabase.from("logs_atividade").insert({
        loja_id: lojaId,
        usuario_id: user.id,
        acao: "credito_ia_bloqueado",
        entidade: "ia_creditos",
        entidade_id: creditos.id,
        dados_novos: { motivo: "Limite diário excedido", limite: creditos.limite_diario },
      });

      return {
        success: false,
        error: `A sua loja atingiu o limite diário de ${creditos.limite_diario} consultas ativas hoje. O limite diário reinicia à meia-noite.`,
      };
    }

    // --------------------------------------------------------
    // 3. CONSTRUÇÃO DO PROMPT E CONTEXTO SEGURO
    // --------------------------------------------------------
    const context = await buildStoreContext(supabase, lojaId, tipo);
    const safetyHash = generateSafetyUserHash(lojaId, user.id);

    // Fetch group details for the active store
    const { data: storeInfo } = await supabase
      .from("lojas")
      .select("nome_loja, tipo_unidade, grupo_id")
      .eq("id", lojaId)
      .single();
    
    let groupName = "Grupo Empresarial";
    if (storeInfo && storeInfo.grupo_id) {
      const { data: grupoData } = await supabase
        .from("grupos_empresariais")
        .select("nome")
        .eq("id", storeInfo.grupo_id)
        .single();
      if (grupoData) {
        groupName = grupoData.nome;
      }
    }
    const storeName = storeInfo?.nome_loja || "Minha Loja";
    const storeType = storeInfo?.tipo_unidade === "matriz" ? "Matriz Principal" : "Filial";

    const systemPrompt = `Você é a IA Gerente do ShopMind, o cérebro inteligente de um ERP para pequenos e médios lojistas.
Você está atualmente operando sob a seguinte árvore de contexto corporativo em tempo real:
- **Grupo Empresarial (Holding)**: ${groupName}
- **Loja Ativa Conectada**: ${storeName} (Tipo: ${storeType})
- **Usuário Conectado**: ${profile.nome} (E-mail: ${profile.email})
- **Cargo/Função do Usuário**: ${profile.tipo}

Seu tom de resposta deve ser profissional, direto, claro, consultivo e focado em dar conselhos práticos e simples para o pequeno comerciante entender.

Abaixo estão os dados consolidados e reais da loja no momento:
${JSON.stringify(context, null, 2)}

Regras cruciais:
1. Responda estritamente com base nos dados reais contidos no JSON acima. Nunca invente ou fabrique números de faturamento, estoque, clientes, fidelidade ou estatísticas fiscais que não estejam presentes no contexto.
2. A IA agora possui uma visão corporativa completa de todas as filiais do grupo. Quando o usuário fizer perguntas sobre estoque corporativo, filiais que precisam de reposição urgente, filiais com excesso de estoque, transferências sugeridas, estoques parados ou concentrados, ou trânsito de mercadorias, você deve utilizar os dados fornecidos no campo 'corporateStock' (KPIs, sugestões inteligentes e matriz de estoques). Responda com base exclusivamente em dados reais destas filiais, detalhando os nomes reais das filiais envolvidas, valores em trânsito, riscos de ruptura, estoques parados ou concentrados e o tempo médio de transferência. Nunca utilize dados simulados. Se o usuário perguntar sobre outras filiais de forma operacional e não houver dados de 'corporateStock', oriente-o a acessar o painel de Estoque Corporativo.
3. Se o usuário fizer uma pergunta e não houver dados no JSON para respondê-la, diga claramente de forma simpática que não há movimentações recentes ou que o lojista precisa registrar mais dados no módulo correspondente.
4. Aponte oportunidades de crescimento, comente riscos (ex: produtos perto do estoque crítico, clientes inadimplentes, clientes VIP inativos, saldo de cashback acumulado parado sem uso, alto índice de cancelamentos de documentos comerciais) e sugira planos de ação realistas e práticos.
5. Treinamento em Fidelidade & Cashback:
   - Se o lojista perguntar sobre clientes inativos, use a estatística de "loyalty" (clientesInativos30d, 60d, 90d, 120d) para dar números reais e aconselhar campanhas específicas (ex: cupom para os de 60 dias, e-mail/WhatsApp personalizado para recuperar os de 90 dias).
   - Se perguntar sobre clientes VIP, use "clientesPorNivelVip" para reportar quantos estão em cada nível (Bronze, Prata, Ouro, Diamante, VIP) e como estimulá-los com campanhas exclusivas.
   - O saldo VIP é baseado no gasto móvel dos últimos 365 dias do cliente na filial. As validades são de 1 ano.
   - Analise se o programa de fidelidade está ativo ("fidelidadeAtivo"). Se inativo, sugira fortemente que o ative para aumentar a retenção em até 30%.
   - Analise os pontos emitidos/resgatados e cashback gerado/utilizado para demonstrar o engajamento geral do público com a loja.
6. Treinamento em Módulo Fiscal Interno & Documentos:
   - Se o lojista perguntar sobre faturamento comercial ou volume de documentos, use os dados de "fiscal" (totalEmitidos, totalCancelados, faturamentoComercial, ativosOrcamentos, ativosPedidos, reimpressoes, topOperadores) para reportar o desempenho real do PDV.
   - Se houver muitos cancelamentos (ex: acima de 5% das emissões) ou muitas reimpressões, alerte sobre potenciais furos de caixa ou gargalos operacionais e aconselhe treinamento de operadores ou auditoria.
   - Se houver muitos Orçamentos ou Pedidos pendentes e ativos, sugira ações para convertê-los em vendas finalizadas (ex: ligar para clientes de orçamentos ativos para fechar a venda).
   - Indique quais são os operadores líderes em emissão (topOperadores) e elogie sua produtividade.
7. IA Preditiva de Ruptura & Inteligência Logística:
    - Você tem acesso ao campo 'predictiveStock' que contém previsões de ruptura de estoque para os próximos 10 dias (com base na taxa real de giro/vendas diárias dos últimos 30 dias), sugestões de remanejamento/transferência entre filiais saudáveis (evitando quebras de estoque locais e otimizando custos logísticos de frete) e sugestões de Pedidos de Compra pré-preenchidos para itens sem doadoras viáveis no grupo.
   - Quando o usuário perguntar sobre reposição, falta de produtos, previsões de quebra de estoque, sugestão de compra ou logística corporativa, utilize estes dados para fornecer relatórios analíticos precisos.
   - Explique detalhadamente a lógica do cálculo de giro e estoque restante em dias. Destaque a economia gerada pelas transferências sugeridas (economia logístico-operacional) em comparação com novas compras externas.
8. Responda em português do Brasil e estruture sua resposta de forma limpa usando marcadores de tópicos (bullet points) e termos destacados em negrito. Evite blocos gigantescos de texto para facilitar a leitura no celular ou tablet.`;

    // --------------------------------------------------------
    // 4. CHAMADA AO CLIENTE REST DA OPENAI (APENAS SERVER-SIDE)
    // --------------------------------------------------------
    const resOpenAI = await callOpenAI({
      systemPrompt,
      userMessage: trimmedPergunta,
      safetyUserHash: safetyHash,
    });

    if (resOpenAI.error) {
      // Registrar falha no log
      await supabase.from("ia_logs").insert({
        loja_id: lojaId,
        usuario_id: user.id,
        tipo,
        pergunta: trimmedPergunta,
        resposta: `Falha na API: ${resOpenAI.error}`,
        status: "falhou",
      });
      return { success: false, error: resOpenAI.error };
    }

    // --------------------------------------------------------
    // 5. REGISTRAR GRAVAÇÃO DE CONSUMO E AUDITORIA
    // --------------------------------------------------------
    // Gravar log de sucesso
    const logData = {
      loja_id: lojaId,
      usuario_id: user.id,
      tipo,
      pergunta: trimmedPergunta,
      resposta: resOpenAI.content,
      modelo: resOpenAI.modelo,
      tokens_entrada: resOpenAI.tokensEntrada,
      tokens_saida: resOpenAI.tokensSaida,
      tokens_total: resOpenAI.tokensTotal,
      custo_estimado: resOpenAI.custoEstimado,
      is_cached: false,
      status: "concluida",
    };

    const { data: insertedLog } = await supabase
      .from("ia_logs")
      .insert(logData)
      .select()
      .single();

    // Incrementar consumo de créditos na loja
    await supabase
      .from("ia_creditos")
      .update({
        consultas_utilizadas: creditos.consultas_utilizadas + 1,
        tokens_entrada: creditos.tokens_entrada + resOpenAI.tokensEntrada,
        tokens_saida: creditos.tokens_saida + resOpenAI.tokensSaida,
        tokens_total: creditos.tokens_total + resOpenAI.tokensTotal,
        custo_estimado: Number(creditos.custo_estimado) + resOpenAI.custoEstimado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creditos.id);

    // Auditoria global de atividades
    await supabase.from("logs_atividade").insert({
      loja_id: lojaId,
      usuario_id: user.id,
      acao: "consulta_ia_realizada",
      entidade: "ia_logs",
      entidade_id: insertedLog?.id || null,
      dados_novos: { modelo: resOpenAI.modelo, tokens: resOpenAI.tokensTotal, custo: resOpenAI.custoEstimado },
    });

    revalidatePath("/dashboard/ia");
    return {
      success: true,
      content: resOpenAI.content,
      isCached: false,
    };
  } catch (err: any) {
    console.error("Erro ao processar consulta com IA Gerente:", err);
    return { success: false, error: err.message };
  }
}

// ============================================
// 4. LISTAGEM DE HISTÓRICO RECENTE DE CONVERSAS
// ============================================
export async function getRecentIALogs(): Promise<{ data: IALog[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser(); // Dono/Gerente only
    const lojaId = profile.loja_id;

    const { data, error } = await supabase
      .from("ia_logs")
      .select("*")
      .eq("loja_id", lojaId)
      .eq("status", "concluida")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return { data: [], error: error.message };
    return { data: (data || []) as IALog[], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

// ============================================
// 5. COMPRA SIMULADA DE PACOTES DE CRÉDITO (PREPARATÓRIO)
// ============================================
export async function getIAPacotesDisponiveis(): Promise<IAPacoteCreditos[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ia_pacotes_creditos")
      .select("*")
      .eq("ativo", true)
      .order("valor", { ascending: true });

    return (data || []) as IAPacoteCreditos[];
  } catch (err) {
    console.error("Erro ao listar pacotes de IA:", err);
    return [];
  }
}

export async function comprarPacoteCreditosSimulado(pacoteId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();
    const lojaId = profile.loja_id;

    // Buscar dados do pacote
    const { data: pacote, error: fetchErr } = await supabase
      .from("ia_pacotes_creditos")
      .select("*")
      .eq("id", pacoteId)
      .single();

    if (fetchErr || !pacote) {
      return { success: false, error: "Pacote de créditos não encontrado." };
    }

    // 1. Criar registro de compra pendente/confirmado de simulação
    const compraData = {
      loja_id: lojaId,
      pacote_id: pacoteId,
      quantidade: pacote.quantidade_consultas,
      valor: pacote.valor,
      status: "confirmado", // Confirmado imediatamente na simulação
      gateway: "simulado_shopmind",
      gateway_payment_id: `pay_${crypto.randomUUID().substring(0, 8)}`,
      confirmado_em: new Date().toISOString(),
    };

    const { data: insertedCompra, error: insertErr } = await supabase
      .from("ia_creditos_compras")
      .insert(compraData)
      .select()
      .single();

    if (insertErr) return { success: false, error: insertErr.message };

    // 2. Incrementar consultas extras da loja no mês atual
    const creditosRes = await getStoreIACreditos();
    if (creditosRes.data) {
      const creditos = creditosRes.data;
      await supabase
        .from("ia_creditos")
        .update({
          consultas_extras: creditos.consultas_extras + pacote.quantidade_consultas,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creditos.id);
    }

    // 3. Registrar auditoria
    await supabase.from("logs_atividade").insert({
      loja_id: lojaId,
      usuario_id: user.id,
      acao: "pacote_ia_visualizado", // Rastreamento de atração
      entidade: "ia_creditos_compras",
      entidade_id: insertedCompra.id,
      dados_novos: { pacote: pacote.nome, consultas: pacote.quantidade_consultas, valor: pacote.valor },
    });

    revalidatePath("/dashboard/ia");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Erro ao simular compra de créditos:", err);
    return { success: false, error: err.message };
  }
}

// ============================================
// REQUISITO 4: DASHBOARD ADMINISTRATIVO DE CONSUMO DE IA (MONITORAMENTO)
// ============================================
export async function getIAAdminMetrics(): Promise<{ data: IAAdminMetrics | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser(); // Dono/Gerente only
    const lojaId = profile.loja_id;

    // Buscar logs completos do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: logs, error: logsError } = await supabase
      .from("ia_logs")
      .select("*")
      .eq("loja_id", lojaId)
      .gte("created_at", startOfMonth);

    if (logsError) return { data: null, error: logsError.message };

    const logList = (logs || []) as IALog[];
    
    const totalConsultas = logList.length;
    const consultasComSucesso = logList.filter(l => l.status === "concluida").length;
    const consultasBloqueadas = logList.filter(l => l.status === "bloqueada").length;
    const consultasCached = logList.filter(l => l.is_cached === true).length;
    
    const cacheHitRate = totalConsultas > 0 ? (consultasCached / totalConsultas) * 100 : 0;
    
    const totalTokens = logList.reduce((acc, l) => acc + (l.tokens_total || 0), 0);
    const custoEstimadoTotal = logList.reduce((acc, l) => acc + Number(l.custo_estimado || 0), 0);

    // Agrupamento por Tipo de Análise
    const tipoMap: Record<string, number> = {};
    logList.forEach(l => {
      const t = l.tipo || "geral";
      tipoMap[t] = (tipoMap[t] || 0) + 1;
    });
    const consumoPorTipo = Object.entries(tipoMap).map(([tipo, qtd]) => ({ tipo, qtd }));

    // Agrupamento por Modelo
    const modeloMap: Record<string, number> = {};
    logList.forEach(l => {
      if (l.status === "concluida" && !l.is_cached) {
        const m = l.modelo || "gpt-4o-mini";
        modeloMap[m] = (modeloMap[m] || 0) + 1;
      }
    });
    const consumoPorModelo = Object.entries(modeloMap).map(([modelo, qtd]) => ({ modelo, qtd }));

    // Timeline diária do consumo dos últimos 15 dias
    const timelineMap: Record<string, { total: number; cached: number }> = {};
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      timelineMap[dStr] = { total: 0, cached: 0 };
    }

    logList.forEach(l => {
      const dStr = l.created_at.split("T")[0];
      if (timelineMap[dStr]) {
        timelineMap[dStr].total += 1;
        if (l.is_cached) {
          timelineMap[dStr].cached += 1;
        }
      }
    });

    const consumoDiarioTimeline = Object.entries(timelineMap).map(([data, val]) => ({
      data: new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      qtd: val.total,
      cached: val.cached,
    }));

    const metrics: IAAdminMetrics = {
      totalConsultas,
      consultasComSucesso,
      consultasBloqueadas,
      consultasCached,
      cacheHitRate: parseFloat(cacheHitRate.toFixed(1)),
      totalTokens,
      custoEstimadoTotal: parseFloat(custoEstimadoTotal.toFixed(4)),
      consumoPorTipo,
      consumoPorModelo,
      consumoDiarioTimeline,
    };

    return { data: metrics, error: null };
  } catch (err: any) {
    console.error("Erro ao compilar métricas administrativas de IA:", err);
    return { data: null, error: err.message };
  }
}

// ============================================
// 6. INSIGHTS OPERACIONAIS GRATUITOS (SQL LOCAL - ZERO CRÉDITOS)
// ============================================
export async function getFreeStoreInsights() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser(true); // Dono, Gerente and Estoquista can read
    const lojaId = profile.loja_id;

    const hojeStr = new Date().toISOString().split("T")[0];

    // 1. Estoque Baixo e Zerado
    const { data: produtos } = await supabase
      .from("produtos")
      .select("estoque, estoque_minimo")
      .eq("loja_id", lojaId)
      .eq("ativo", true);

    let estoqueBaixo = 0;
    let estoqueZerado = 0;
    (produtos || []).forEach((p: any) => {
      const est = Number(p.estoque);
      const min = Number(p.estoque_minimo);
      if (est <= 0) {
        estoqueZerado += 1;
      } else if (est < min) {
        estoqueBaixo += 1;
      }
    });

    // 2. Contas Atrasadas (Financeiro)
    const { count: contasAtrasadas } = await supabase
      .from("financeiro")
      .select("*", { count: "exact", head: true })
      .eq("loja_id", lojaId)
      .eq("status", "pendente")
      .lt("data_vencimento", hojeStr);

    // 3. Fornecedores Inativos (sem compras nos últimos 60 dias)
    const sessentaDiasAtras = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: fornecedores } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("loja_id", lojaId);

    const { data: comprasRecentes } = await supabase
      .from("compras")
      .select("fornecedor_id")
      .eq("loja_id", lojaId)
      .eq("status", "concluida")
      .gte("created_at", sessentaDiasAtras);

    const fornecedoresAtivosIds = new Set((comprasRecentes || []).map((c: any) => c.fornecedor_id).filter(Boolean));
    const fornecedoresInativos = (fornecedores || []).filter(f => !fornecedoresAtivosIds.has(f.id)).length;

    // 4. Caixas Abertos
    const { count: caixasAbertos } = await supabase
      .from("caixas")
      .select("*", { count: "exact", head: true })
      .eq("loja_id", lojaId)
      .eq("status", "aberto");

    return {
      estoqueBaixo,
      estoqueZerado,
      contasAtrasadas: contasAtrasadas || 0,
      fornecedoresInativos,
      caixasAbertos: caixasAbertos || 0,
    };
  } catch (err) {
    console.error("Erro ao computar insights gratuitos:", err);
    return {
      estoqueBaixo: 0,
      estoqueZerado: 0,
      contasAtrasadas: 0,
      fornecedoresInativos: 0,
      caixasAbertos: 0,
    };
  }
}

