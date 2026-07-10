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
// 1. GESTÃO DE CONFIGURAÇÕES FISCAIS
// ============================================

export async function getFiscalConfig() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Buscar se já existe configuração cadastrada
    const { data, error } = await supabase
      .from("configuracoes_fiscais")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return { data, error: null };
    }

    // 2. Se não existir, obter nome da loja para inicializar dados básicos
    const { data: store } = await supabase
      .from("lojas")
      .select("nome_loja")
      .eq("id", profile.loja_id)
      .single();

    const nomeLoja = store?.nome_loja || "Minha Empresa";

    const defaultConfig = {
      loja_id: profile.loja_id,
      razao_social: `${nomeLoja} LTDA`,
      nome_fantasia: nomeLoja,
      cnpj: "00.000.000/0001-00",
      inscricao_estadual: "Isento",
      inscricao_municipal: "",
      endereco: "Rua do Comércio, 100",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01001-000",
      telefone: "(11) 99999-9999",
      email: "contato@shopmind.com.br",
      site: "",
      logo_url: "",
      serie_padrao: "1",
      ambiente: "homologacao",
      modo_documento: "nao_fiscal",
      formato_numero: "prefixado",
      proximo_numero_recibo: 1,
      proximo_numero_pedido: 1,
      proximo_numero_orcamento: 1,
      proximo_numero_comprovante: 1,
      proximo_numero_venda: 1,
      proximo_numero_devolucao: 1,
      proximo_numero_cupom: 1,
      mensagem_rodape: "Obrigado pela preferência! Volte sempre.",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("configuracoes_fiscais")
      .insert(defaultConfig)
      .select()
      .single();

    if (insertError) throw insertError;

    return { data: inserted, error: null };
  } catch (err: any) {
    console.error("Erro ao obter config fiscal:", err);
    return { data: null, error: err.message };
  }
}

export async function salvarFiscalConfig(config: {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone?: string;
  email?: string;
  site?: string;
  logo_url?: string;
  serie_padrao: string;
  ambiente: "homologacao" | "producao";
  modo_documento: "nao_fiscal" | "nfc_e";
  formato_numero: "prefixado" | "simples";
  proximo_numero_recibo: number;
  proximo_numero_pedido: number;
  proximo_numero_orcamento: number;
  proximo_numero_comprovante: number;
  proximo_numero_venda: number;
  proximo_numero_devolucao: number;
  proximo_numero_cupom: number;
  mensagem_rodape?: string;
}) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Validação RBAC: Apenas Dono e Gerente alteram configurações
    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { success: false, error: "Permissão negada. Apenas administradores podem alterar configurações fiscais." };
    }

    const { error } = await supabase
      .from("configuracoes_fiscais")
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq("loja_id", profile.loja_id);

    if (error) throw error;

    // Registrar log de atividade global
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "ajuste",
      entidade: "configuracoes_fiscais",
      dados_novos: { ...config, msg: "Configurações fiscais atualizadas." },
    });

    revalidatePath("/dashboard/fiscal");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Erro ao salvar config fiscal:", err);
    return { success: false, error: err.message };
  }
}

// ============================================
// 2. EMISSÃO TRANSAÇÃO E NUMERAÇÃO AUTOMÁTICA
// ============================================

