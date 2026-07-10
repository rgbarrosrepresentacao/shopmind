"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================
// AUXILIAR: Obter perfil, loja_id e tipo do usuário
// ============================================
async function getProfileAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("loja_id, nome, tipo")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Perfil do usuário não encontrado.");
  }

  return { user, profile };
}

// ============================================
// 1. CONFIGURAÇÃO DO PROGRAMA DE FIDELIDADE
// ============================================
export async function getFidelidadeConfig() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    const { data, error } = await supabase
      .from("configuracoes_loja")
      .select(`
        id,
        loja_id,
        fidelidade_ativo,
        fidelidade_pontos_conversao,
        fidelidade_cashback_percentual,
        fidelidade_dias_expiracao,
        fidelidade_vip_bronze_min_gasto,
        fidelidade_vip_prata_min_gasto,
        fidelidade_vip_ouro_min_gasto,
        fidelidade_vip_diamante_min_gasto,
        fidelidade_vip_vip_min_gasto
      `)
      .eq("loja_id", profile.loja_id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error("Erro ao obter config de fidelidade:", err);
    return { data: null, error: err.message };
  }
}

export async function salvarFidelidadeConfig(config: {
  fidelidade_ativo: boolean;
  fidelidade_pontos_conversao: number;
  fidelidade_cashback_percentual: number;
  fidelidade_dias_expiracao: number | null;
  fidelidade_vip_bronze_min_gasto: number;
  fidelidade_vip_prata_min_gasto: number;
  fidelidade_vip_ouro_min_gasto: number;
  fidelidade_vip_diamante_min_gasto: number;
  fidelidade_vip_vip_min_gasto: number;
}) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { success: false, error: "Permissão negada. Apenas administradores podem alterar configurações." };
    }

    const { error } = await supabase
      .from("configuracoes_loja")
      .update({
        fidelidade_ativo: config.fidelidade_ativo,
        fidelidade_pontos_conversao: config.fidelidade_pontos_conversao,
        fidelidade_cashback_percentual: config.fidelidade_cashback_percentual,
        fidelidade_dias_expiracao: config.fidelidade_dias_expiracao,
        fidelidade_vip_bronze_min_gasto: config.fidelidade_vip_bronze_min_gasto,
        fidelidade_vip_prata_min_gasto: config.fidelidade_vip_prata_min_gasto,
        fidelidade_vip_ouro_min_gasto: config.fidelidade_vip_ouro_min_gasto,
        fidelidade_vip_diamante_min_gasto: config.fidelidade_vip_diamante_min_gasto,
        fidelidade_vip_vip_min_gasto: config.fidelidade_vip_vip_min_gasto,
        updated_at: new Date().toISOString(),
      })
      .eq("loja_id", profile.loja_id);

    if (error) throw error;

    revalidatePath("/dashboard/fidelidade");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Erro ao salvar config de fidelidade:", err);
    return { success: false, error: err.message };
  }
}

