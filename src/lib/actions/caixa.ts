"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Caixa,
  MovimentacaoCaixa,
  CaixaFilter,
  CaixaIAInsight,
} from "@/lib/types/caixa";

// Helper to get active user and their loja_id & role
async function getProfileAndUser() {
  console.log("[SERVER] getProfileAndUser - Start");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[SERVER] getProfileAndUser - No user found");
    throw new Error("Usuário não autenticado.");
  }
  console.log("[SERVER] getProfileAndUser - User authenticated:", user.id);

  const { data: profile } = await supabase
    .from("usuarios")
    .select("loja_id, nome, tipo")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.error("[SERVER] getProfileAndUser - Profile not found for user:", user.id);
    throw new Error("Perfil do usuário não encontrado.");
  }
  console.log("[SERVER] getProfileAndUser - Profile loaded:", profile);

  return { user, profile };
}

// ============================================
// BUSCAR CAIXA ATUAL (ABERTO)
// ============================================
export async function getCurrentCaixa() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: "Usuário não autenticado." };
    }

    const { data, error } = await supabase
      .from("caixas")
      .select("*, usuario:usuarios(nome)")
      .eq("usuario_id", user.id)
      .eq("status", "aberto")
      .order("aberto_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    // Map relation
    const caixa: Caixa = {
      ...data,
      usuario_nome: (data.usuario as any)?.nome || "Operador",
    };

    return { data: caixa, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// ============================================
// ABRIR NOVO CAIXA
// ============================================
export async function abrirCaixa(valorAbertura: number, observacao?: string) {
  console.log("[SERVER] abrirCaixa - Start. valorAbertura:", valorAbertura);
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Verification: Does THIS user already have an open caixa?
    console.log("[SERVER] abrirCaixa - Checking if caixa already open");
    const { data: openCaixa, error: checkError } = await supabase
      .from("caixas")
      .select("id")
      .eq("loja_id", profile.loja_id)
      .eq("usuario_id", user.id)
      .eq("status", "aberto")
      .maybeSingle();

    if (checkError) {
      console.error("[SERVER] abrirCaixa - Check error:", checkError.message);
    }
    console.log("[SERVER] abrirCaixa - Existing open caixa:", openCaixa);

    if (openCaixa) {
      console.warn("[SERVER] abrirCaixa - Caixa already open");
      return { data: null, error: "Você já possui um caixa aberto. Feche o seu caixa atual antes de abrir um novo." };
    }

    console.log("[SERVER] abrirCaixa - Inserting new caixa record");
    const { data, error } = await supabase
      .from("caixas")
      .insert({
        loja_id: profile.loja_id,
        usuario_id: user.id,
        valor_abertura: valorAbertura,
        valor_fechamento: null,
        total_vendas: 0,
        total_dinheiro: 0,
        total_pix: 0,
        total_cartao_credito: 0,
        total_cartao_debito: 0,
        total_sangrias: 0,
        total_suprimentos: 0,
        quantidade_vendas: 0,
        observacao: observacao || null,
        status: "aberto",
        aberto_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[SERVER] abrirCaixa - Insert error:", error.message);
      return { data: null, error: error.message };
    }
    console.log("[SERVER] abrirCaixa - Insert success:", data);

    // Log Activity
    console.log("[SERVER] abrirCaixa - Logging activity");
    const { error: logError } = await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "abertura",
      entidade: "caixa",
      entidade_id: data.id,
      dados_novos: data,
    });
    if (logError) {
      console.error("[SERVER] abrirCaixa - Log activity error:", logError.message);
    }

    revalidatePath("/dashboard/caixa");
    
    const mapped: Caixa = {
      ...data,
      usuario_nome: profile.nome,
    };

    console.log("[SERVER] abrirCaixa - Done. Returning mapped:", mapped);
    return { data: mapped, error: null };
  } catch (err: any) {
    console.error("[SERVER] abrirCaixa - Uncaught error:", err.message);
    return { data: null, error: err.message };
  }
}