export async function gerarDocumentoFiscal(payload: {
  tipo_documento: "recibo" | "pedido" | "orcamento" | "comprovante" | "venda" | "devolucao" | "cupom";
  venda_id?: string | null;
  cliente_id?: string | null;
  valor_total: number;
}) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();
    const lojaId = profile.loja_id;

    // Obter e travar a configuração fiscal
    const { data: config, error: configError } = await supabase
      .from("configuracoes_fiscais")
      .select("*")
      .eq("loja_id", lojaId)
      .single();

    if (configError || !config) {
      throw new Error("Configurações fiscais da loja não encontradas para emissão.");
    }

    // Identificar a numeração sequencial baseada no tipo de documento
    let proximoNumero = 1;
    let updateField = "";

    switch (payload.tipo_documento) {
      case "recibo":
        proximoNumero = config.proximo_numero_recibo || 1;
        updateField = "proximo_numero_recibo";
        break;
      case "pedido":
        proximoNumero = config.proximo_numero_pedido || 1;
        updateField = "proximo_numero_pedido";
        break;
      case "orcamento":
        proximoNumero = config.proximo_numero_orcamento || 1;
        updateField = "proximo_numero_orcamento";
        break;
      case "comprovante":
        proximoNumero = config.proximo_numero_comprovante || 1;
        updateField = "proximo_numero_comprovante";
        break;
      case "venda":
        proximoNumero = config.proximo_numero_venda || 1;
        updateField = "proximo_numero_venda";
        break;
      case "devolucao":
        proximoNumero = config.proximo_numero_devolucao || 1;
        updateField = "proximo_numero_devolucao";
        break;
      case "cupom":
        proximoNumero = config.proximo_numero_cupom || 1;
        updateField = "proximo_numero_cupom";
        break;
    }

    // Formatar número final
    let numeroFormatado = "";
    const sequencialStr = String(proximoNumero).padStart(6, "0");

    if (config.formato_numero === "prefixado") {
      let prefix = "";
      switch (payload.tipo_documento) {
        case "recibo": prefix = "REC"; break;
        case "pedido": prefix = "PED"; break;
        case "orcamento": prefix = "ORC"; break;
        case "comprovante": prefix = "CPV"; break;
        case "venda": prefix = "VND"; break;
        case "devolucao": prefix = "DEV"; break;
        case "cupom": prefix = "CUP"; break;
      }
      numeroFormatado = `${prefix}-${sequencialStr}`;
    } else {
      numeroFormatado = sequencialStr;
    }

    // Gravar o documento comercial
    const docPayload = {
      loja_id: lojaId,
      tipo_documento: payload.tipo_documento,
      numero: numeroFormatado,
      numero_sequencial: proximoNumero,
      serie: config.serie_padrao || "1",
      cliente_id: payload.cliente_id || null,
      venda_id: payload.venda_id || null,
      valor_total: payload.valor_total,
      status: "emitido" as const,
      usuario_id: user.id,
      emitido_em: new Date().toISOString(),
      
      // Campos reservados para futura NFC-e permanecem nulos nesta fase
      xml: null,
      chave_acesso: null,
      protocolo: null,
      ambiente_fiscal: config.ambiente,
      status_sefaz: null,
      danfe_url: null,
    };

    const { data: doc, error: docError } = await supabase
      .from("documentos_fiscais")
      .insert(docPayload)
      .select()
      .single();

    if (docError) {
      console.error("Erro de colisão de numeração fiscal, tentando incrementar:", docError);
      throw docError;
    }

    // Incrementar sequencial nas configurações fiscais
    await supabase
      .from("configuracoes_fiscais")
      .update({
        [updateField]: proximoNumero + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("loja_id", lojaId);

    // Gravar no histórico do documento
    await supabase.from("historico_documentos").insert({
      loja_id: lojaId,
      documento_id: doc.id,
      acao: "emissao",
      usuario_id: user.id,
      detalhes: `Documento emitido pelo operador ${profile.nome} com numeração ${numeroFormatado}.`,
    });

    // Gravar no log geral de auditoria de atividades
    await supabase.from("logs_atividade").insert({
      loja_id: lojaId,
      usuario_id: user.id,
      acao: "criar",
      entidade: "documentos_fiscais",
      entidade_id: doc.id,
      dados_novos: { tipo: payload.tipo_documento, numero: numeroFormatado, total: payload.valor_total },
    });

    revalidatePath("/dashboard/fiscal");
    return { data: doc, error: null };
  } catch (err: any) {
    console.error("Erro ao gerar documento comercial:", err);
    return { data: null, error: err.message };
  }
}

// ============================================
// 3. CANCELAMENTO DE DOCUMENTO COM AUDITORIA
// ============================================

export async function cancelarDocumentoFiscal(documentoId: string, motivo: string) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    // Validação RBAC: Apenas Dono e Gerente cancelam documentos
    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { success: false, error: "Apenas Dono e Gerente possuem permissão para cancelar documentos comerciais." };
    }

    if (!motivo || motivo.trim().length < 5) {
      return { success: false, error: "Informe um motivo de cancelamento claro com pelo menos 5 caracteres." };
    }

    // Buscar documento
    const { data: doc, error: fetchErr } = await supabase
      .from("documentos_fiscais")
      .select("id, numero, status")
      .eq("id", documentoId)
      .eq("loja_id", profile.loja_id)
      .single();

    if (fetchErr || !doc) {
      return { success: false, error: "Documento comercial não encontrado." };
    }

    if (doc.status === "cancelado") {
      return { success: false, error: "Este documento já foi cancelado." };
    }

    // Atualizar status para cancelado
    const { error: updateErr } = await supabase
      .from("documentos_fiscais")
      .update({
        status: "cancelado",
        cancelado_em: new Date().toISOString(),
        motivo_cancelamento: motivo.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentoId)
      .eq("loja_id", profile.loja_id);

    if (updateErr) throw updateErr;

    // Registrar ação no histórico do documento
    await supabase.from("historico_documentos").insert({
      loja_id: profile.loja_id,
      documento_id: documentoId,
      acao: "cancelamento",
      usuario_id: user.id,
      detalhes: `Documento cancelado pelo administrador ${profile.nome}. Motivo: ${motivo.trim()}`,
    });

    // Registrar log na auditoria global de logs_atividade
    await supabase.from("logs_atividade").insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: "deletar",
      entidade: "documentos_fiscais",
      entidade_id: documentoId,
      dados_novos: { numero: doc.numero, motivo: motivo.trim(), responsavel: profile.nome },
    });

    revalidatePath("/dashboard/fiscal");
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Erro ao cancelar documento:", err);
    return { success: false, error: err.message };
  }
}

// ============================================
// 4. REGISTRO DE TRILHA DE AUDITORIA (HISTÓRICO)
// ============================================