// ============================================
// 2. CATÁLOGO DE RECOMPENSAS (PRÊMIOS)
// ============================================
export async function getRecompensasFidelidade() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    const { data, error } = await supabase
      .from("cliente_recompensas")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .order("custo_pontos", { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function salvarRecompensaFidelidade(recompensa: {
  id?: string;
  nome: string;
  descricao: string;
  tipo: "desconto" | "produto" | "brinde" | "cashback" | "cupom";
  custo_pontos: number;
  valor_desconto: number;
  status: "ativo" | "inativo";
}) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { success: false, error: "Apenas Dono e Gerente podem gerenciar recompensas." };
    }

    const payload = {
      loja_id: profile.loja_id,
      nome: recompensa.nome,
      descricao: recompensa.descricao,
      tipo: recompensa.tipo,
      custo_pontos: recompensa.custo_pontos,
      valor_desconto: recompensa.valor_desconto,
      status: recompensa.status,
      updated_at: new Date().toISOString(),
    };

    if (recompensa.id) {
      const { error } = await supabase
        .from("cliente_recompensas")
        .update(payload)
        .eq("id", recompensa.id)
        .eq("loja_id", profile.loja_id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("cliente_recompensas")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
      if (error) throw error;
    }

    revalidatePath("/dashboard/fidelidade");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function excluirRecompensaFidelidade(id: string) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { success: false, error: "Apenas Dono e Gerente podem excluir recompensas." };
    }

    const { error } = await supabase
      .from("cliente_recompensas")
      .delete()
      .eq("id", id)
      .eq("loja_id", profile.loja_id);

    if (error) throw error;

    revalidatePath("/dashboard/fidelidade");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// 3. CAMPANHAS DE FIDELIDADE
// ============================================
export async function getCampanhasFidelidade() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    const { data, error } = await supabase
      .from("campanhas_fidelidade")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .order("inicio", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function salvarCampanhaFidelidade(campanha: {
  id?: string;
  nome: string;
  descricao: string;
  tipo: "dobro_pontos" | "cashback_extra" | "cliente_aniversario" | "cliente_vip" | "cliente_inativo" | "produto_especifico" | "categoria_especifica";
  inicio: string;
  fim: string;
  status: "ativo" | "inativo" | "rascunho";
  regras: any;
}) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { success: false, error: "Apenas Dono e Gerente podem gerenciar campanhas." };
    }

    const payload = {
      loja_id: profile.loja_id,
      nome: campanha.nome.trim(),
      descricao: campanha.descricao,
      tipo: campanha.tipo,
      inicio: campanha.inicio,
      fim: campanha.fim,
      status: campanha.status,
      regras: campanha.regras || {},
      updated_at: new Date().toISOString(),
    };

    if (campanha.id) {
      const { error } = await supabase
        .from("campanhas_fidelidade")
        .update(payload)
        .eq("id", campanha.id)
        .eq("loja_id", profile.loja_id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("campanhas_fidelidade")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });
      if (error) throw error;
    }

    revalidatePath("/dashboard/fidelidade");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function excluirCampanhaFidelidade(id: string) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { success: false, error: "Apenas Dono e Gerente podem excluir campanhas." };
    }

    const { error } = await supabase
      .from("campanhas_fidelidade")
      .delete()
      .eq("id", id)
      .eq("loja_id", profile.loja_id);

    if (error) throw error;

    revalidatePath("/dashboard/fidelidade");
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// 4. INFORMAÇÕES DE FIDELIDADE DO CLIENTE
// ============================================
export async function getClienteFidelidadeInfo(clienteId: string) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Obter saldo de pontos
    const { data: pontos } = await supabase
      .from("cliente_pontos")
      .select("saldo_pontos, total_pontos_acumulados, total_pontos_resgatados")
      .eq("cliente_id", clienteId)
      .eq("loja_id", profile.loja_id)
      .maybeSingle();

    // 2. Obter saldo de cashback
    const { data: cashback } = await supabase
      .from("cliente_cashback")
      .select("saldo_cashback, total_gerado, total_utilizado")
      .eq("cliente_id", clienteId)
      .eq("loja_id", profile.loja_id)
      .maybeSingle();

    // 3. Obter dados VIP e última compra da filial
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", clienteId)
      .single();

    const { data: storeStats } = await supabase
      .from("cliente_loja_stats")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("loja_id", profile.loja_id)
      .maybeSingle();

    // 4. Calcular o ranking do cliente na loja (comparando total_gasto da filial)
    const { data: rankList } = await supabase
      .from("cliente_loja_stats")
      .select("cliente_id")
      .eq("loja_id", profile.loja_id)
      .order("total_gasto", { ascending: false });

    const ranking = rankList ? rankList.findIndex(c => c.cliente_id === clienteId) + 1 : 0;

    return {
      data: {
        saldo_pontos: pontos?.saldo_pontos || 0,
        total_pontos_acumulados: pontos?.total_pontos_acumulados || 0,
        total_pontos_resgatados: pontos?.total_pontos_resgatados || 0,
        saldo_cashback: Number(cashback?.saldo_cashback || 0),
        total_cashback_gerado: Number(cashback?.total_gerado || 0),
        total_cashback_utilizado: Number(cashback?.total_utilizado || 0),
        nivel_vip: storeStats?.nivel_vip || "Bronze",
        data_entrada_vip: storeStats?.data_entrada_vip || null,
        data_expiracao_vip: storeStats?.data_expiracao_vip || null,
        total_gasto: Number(storeStats?.total_gasto || 0),
        total_compras: storeStats?.total_compras || 0,
        ultima_compra: storeStats?.ultima_compra || null,
        ranking,
      },
      error: null,
    };
  } catch (err: any) {
    console.error("Erro ao carregar fidelidade do cliente:", err);
    return { data: null, error: err.message };
  }
}