// ============================================
// FECHAR CAIXA (CONFERÊNCIA)
// ============================================
export async function fecharCaixa(caixaId: string, valorFechamento: number, observacao?: string) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Get current state
    const { data: current } = await supabase
      .from("caixas")
      .select("*")
      .eq("id", caixaId)
      .single();

    if (!current) {
      return { data: null, error: "Caixa não encontrado." };
    }

    if (current.status === "fechado") {
      return { data: null, error: "Este caixa já está fechado." };
    }

    // RBAC: Operator ('caixa') can only close their OWN caixa
    if (profile.tipo === "caixa" && current.usuario_id !== user.id) {
      return { data: null, error: "Você não tem permissão para fechar o caixa de outro operador." };
    }

    // Gerente/Dono can close any caixa (intervention)
    const fechadoPorGerente = current.usuario_id !== user.id;

    const { data, error } = await supabase
      .from("caixas")
      .update({
        status: "fechado",
        valor_fechamento: valorFechamento,
        fechado_em: new Date().toISOString(),
        observacao: observacao 
          ? (fechadoPorGerente ? `[Intervenção por Gerente/Dono: ${profile.nome}] ` : "") + observacao
          : (fechadoPorGerente ? `Fechado por intervenção de Gerente/Dono: ${profile.nome}` : null),
      })
      .eq("id", caixaId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Log Activity
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "fechamento",
      entidade: "caixa",
      entidade_id: data.id,
      dados_anteriores: current,
      dados_novos: data,
    });

    revalidatePath("/dashboard/caixa");

    const mapped: Caixa = {
      ...data,
      usuario_nome: profile.nome,
    };

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// ============================================
// REGISTRAR SANGRIA (RETIRADA DE DINHEIRO)
// ============================================
export async function registrarSangria(caixaId: string, valor: number, motivo: string) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Verify caixa status and balance
    const { data: caixa } = await supabase
      .from("caixas")
      .select("*")
      .eq("id", caixaId)
      .single();

    if (!caixa) {
      return { success: false, error: "Caixa não encontrado." };
    }

    if (caixa.status !== "aberto") {
      return { success: false, error: "O caixa deve estar aberto para realizar movimentações." };
    }

    // RBAC: Operator ('caixa') can only perform sangria on their OWN caixa
    if (profile.tipo === "caixa" && caixa.usuario_id !== user.id) {
      return { success: false, error: "Você não tem permissão para realizar sangrias no caixa de outro operador." };
    }

    // Compute expected cash in drawer
    const expectedCashInDrawer =
      Number(caixa.valor_abertura) +
      Number(caixa.total_dinheiro) +
      Number(caixa.total_suprimentos) -
      Number(caixa.total_sangrias);

    if (valor > expectedCashInDrawer) {
      return {
        success: false,
        error: `Saldo em dinheiro insuficiente na gaveta. Saldo atual: R$ ${expectedCashInDrawer.toFixed(2)}. Valor da sangria solicitado: R$ ${valor.toFixed(2)}.`,
      };
    }

    const { data, error } = await supabase
      .from("movimentacoes_caixa")
      .insert({
        loja_id: profile.loja_id,
        caixa_id: caixaId,
        usuario_id: user.id,
        tipo: "sangria",
        valor,
        motivo,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log Activity
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "sangria",
      entidade: "caixa",
      entidade_id: caixaId,
      dados_novos: data,
    });

    revalidatePath("/dashboard/caixa");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// REGISTRAR SUPRIMENTO (APORTE DE DINHEIRO)