export async function registrarHistoricoDocumento(
  documentoId: string,
  acao: "reimpressao" | "visualizacao" | "download",
  detalhes?: string
) {
  try {
    const supabase = await createClient();
    const { user, profile } = await getProfileAndUser();

    await supabase.from("historico_documentos").insert({
      loja_id: profile.loja_id,
      documento_id: documentoId,
      acao,
      usuario_id: user.id,
      detalhes: detalhes || `Documento operacional de ${acao} executado pelo usuário ${profile.nome}.`,
    });

    // Registrar na auditoria global se for uma reimpressão ou download crítico
    if (acao === "reimpressao" || acao === "download") {
      await supabase.from("logs_atividade").insert({
        loja_id: profile.loja_id,
        usuario_id: user.id,
        acao: acao === "reimpressao" ? "ajuste" : "consulta",
        entidade: "documentos_fiscais",
        entidade_id: documentoId,
        dados_novos: { acao, operador: profile.nome },
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Erro ao gravar log de histórico de documento:", err);
    return { success: false };
  }
}

// ============================================
// 5. CONSULTAS E MÉTODOS DE HISTÓRICO E RELATÓRIOS
// ============================================

export async function getDocumentosFiscaisList(filtros?: {
  tipo_documento?: string;
  status?: string;
  usuario_id?: string;
  cliente_id?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    let query = supabase
      .from("documentos_fiscais")
      .select(`
        *,
        clientes(nome, cpf),
        usuarios(nome),
        vendas(subtotal, desconto, troco, forma_pagamento, venda_itens(produto_nome, quantidade, preco_unitario, desconto, total))
      `)
      .eq("loja_id", profile.loja_id);

    if (filtros) {
      if (filtros.tipo_documento && filtros.tipo_documento !== "todos") {
        query = query.eq("tipo_documento", filtros.tipo_documento);
      }
      if (filtros.status && filtros.status !== "todos") {
        query = query.eq("status", filtros.status);
      }
      if (filtros.usuario_id && filtros.usuario_id !== "todos") {
        query = query.eq("usuario_id", filtros.usuario_id);
      }
      if (filtros.cliente_id && filtros.cliente_id !== "todos") {
        query = query.eq("cliente_id", filtros.cliente_id);
      }
      if (filtros.data_inicio) {
        query = query.gte("emitido_em", filtros.data_inicio);
      }
      if (filtros.data_fim) {
        query = query.lte("emitido_em", filtros.data_fim);
      }
    }

    const { data, error } = await query.order("emitido_em", { ascending: false });
    if (error) throw error;

    return { data: data || [], error: null };
  } catch (err: any) {
    console.error("Erro ao listar documentos fiscais:", err);
    return { data: [], error: err.message };
  }
}

export async function getOperadoresList() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome")
      .eq("loja_id", profile.loja_id)
      .order("nome", { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function getDocumentoFichaCompleta(documentoId: string) {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();

    // 1. Carregar documento com dados de cliente e venda
    const { data: doc, error: docError } = await supabase
      .from("documentos_fiscais")
      .select(`
        *,
        clientes(*),
        usuarios(nome),
        vendas(
          id, subtotal, desconto, total, troco, forma_pagamento, detalhe_pagamento, created_at,
          venda_itens(
            id, produto_id, produto_nome, quantidade, preco_unitario, desconto, total
          )
        )
      `)
      .eq("id", documentoId)
      .eq("loja_id", profile.loja_id)
      .single();

    if (docError) throw docError;

    // 2. Buscar histórico do documento
    const { data: historico } = await supabase
      .from("historico_documentos")
      .select(`
        *,
        usuarios(nome)
      `)
      .eq("documento_id", documentoId)
      .order("created_at", { ascending: true });

    return { data: { ...doc, historico: historico || [] }, error: null };
  } catch (err: any) {
    console.error("Erro ao obter ficha de documento:", err);
    return { data: null, error: err.message };
  }
}

export async function getFiscalKPIs() {
  try {
    const supabase = await createClient();
    const { profile } = await getProfileAndUser();
    const lojaId = profile.loja_id;

    // KPIs de emissões gerais
    const { data: docs } = await supabase
      .from("documentos_fiscais")
      .select("status, valor_total")
      .eq("loja_id", lojaId);

    const docList = docs || [];

    const emitidos = docList.filter(d => d.status !== "cancelado").length;
    const cancelados = docList.filter(d => d.status === "cancelado").length;
    
    const faturamentoComercial = docList
      .filter(d => d.status !== "cancelado")
      .reduce((acc, d) => acc + Number(d.valor_total), 0);

    // Buscar reimpressões no histórico
    const { count: totalReimpresso } = await supabase
      .from("historico_documentos")
      .select("id", { count: "exact", head: true })
      .eq("loja_id", lojaId)
      .eq("acao", "reimpressao");

    return {
      data: {
        emitidos,
        cancelados,
        faturamentoComercial,
        reimpresso: totalReimpresso || 0,
      },
      error: null,
    };
  } catch (err: any) {
    console.error("Erro ao calcular KPIs fiscais:", err);
    return { data: null, error: err.message };
  }
}