export async function getMovimentacoesFidelidade(clienteId?: string) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    let query = supabase
      .from("cliente_movimentacoes_fidelidade")
      .select("*, clientes(nome)")
      .eq("loja_id", profile.loja_id);

    if (clienteId) {
      query = query.eq("cliente_id", clienteId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

// ============================================
// 5. RECÁLCULO DE VIP (ANO MÓVEL - ÚLTIMOS 365 DIAS)
// ============================================
export async function recalcularVIPCliente(clienteId: string, lojaId: string) {
  const supabase = await createClient();

  // 1. Obter gasto acumulado nos últimos 365 dias
  const dataCorte = new Date();
  dataCorte.setDate(dataCorte.getDate() - 365);
  const dataCorteStr = dataCorte.toISOString();

  const { data: vendasAno } = await supabase
    .from("vendas")
    .select("total")
    .eq("cliente_id", clienteId)
    .eq("loja_id", lojaId)
    .eq("status", "concluida")
    .gte("created_at", dataCorteStr);

  const gastoAno = vendasAno ? vendasAno.reduce((acc, v) => acc + Number(v.total), 0) : 0;

  // 2. Obter regras de VIP da loja
  const { data: config } = await supabase
    .from("configuracoes_loja")
    .select(`
      fidelidade_vip_bronze_min_gasto,
      fidelidade_vip_prata_min_gasto,
      fidelidade_vip_ouro_min_gasto,
      fidelidade_vip_diamante_min_gasto,
      fidelidade_vip_vip_min_gasto
    `)
    .eq("loja_id", lojaId)
    .single();

  if (!config) return;

  const bronzeLimit = Number(config.fidelidade_vip_bronze_min_gasto || 0);
  const prataLimit = Number(config.fidelidade_vip_prata_min_gasto || 1500);
  const ouroLimit = Number(config.fidelidade_vip_ouro_min_gasto || 3000);
  const diamanteLimit = Number(config.fidelidade_vip_diamante_min_gasto || 6000);
  const vipLimit = Number(config.fidelidade_vip_vip_min_gasto || 10000);

  // 3. Determinar o nível correspondente
  let novoNivel = "Bronze";
  if (gastoAno >= vipLimit) {
    novoNivel = "VIP";
  } else if (gastoAno >= diamanteLimit) {
    novoNivel = "Diamante";
  } else if (gastoAno >= ouroLimit) {
    novoNivel = "Ouro";
  } else if (gastoAno >= prataLimit) {
    novoNivel = "Prata";
  }

  // 4. Obter nível atual para checar se houve mudança
  const { data: clienteAtual } = await supabase
    .from("cliente_loja_stats")
    .select("nivel_vip")
    .eq("cliente_id", clienteId)
    .eq("loja_id", lojaId)
    .maybeSingle();

  const nivelVipAtual = clienteAtual?.nivel_vip || "Bronze";

  if (nivelVipAtual !== novoNivel) {
    const hoje = new Date();
    const expiracao = new Date();
    expiracao.setDate(hoje.getDate() + 365); // Validade de 1 ano

    await supabase
      .from("cliente_loja_stats")
      .upsert({
        cliente_id: clienteId,
        loja_id: lojaId,
        nivel_vip: novoNivel,
        data_entrada_vip: hoje.toISOString(),
        data_expiracao_vip: expiracao.toISOString(),
        updated_at: hoje.toISOString()
      }, { onConflict: "cliente_id, loja_id" });

    // Grava log de mudança de nível VIP
    await supabase.from("logs_atividade").insert({
      loja_id: lojaId,
      acao: "ajuste",
      entidade: "cliente",
      entidade_id: clienteId,
      dados_novos: {
        mudanca: "nivel_vip",
        anterior: nivelVipAtual,
        novo: novoNivel,
        gasto_ano_movel: gastoAno,
      },
    });
  }
}

// ============================================
// 6. PROCESSAMENTO DE FIDELIDADE EM COMPRAS
// ============================================

// A. ACÚMULO AUTOMÁTICO NA VENDA
export async function processarAcumuloVenda(vendaId: string, clienteId: string, valorPago: number) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Obter config da loja
    const { data: config } = await getFidelidadeConfig();
    if (!config || !config.fidelidade_ativo) return { success: true };

    const conversao = Number(config.fidelidade_pontos_conversao || 1.00);
    const cashbackPct = Number(config.fidelidade_cashback_percentual || 0.00);
    const diasExp = config.fidelidade_dias_expiracao;

    // 2. Verificar Campanhas Ativas
    const hojeStr = new Date().toISOString().split("T")[0];
    const { data: campanhas } = await supabase
      .from("campanhas_fidelidade")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .eq("status", "ativo")
      .lte("inicio", hojeStr)
      .gte("fim", hojeStr);

    let multiplicadorPontos = 1;
    let cashbackAdicional = 0;

    if (campanhas && campanhas.length > 0) {
      for (const camp of campanhas) {
        if (camp.tipo === "dobro_pontos") {
          multiplicadorPontos = Math.max(multiplicadorPontos, camp.regras?.multiplicador || 2);
        } else if (camp.tipo === "cashback_extra") {
          cashbackAdicional += Number(camp.regras?.cashback_adicional || 0);
        }
      }
    }

    // 3. Checar Aniversário do Cliente (Bônus)
    const { data: cliente } = await supabase
      .from("clientes")
      .select("aniversario")
      .eq("id", clienteId)
      .single();

    if (cliente && cliente.aniversario) {
      const mesNiver = new Date(cliente.aniversario).getMonth();
      const mesAtual = new Date().getMonth();
      if (mesNiver === mesAtual) {
        // Aplica pontos em dobro se for mês de aniversário
        multiplicadorPontos = Math.max(multiplicadorPontos, 2);
      }
    }

    // 4. Calcular Valores Finais
    const pontosGanhos = Math.floor((valorPago / conversao) * multiplicadorPontos);
    const totalCashbackPct = cashbackPct + cashbackAdicional;
    const cashbackGanho = Number((valorPago * (totalCashbackPct / 100)).toFixed(2));

    // 5. Data de Vencimento
    let dataVencimento: string | null = null;
    if (diasExp && diasExp > 0) {
      const d = new Date();
      d.setDate(d.getDate() + diasExp);
      dataVencimento = d.toISOString().split("T")[0];
    }

    // 6. Inserir Movimentação de Acúmulo se houver pontos ou cashback a conceder
    if (pontosGanhos > 0 || cashbackGanho > 0) {
      await supabase.from("cliente_movimentacoes_fidelidade").insert({
        cliente_id: clienteId,
        loja_id: profile.loja_id,
        tipo: "acumulo",
        origem: "compra",
        pontos: pontosGanhos,
        cashback: cashbackGanho,
        descricao: `Pontos/Cashback gerados na compra da Venda #${vendaId.slice(0, 8)}`,
        referencia_id: vendaId,
        vence_em: dataVencimento,
        status: "ativo",
      });

      // 7. Atualizar Saldos Consolidados de Pontos
      const { data: pontosSaldo } = await supabase
        .from("cliente_pontos")
        .select("id, saldo_pontos, total_pontos_acumulados")
        .eq("cliente_id", clienteId)
        .eq("loja_id", profile.loja_id)
        .maybeSingle();

      if (pontosSaldo) {
        await supabase
          .from("cliente_pontos")
          .update({
            saldo_pontos: pontosSaldo.saldo_pontos + pontosGanhos,
            total_pontos_acumulados: pontosSaldo.total_pontos_acumulados + pontosGanhos,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pontosSaldo.id);
      } else {
        await supabase.from("cliente_pontos").insert({
          cliente_id: clienteId,
          loja_id: profile.loja_id,
          saldo_pontos: pontosGanhos,
          total_pontos_acumulados: pontosGanhos,
          total_pontos_resgatados: 0,
        });
      }

      // 8. Atualizar Saldos Consolidados de Cashback
      const { data: cashbackSaldo } = await supabase
        .from("cliente_cashback")
        .select("id, saldo_cashback, total_gerado")
        .eq("cliente_id", clienteId)
        .eq("loja_id", profile.loja_id)
        .maybeSingle();

      if (cashbackSaldo) {
        await supabase
          .from("cliente_cashback")
          .update({
            saldo_cashback: Number((Number(cashbackSaldo.saldo_cashback) + cashbackGanho).toFixed(2)),
            total_gerado: Number((Number(cashbackSaldo.total_gerado) + cashbackGanho).toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", cashbackSaldo.id);
      } else {
        await supabase.from("cliente_cashback").insert({
          cliente_id: clienteId,
          loja_id: profile.loja_id,
          saldo_cashback: cashbackGanho,
          total_gerado: cashbackGanho,
          total_utilizado: 0,
        });
      }
    }

    // 9. Recalcular VIP
    await recalcularVIPCliente(clienteId, profile.loja_id);

    return { success: true };
  } catch (err: any) {
    console.error("Erro ao processar acúmulo de fidelidade:", err);
    return { success: false, error: err.message };
  }
}

// B. APLICAR RESGATES/DESCONTOS DO CHECKOUT
export async function processarResgateCheckout(
  clienteId: string,
  vendaId: string,
  recompensaId?: string,
  cashbackUsado?: number
) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Processar troca de pontos por recompensa física/desconto se fornecido
    if (recompensaId) {
      const { data: recompensa } = await supabase
        .from("cliente_recompensas")
        .select("*")
        .eq("id", recompensaId)
        .single();

      if (recompensa) {
        const custo = recompensa.custo_pontos;
        const { data: saldoInfo } = await supabase
          .from("cliente_pontos")
          .select("id, saldo_pontos, total_pontos_resgatados")
          .eq("cliente_id", clienteId)
          .eq("loja_id", profile.loja_id)
          .single();

        if (!saldoInfo || saldoInfo.saldo_pontos < custo) {
          throw new Error("Saldo de pontos insuficiente para resgatar este prêmio.");
        }

        // Registrar movimentação de saída
        await supabase.from("cliente_movimentacoes_fidelidade").insert({
          cliente_id: clienteId,
          loja_id: profile.loja_id,
          tipo: "resgate",
          origem: "resgate_recompensa",
          pontos: -custo,
          cashback: 0,
          descricao: `Resgate do prêmio: ${recompensa.nome} na Venda #${vendaId.slice(0, 8)}`,
          referencia_id: vendaId,
          status: "ativo",
        });

        // Deduzir pontos do saldo
        await supabase
          .from("cliente_pontos")
          .update({
            saldo_pontos: saldoInfo.saldo_pontos - custo,
            total_pontos_resgatados: saldoInfo.total_pontos_resgatados + custo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", saldoInfo.id);
      }
    }

    // 2. Processar utilização de cashback se fornecido
    if (cashbackUsado && cashbackUsado > 0) {
      const { data: cashbackSaldo } = await supabase
        .from("cliente_cashback")
        .select("id, saldo_cashback, total_utilizado")
        .eq("cliente_id", clienteId)
        .eq("loja_id", profile.loja_id)
        .single();

      if (!cashbackSaldo || Number(cashbackSaldo.saldo_cashback) < cashbackUsado) {
        throw new Error("Saldo de cashback insuficiente para realizar o abate.");
      }

      // Registrar movimentação de saída
      await supabase.from("cliente_movimentacoes_fidelidade").insert({
        cliente_id: clienteId,
        loja_id: profile.loja_id,
        tipo: "resgate",
        origem: "compra",
        pontos: 0,
        cashback: -cashbackUsado,
        descricao: `Cashback de R$ ${cashbackUsado.toFixed(2)} utilizado na Venda #${vendaId.slice(0, 8)}`,
        referencia_id: vendaId,
        status: "ativo",
      });

      // Deduzir cashback do saldo
      await supabase
        .from("cliente_cashback")
        .update({
          saldo_cashback: Number((Number(cashbackSaldo.saldo_cashback) - cashbackUsado).toFixed(2)),
          total_utilizado: Number((Number(cashbackSaldo.total_utilizado) + cashbackUsado).toFixed(2)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cashbackSaldo.id);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Erro ao processar resgate no checkout:", err);
    return { success: false, error: err.message };
  }
}

// C. ESTORNAR COMPRA (CANCELAMENTO)
export async function estornarFidelidadeVenda(vendaId: string) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Buscar todas as movimentações dessa venda
    const { data: movs } = await supabase
      .from("cliente_movimentacoes_fidelidade")
      .select("*")
      .eq("referencia_id", vendaId)
      .eq("loja_id", profile.loja_id)
      .eq("status", "ativo");

    if (!movs || movs.length === 0) return { success: true };

    for (const mov of movs) {
      const clienteId = mov.cliente_id;

      // Inserir registro de estorno (tipo ajuste)
      await supabase.from("cliente_movimentacoes_fidelidade").insert({
        cliente_id: clienteId,
        loja_id: profile.loja_id,
        tipo: "ajuste",
        origem: "ajuste_manual",
        pontos: -mov.pontos, // Inverte o sinal (se era +100 vira -100, se era -50 vira +50)
        cashback: -Number(mov.cashback),
        descricao: `Estorno automático referente à Venda cancelada #${vendaId.slice(0, 8)}`,
        referencia_id: vendaId,
        status: "ativo",
      });

      // Atualizar status da movimentação antiga para cancelado
      await supabase
        .from("cliente_movimentacoes_fidelidade")
        .update({ status: "cancelado" })
        .eq("id", mov.id);

      // Reverter saldos de pontos
      if (mov.pontos !== 0) {
        const { data: pontos } = await supabase
          .from("cliente_pontos")
          .select("id, saldo_pontos, total_pontos_acumulados, total_pontos_resgatados")
          .eq("cliente_id", clienteId)
          .eq("loja_id", profile.loja_id)
          .single();

        if (pontos) {
          if (mov.pontos > 0) {
            // Estorna pontos acumulados
            await supabase
              .from("cliente_pontos")
              .update({
                saldo_pontos: Math.max(0, pontos.saldo_pontos - mov.pontos),
                total_pontos_acumulados: Math.max(0, pontos.total_pontos_acumulados - mov.pontos),
                updated_at: new Date().toISOString(),
              })
              .eq("id", pontos.id);
          } else {
            // Devolve pontos resgatados
            await supabase
              .from("cliente_pontos")
              .update({
                saldo_pontos: pontos.saldo_pontos + Math.abs(mov.pontos),
                total_pontos_resgatados: Math.max(0, pontos.total_pontos_resgatados - Math.abs(mov.pontos)),
                updated_at: new Date().toISOString(),
              })
              .eq("id", pontos.id);
          }
        }
      }

      // Reverter saldos de cashback
      if (Number(mov.cashback) !== 0) {
        const { data: cashback } = await supabase
          .from("cliente_cashback")
          .select("id, saldo_cashback, total_gerado, total_utilizado")
          .eq("cliente_id", clienteId)
          .eq("loja_id", profile.loja_id)
          .single();

        if (cashback) {
          const val = Number(mov.cashback);
          if (val > 0) {
            // Estorna cashback gerado
            await supabase
              .from("cliente_cashback")
              .update({
                saldo_cashback: Number(Math.max(0, Number(cashback.saldo_cashback) - val).toFixed(2)),
                total_gerado: Number(Math.max(0, Number(cashback.total_gerado) - val).toFixed(2)),
                updated_at: new Date().toISOString(),
              })
              .eq("id", cashback.id);
          } else {
            // Devolve cashback utilizado
            const absVal = Math.abs(val);
            await supabase
              .from("cliente_cashback")
              .update({
                saldo_cashback: Number((Number(cashback.saldo_cashback) + absVal).toFixed(2)),
                total_utilizado: Number(Math.max(0, Number(cashback.total_utilizado) - absVal).toFixed(2)),
                updated_at: new Date().toISOString(),
              })
              .eq("id", cashback.id);
          }
        }
      }

      // Recalcular VIP do cliente
      await recalcularVIPCliente(clienteId, profile.loja_id);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Erro ao estornar fidelidade da venda:", err);
    return { success: false, error: err.message };
  }
}

// ============================================
// 7. RANKING E METRICAS (DASHBOARD)
// ============================================

export async function getClientesFidelidadeRanking(sortBy: "total_gasto" | "total_compras" | "ticket_medio" = "total_gasto") {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    const { data: statsList, error } = await supabase
      .from("cliente_loja_stats")
      .select(`
        cliente_id,
        total_compras,
        total_gasto,
        nivel_vip,
        ultima_compra,
        clientes:clientes(nome, email, telefone)
      `)
      .eq("loja_id", profile.loja_id)
      .order("total_gasto", { ascending: false });

    if (error) throw error;

    // Calcular ticket médio localmente
    const ranking = (statsList || []).map((s: any) => {
      const totalGasto = Number(s.total_gasto || 0);
      const totalCompras = Number(s.total_compras || 0);
      const ticketMedio = totalCompras > 0 ? Number((totalGasto / totalCompras).toFixed(2)) : 0;

      return {
        id: s.cliente_id,
        nome: s.clientes?.nome || 'Cliente Compartilhado',
        email: s.clientes?.email || '',
        telefone: s.clientes?.telefone || '',
        total_compras: totalCompras,
        total_gasto: totalGasto,
        nivel_vip: s.nivel_vip || 'Bronze',
        ultima_compra: s.ultima_compra,
        ticket_medio: ticketMedio,
      };
    });

    // Re-ordenar caso selecionado outro critério
    if (sortBy === "total_compras") {
      ranking.sort((a, b) => b.total_compras - a.total_compras);
    } else if (sortBy === "ticket_medio") {
      ranking.sort((a, b) => b.ticket_medio - a.ticket_medio);
    }

    return { data: ranking, error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function getFidelidadeKPIs() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Clientes participantes (que possuem pontos ou cashback cadastrados na filial)
    const { count: totalClientes } = await supabase
      .from("cliente_loja_stats")
      .select("cliente_id", { count: "exact", head: true })
      .eq("loja_id", profile.loja_id);

    // 2. Pontos Emitidos e Resgatados
    const { data: pontosSum } = await supabase
      .from("cliente_pontos")
      .select("total_pontos_acumulados, total_pontos_resgatados")
      .eq("loja_id", profile.loja_id);

    const pontosEmitidos = pontosSum ? pontosSum.reduce((acc, p) => acc + p.total_pontos_acumulados, 0) : 0;
    const pontosResgatados = pontosSum ? pontosSum.reduce((acc, p) => acc + p.total_pontos_resgatados, 0) : 0;

    // 3. Cashback Gerado e Utilizado
    const { data: cashbackSum } = await supabase
      .from("cliente_cashback")
      .select("total_gerado, total_utilizado")
      .eq("loja_id", profile.loja_id);

    const cashbackGerado = cashbackSum ? cashbackSum.reduce((acc, c) => acc + Number(c.total_gerado), 0) : 0;
    const cashbackUtilizado = cashbackSum ? cashbackSum.reduce((acc, c) => acc + Number(c.total_utilizado), 0) : 0;

    // 4. Contagem de VIPs na filial
    const { data: vipCount } = await supabase
      .from("cliente_loja_stats")
      .select("nivel_vip")
      .eq("loja_id", profile.loja_id);

    const clientesVIP = vipCount ? vipCount.filter(c => c.nivel_vip && c.nivel_vip !== "Bronze").length : 0;

    // 5. Clientes inativos na filial (sem compras há mais de 60 dias)
    const data60Dias = new Date();
    data60Dias.setDate(data60Dias.getDate() - 60);
    const data60DiasStr = data60Dias.toISOString();

    const { count: inativosCount } = await supabase
      .from("cliente_loja_stats")
      .select("cliente_id", { count: "exact", head: true })
      .eq("loja_id", profile.loja_id)
      .lt("ultima_compra", data60DiasStr);

    const clientesInativos = inativosCount || 0;

    // 6. Taxa de retenção na filial (clientes com > 1 compra na filial / total clientes)
    const { count: recorrentesCount } = await supabase
      .from("cliente_loja_stats")
      .select("cliente_id", { count: "exact", head: true })
      .eq("loja_id", profile.loja_id)
      .gt("total_compras", 1);

    const taxaRetencao = totalClientes && totalClientes > 0 
      ? Number((((recorrentesCount || 0) / totalClientes) * 100).toFixed(1))
      : 0;

    return {
      data: {
        participantes: totalClientes || 0,
        pontosEmitidos,
        pontosResgatados,
        cashbackGerado,
        cashbackUtilizado,
        clientesVIP,
        clientesInativos,
        taxaRetencao,
      },
      error: null,
    };
  } catch (err: any) {
    console.error("Erro ao obter KPIs de fidelidade:", err);
    return { data: null, error: err.message };
  }
}

// ============================================
// 8. CENTRAL DE RECUPERAÇÃO E INSIGHTS LOCAIS
// ============================================

export async function getClientesInativosRecuperacao() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Obter todos os clientes da loja através do cliente_loja_stats
    const { data: statsList } = await supabase
      .from("cliente_loja_stats")
      .select(`
        cliente_id,
        total_compras,
        total_gasto,
        nivel_vip,
        ultima_compra,
        clientes:clientes(nome, email, telefone, whatsapp)
      `)
      .eq("loja_id", profile.loja_id)
      .order("ultima_compra", { ascending: true });

    if (!statsList) return { data: { perdidos: [], emRisco: [], vipSemCompra: [], cashbackParado: [] }, error: null };

    // Map stats list to look identical to expected client object
    const clientes = statsList.map((s: any) => ({
      id: s.cliente_id,
      nome: s.clientes?.nome || 'Cliente Compartilhado',
      email: s.clientes?.email || '',
      telefone: s.clientes?.telefone || '',
      whatsapp: s.clientes?.whatsapp || '',
      total_compras: s.total_compras,
      total_gasto: Number(s.total_gasto),
      nivel_vip: s.nivel_vip || 'Bronze',
      ultima_compra: s.ultima_compra
    }));

    const hoje = new Date();
    const trintaDias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sessentaDias = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);
    const noventaDias = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);

    const perdidos: any[] = [];
    const emRisco: any[] = [];
    const vipSemCompra: any[] = [];
    const cashbackParado: any[] = [];

    // Obter saldos de cashback
    const { data: cashbackSaldos } = await supabase
      .from("cliente_cashback")
      .select("cliente_id, saldo_cashback")
      .eq("loja_id", profile.loja_id);

    const cashMap = new Map<string, number>();
    if (cashbackSaldos) {
      cashbackSaldos.forEach(c => cashMap.set(c.cliente_id, Number(c.saldo_cashback)));
    }

    for (const c of clientes) {
      const ultCompra = c.ultima_compra ? new Date(c.ultima_compra) : null;
      const saldoCash = cashMap.get(c.id) || 0;

      // A. Clientes com Cashback Parado (saldo > R$ 10 e última compra há mais de 15 dias)
      if (saldoCash >= 10 && (!ultCompra || ultCompra < new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000))) {
        cashbackParado.push({ ...c, saldo_cashback: saldoCash });
      }

      if (!ultCompra) continue;

      // B. Clientes Perdidos (sem compras > 90 dias)
      if (ultCompra < noventaDias) {
        perdidos.push(c);
      }
      // C. Clientes em Risco (sem compras entre 60 e 90 dias)
      else if (ultCompra < sessentaDias) {
        emRisco.push(c);
      }

      // D. VIP sem compra recente (VIP/Ouro/Diamante sem comprar há mais de 30 dias)
      if (c.nivel_vip !== "Bronze" && ultCompra < trintaDias) {
        vipSemCompra.push(c);
      }
    }

    return {
      data: {
        perdidos,
        emRisco,
        vipSemCompra,
        cashbackParado,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getInsightsFidelidade() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    const insights: string[] = [];

    // 1. Insight: VIPs inativos na filial
    const data30Dias = new Date();
    data30Dias.setDate(data30Dias.getDate() - 30);
    const { data: vipsInativos } = await supabase
      .from("cliente_loja_stats")
      .select(`
        nivel_vip,
        clientes:clientes(nome)
      `)
      .eq("loja_id", profile.loja_id)
      .neq("nivel_vip", "Bronze")
      .lt("ultima_compra", data30Dias.toISOString())
      .limit(2);

    if (vipsInativos && vipsInativos.length > 0) {
      vipsInativos.forEach((v: any) => {
        const nome = v.clientes?.nome || 'Cliente VIP';
        insights.push(`💡 O cliente VIP (${v.nivel_vip}) **${nome}** não compra há mais de 30 dias. Considere enviar um cupom de incentivo.`);
      });
    }

    // 2. Insight: Clientes próximos de subir de nível VIP na filial
    const { data: config } = await supabase
      .from("configuracoes_loja")
      .select("fidelidade_vip_prata_min_gasto, fidelidade_vip_ouro_min_gasto")
      .eq("loja_id", profile.loja_id)
      .single();

    if (config) {
      const prataMin = Number(config.fidelidade_vip_prata_min_gasto || 1500);
      
      // Buscar clientes Bronze com gasto na filial nos últimos 365 dias próximo ao limite Prata (entre 80% e 99% do limite)
      const data365 = new Date();
      data365.setDate(data365.getDate() - 365);
      
      const { data: bronzes } = await supabase
        .from("cliente_loja_stats")
        .select(`
          cliente_id,
          total_gasto,
          clientes:clientes(nome)
        `)
        .eq("loja_id", profile.loja_id)
        .eq("nivel_vip", "Bronze")
        .gte("total_gasto", prataMin * 0.8)
        .lt("total_gasto", prataMin)
        .limit(2);

      if (bronzes && bronzes.length > 0) {
        bronzes.forEach((b: any) => {
          const nome = b.clientes?.nome || 'Cliente';
          const falta = prataMin - Number(b.total_gasto);
          insights.push(`💡 O cliente **${nome}** está a apenas R$ ${falta.toFixed(2)} de atingir a faixa VIP Prata!`);
        });
      }
    }

    // 3. Insight: Alto saldo de cashback parado na filial
    const { data: cashbacks } = await supabase
      .from("cliente_cashback")
      .select("cliente_id, saldo_cashback, clientes(nome)")
      .eq("loja_id", profile.loja_id)
      .gt("saldo_cashback", 50)
      .limit(2);

    if (cashbacks && cashbacks.length > 0) {
      cashbacks.forEach((c: any) => {
        if (c.clientes) {
          insights.push(`💡 O cliente **${c.clientes.nome}** possui R$ ${Number(c.saldo_cashback).toFixed(2)} em cashback acumulado parado. Que tal lembrá-lo?`);
        }
      });
    }

    // Fallback se não houver insights dinâmicos
    if (insights.length === 0) {
      insights.push("💡 O programa de fidelidade está saudável! Monitore as campanhas ativas para atrair mais clientes.");
      insights.push("💡 Dica: Crie uma campanha de Pontos em Dobro nos dias de menor movimento da semana para aumentar as vendas.");
    }

    return { data: insights, error: null };
  } catch (err: any) {
    return { data: ["💡 Erro ao calcular insights locais de fidelidade."], error: err.message };
  }
}