// ============================================
export async function registrarSuprimento(caixaId: string, valor: number, motivo: string) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Verify caixa status
    const { data: caixa } = await supabase
      .from("caixas")
      .select("*")
      .eq("id", caixaId)
      .single();

    if (!caixa) {
      return { success: false, error: "Caixa não encontrado." };
    }

    if (caixa.status !== "aberto") {
      return { success: false, error: "O caixa deve estar aberto para realizar movimentações." };
    }

    // RBAC: Operator ('caixa') can only perform suprimento on their OWN caixa
    if (profile.tipo === "caixa" && caixa.usuario_id !== user.id) {
      return { success: false, error: "Você não tem permissão para realizar suprimentos no caixa de outro operador." };
    }

    const { data, error } = await supabase
      .from("movimentacoes_caixa")
      .insert({
        loja_id: profile.loja_id,
        caixa_id: caixaId,
        usuario_id: user.id,
        tipo: "suprimento",
        valor,
        motivo,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log Activity
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "suprimento",
      entidade: "caixa",
      entidade_id: caixaId,
      dados_novos: data,
    });

    revalidatePath("/dashboard/caixa");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// EXTRATO DE MOVIMENTAÇÕES UNIFICADO DO CAIXA
// ============================================
export async function getMovimentacoesCaixa(caixaId: string) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Verify view permissions
    const { data: caixa } = await supabase
      .from("caixas")
      .select("usuario_id")
      .eq("id", caixaId)
      .single();

    if (!caixa) {
      return { data: [], error: "Caixa não encontrado." };
    }

    // RBAC: Operator ('caixa') can only see movements for their OWN caixa
    if (profile.tipo === "caixa" && caixa.usuario_id !== user.id) {
      return { data: [], error: "Você não tem permissão para visualizar o extrato de outro operador." };
    }

    // 1. Fetch Sangrias / Suprimentos
    const { data: movs, error: errorMovs } = await supabase
      .from("movimentacoes_caixa")
      .select("*, usuario:usuarios(nome)")
      .eq("caixa_id", caixaId)
      .order("created_at", { ascending: false });

    if (errorMovs) {
      return { data: [], error: errorMovs.message };
    }

    // 2. Fetch Vendas
    const { data: vendas, error: errorVendas } = await supabase
      .from("vendas")
      .select("*, usuario:usuarios(nome)")
      .eq("caixa_id", caixaId)
      .order("created_at", { ascending: false });

    if (errorVendas) {
      return { data: [], error: errorVendas.message };
    }

    // 3. Map into unified list
    const timeline: MovimentacaoCaixa[] = [];

    // Map movements (sangrias / suprimentos)
    movs?.forEach((m) => {
      timeline.push({
        id: m.id,
        loja_id: m.loja_id,
        caixa_id: m.caixa_id,
        usuario_id: m.usuario_id,
        tipo: m.tipo as "sangria" | "suprimento",
        valor: Number(m.valor),
        motivo: m.motivo,
        created_at: m.created_at,
        usuario_nome: (m.usuario as any)?.nome || "Operador",
      });
    });

    // Map sales
    vendas?.forEach((v) => {
      let formaPag = "";
      if (v.forma_pagamento === "dinheiro") formaPag = "Dinheiro";
      else if (v.forma_pagamento === "pix") formaPag = "Pix";
      else if (v.forma_pagamento === "cartao_credito") formaPag = "Cartão de Crédito";
      else if (v.forma_pagamento === "cartao_debito") formaPag = "Cartão de Débito";
      else if (v.forma_pagamento === "multiplo") {
        const details = [];
        if (v.detalhe_pagamento) {
          const dp = v.detalhe_pagamento as Record<string, number>;
          if (dp.dinheiro) details.push(`Dinheiro: R$ ${Number(dp.dinheiro).toFixed(2)}`);
          if (dp.pix) details.push(`Pix: R$ ${Number(dp.pix).toFixed(2)}`);
          if (dp.cartao_credito) details.push(`Crédito: R$ ${Number(dp.cartao_credito).toFixed(2)}`);
          if (dp.cartao_debito) details.push(`Débito: R$ ${Number(dp.cartao_debito).toFixed(2)}`);
        }
        formaPag = `Múltiplo (${details.join(" | ")})`;
      }

      timeline.push({
        id: v.id,
        loja_id: v.loja_id,
        caixa_id: v.caixa_id,
        usuario_id: v.usuario_id,
        tipo: v.status === "cancelada" ? "cancelada" : "venda",
        valor: Number(v.total),
        motivo: `Venda #${v.numero} - Pagamento: ${formaPag}`,
        created_at: v.created_at,
        usuario_nome: (v.usuario as any)?.nome || "Operador",
        venda_numero: v.numero,
      });
    });

    // Sort by created_at desc
    timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: timeline, error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

// ============================================
// LISTAR CAIXAS ANTERIORES (HISTÓRICO)
// ============================================
export async function listCaixas(filters: CaixaFilter = {}) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    const {
      status = "todos",
      usuario_id = "todos",
      data_inicio,
      data_fim,
      page = 1,
      perPage = 10,
    } = filters;

    let query = supabase
      .from("caixas")
      .select("*, usuario:usuarios(nome)", { count: "exact" })
      .eq("loja_id", profile.loja_id);

    // OPERADOR ('caixa') can ONLY see their own cash sessions
    if (profile.tipo === "caixa") {
      query = query.eq("usuario_id", user.id);
    } else if (usuario_id !== "todos") {
      // Gerente/Dono can filter by operator
      query = query.eq("usuario_id", usuario_id);
    }

    // Apply status filter
    if (status !== "todos") {
      query = query.eq("status", status);
    }

    // Apply date range
    if (data_inicio) {
      query = query.gte("aberto_em", new Date(data_inicio).toISOString());
    }
    if (data_fim) {
      const endOfDay = new Date(data_fim);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("aberto_em", endOfDay.toISOString());
    }

    // Pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order("aberto_em", { ascending: false })
      .range(from, to);

    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    const mapped = (data || []).map((c) => ({
      ...c,
      usuario_nome: (c.usuario as any)?.nome || "Operador",
    })) as Caixa[];

    return { data: mapped, count: count || 0, error: null };
  } catch (err: any) {
    return { data: [], count: 0, error: err.message };
  }
}

// ============================================
// IA GERENTE INSIGHTS DO CAIXA (RBAC & Advanced Architecture)
// ============================================
export async function getCaixaIAInsights(caixaId?: string) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    const insights: CaixaIAInsight[] = [];

    // OPERADORS only see insights for their active caixa (security/anomalies comparisons are for manager only)
    const isManager = profile.tipo === "dono" || profile.tipo === "gerente";

    // 1. Fetch target box data
    let activeCaixa: any = null;
    if (caixaId) {
      const { data } = await supabase
        .from("caixas")
        .select("*, usuario:usuarios(nome)")
        .eq("id", caixaId)
        .maybeSingle();
      activeCaixa = data;
    } else {
      let query = supabase
        .from("caixas")
        .select("*, usuario:usuarios(nome)")
        .eq("loja_id", profile.loja_id)
        .eq("status", "aberto");

      if (!isManager) {
        query = query.eq("usuario_id", user.id);
      }

      const { data } = await query.order("aberto_em", { ascending: false }).limit(1).maybeSingle();
      activeCaixa = data;
    }

    // Insight: Preventative Sangria Check (only for open boxes)
    if (activeCaixa && activeCaixa.status === "aberto") {
      const cashInDrawer =
        Number(activeCaixa.valor_abertura) +
        Number(activeCaixa.total_dinheiro) +
        Number(activeCaixa.total_suprimentos) -
        Number(activeCaixa.total_sangrias);

      // Recommends sangria if cash in drawer is above R$ 500,00
      if (cashInDrawer > 500) {
        insights.push({
          id: "preventative-sangria",
          tipo: "alerta",
          titulo: "Sangria Preventiva Recomendada",
          descricao: `Há um saldo alto de dinheiro em espécie na gaveta (R$ ${cashInDrawer.toFixed(2)}). Recomenda-se realizar uma sangria de R$ ${(cashInDrawer - 150).toFixed(2)} para deixar apenas R$ 150,00 de troco, reduzindo riscos de segurança.`,
          acao: "sangria",
          acaoLabel: "Fazer Sangria Agora",
        });
      }

      // ARCHITECTURE FOR SUSPICIOUS PATTERNS: Excess Cancelled Sales in Active Session
      const { count: activeCancelCount, data: cancelSales } = await supabase
        .from("vendas")
        .select("total", { count: "exact" })
        .eq("caixa_id", activeCaixa.id)
        .eq("status", "cancelada");

      const totalActiveSales = Number(activeCaixa.quantidade_vendas) + (activeCancelCount || 0);

      if (totalActiveSales > 5 && (activeCancelCount || 0) / totalActiveSales > 0.15) {
        insights.push({
          id: "excessive-cancellations-active",
          tipo: isManager ? "perigo" : "alerta",
          titulo: "Taxa Elevada de Cancelamento de Vendas",
          descricao: isManager
            ? `O operador ${activeCaixa.usuario?.nome || "atual"} cancelou ${(activeCancelCount || 0)} vendas de um total de ${totalActiveSales} nesta sessão (${(((activeCancelCount || 0) / totalActiveSales) * 100).toFixed(0)}%). Isso representa um padrão incomum e deve ser monitorado.`
            : `Atenção: Seu caixa registra uma taxa de cancelamento de vendas incomum nesta sessão (${(((activeCancelCount || 0) / totalActiveSales) * 100).toFixed(0)}%). Garanta a justificativa de cada cancelamento no sistema.`,
        });
      }
    }

    // 2. Fetch last 15 closed boxes to do audit analytics (Managers/Owners only)
    if (isManager) {
      const { data: previousCaixas } = await supabase
        .from("caixas")
        .select("*, usuario:usuarios(nome)")
        .eq("loja_id", profile.loja_id)
        .eq("status", "fechado")
        .order("fechado_em", { ascending: false })
        .limit(15);

      if (previousCaixas && previousCaixas.length > 0) {
        // --- ARCHITECTURE: OPERATORS WITH RECURRING DIFFERENCES ---
        const operatorStats: Record<string, { name: string; totalDiff: number; count: number; shortages: number }> = {};

        previousCaixas.forEach((c) => {
          const expected =
            Number(c.valor_abertura) +
            Number(c.total_dinheiro) +
            Number(c.total_suprimentos) -
            Number(c.total_sangrias);
          const actual = Number(c.valor_fechamento);
          const diff = actual - expected;
          const opId = c.usuario_id;
          const opName = (c.usuario as any)?.nome || "Desconhecido";

          if (!operatorStats[opId]) {
            operatorStats[opId] = { name: opName, totalDiff: 0, count: 0, shortages: 0 };
          }

          operatorStats[opId].count++;
          operatorStats[opId].totalDiff += diff;
          if (diff < -5) {
            operatorStats[opId].shortages++;
          }
        });

        // Generate warnings if any operator has repeated shortages
        Object.entries(operatorStats).forEach(([opId, stats]) => {
          if (stats.shortages >= 2) {
            insights.push({
              id: `operator-recurrences-${opId}`,
              tipo: "perigo",
              titulo: `Diferenças Recorrentes: ${stats.name}`,
              descricao: `O operador ${stats.name} apresentou quebras de caixa (falta de dinheiro físico) em ${stats.shortages} das últimas ${stats.count} sessões operadas. A perda acumulada foi de R$ ${Math.abs(stats.totalDiff).toFixed(2)}.`,
            });
          }
        });

        // --- ARCHITECTURE: ABNORMAL HOURS FOR SANGRIA ---
        // Verify if any sangria happened outside standard hours (e.g. 06:00 - 22:00)
        const closedBoxIds = previousCaixas.map((c) => c.id);
        const { data: previousSangrias } = await supabase
          .from("movimentacoes_caixa")
          .select("*, usuario:usuarios(nome)")
          .in("caixa_id", closedBoxIds)
          .eq("tipo", "sangria");

        if (previousSangrias && previousSangrias.length > 0) {
          const abnormalSangrias = previousSangrias.filter((s) => {
            const date = new Date(s.created_at);
            const hour = date.getHours();
            return hour < 7 || hour >= 22; // Unusual: before 7 AM or after 10 PM
          });

          if (abnormalSangrias.length > 0) {
            insights.push({
              id: "abnormal-hours-sangria",
              tipo: "alerta",
              titulo: "Horários Incomuns de Sangria",
              descricao: `Detectamos ${abnormalSangrias.length} sangrias realizadas fora do horário comercial convencional (entre 22h e 7h) nos caixas anteriores. Exemplo: R$ ${Number(abnormalSangrias[0].valor).toFixed(2)} por ${abnormalSangrias[0].usuario?.nome || "Operador"} às ${new Date(abnormalSangrias[0].created_at).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}.`,
            });
          }
        }

        // --- ARCHITECTURE: COMPARISON BETWEEN OPERATORS & GENERAL ---
        let totalShortages = 0;
        let shortageCount = 0;
        previousCaixas.forEach((c) => {
          const expected =
            Number(c.valor_abertura) +
            Number(c.total_dinheiro) +
            Number(c.total_suprimentos) -
            Number(c.total_sangrias);
          const actual = Number(c.valor_fechamento);
          const diff = actual - expected;
          if (diff < -5) {
            totalShortages += Math.abs(diff);
            shortageCount++;
          }
        });

        if (shortageCount >= 2) {
          insights.push({
            id: "general-shortages-audit",
            tipo: "alerta",
            titulo: "Histórico Geral de Quebras de Caixa",
            descricao: `Nas últimas 15 sessões analisadas de todos os operadores, houve ${shortageCount} ocorrências de quebra de caixa. A soma total de faltas na gaveta física totaliza R$ ${totalShortages.toFixed(2)}.`,
          });
        }

        // Recommend troco ideal
        const averageCashSales = previousCaixas.reduce((acc, c) => acc + Number(c.total_dinheiro), 0) / previousCaixas.length;
        if (averageCashSales > 0) {
          const recommendedOpening = Math.max(100, Math.round(averageCashSales * 0.25));
          insights.push({
            id: "recommended-opening-balance",
            tipo: "sucesso",
            titulo: "Recomendação de Fundo de Troco Ideal",
            descricao: `Com base nas estatísticas das últimas 15 sessões, sugerimos abrir os caixas com R$ ${recommendedOpening.toFixed(2)} de fundo de troco mínimo na gaveta. Isso reduz a necessidade de suprimentos de emergência durante o expediente.`,
          });
        }
      } else {
        insights.push({
          id: "no-history-insights-mgr",
          tipo: "info",
          titulo: "IA Gerente - Auditoria Avançada",
          descricao: "Estou pronta para fazer análises comparativas de comportamento entre operadores, anomalias de horários de sangria e fraudes em cancelamentos. Assim que as primeiras sessões de caixas forem fechadas, os relatórios de auditoria aparecerão aqui.",
        });
      }
    } else {
      // Basic insights for operator when no active box is found
      if (!activeCaixa) {
        insights.push({
          id: "open-your-box-insight",
          tipo: "info",
          titulo: "Pronto para Iniciar",
          descricao: "Seu caixa está fechado no momento. Abra seu caixa com o fundo de troco e estarei pronta para monitorar sua sessão em tempo real.",
        });
      }
    }

    return { data: insights, error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

// ============================================
// BUSCAR DADOS DE CONTEXTO DO PAINEL (PROFILE + OPERADORES)
// ============================================
export async function getCaixaShellData() {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    let operators: { id: string; nome: string }[] = [];

    // If manager or owner, fetch list of active operators
    if (profile.tipo === "dono" || profile.tipo === "gerente") {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nome")
        .eq("loja_id", profile.loja_id)
        .eq("status", "ativo")
        .order("nome", { ascending: true });

      operators = data || [];
    }

    return {
      data: {
        profile: {
          nome: profile.nome,
          tipo: profile.tipo,
        },
        operators,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

