"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Interface das configurações da loja
export interface ConfiguracoesLojaInfo {
  id?: string;
  loja_id: string;
  permitir_estoque_negativo: boolean;
  exigir_cpf_venda: boolean;
  permitir_desconto_caixa: boolean;
  desconto_maximo_percentual: number;
  mensagem_comprovante: string | null;
  fuso_horario: string | null;
  moeda: string | null;
}

// Interface dos dados cadastrais da loja
export interface DadosLojaInfo {
  id: string;
  nome_loja: string;
  slug: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  endereco: Record<string, any>;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  tipo_unidade: string;
}

// ============================================
// OBTER DADOS CADASTRAIS DA LOJA
// ============================================
export async function getDadosLoja(): Promise<{
  data: DadosLojaInfo | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Usuário não autenticado." };
    }

    const { data: profile } = await supabase
      .from("usuarios")
      .select("loja_id")
      .eq("id", user.id)
      .single();

    if (!profile?.loja_id) {
      return { data: null, error: "Loja ativa não associada ao usuário." };
    }

    const { data: loja, error } = await supabase
      .from("lojas")
      .select("*")
      .eq("id", profile.loja_id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: loja as DadosLojaInfo, error: null };
  } catch (error: any) {
    console.error("Erro em getDadosLoja:", error);
    return { data: null, error: error.message || "Erro interno." };
  }
}

// ============================================
// ATUALIZAR DADOS CADASTRAIS DA LOJA
// ============================================
export async function updateDadosLoja(input: Partial<DadosLojaInfo>): Promise<{
  data: DadosLojaInfo | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Usuário não autenticado." };
    }

    const { data: profile } = await supabase
      .from("usuarios")
      .select("loja_id, tipo")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.tipo !== "dono" && profile.tipo !== "gerente")) {
      return { data: null, error: "Apenas o dono ou gerente podem alterar dados cadastrais." };
    }

    const { data: updatedLoja, error } = await supabase
      .from("lojas")
      .update({
        nome_loja: input.nome_loja,
        razao_social: input.razao_social,
        cnpj: input.cnpj,
        telefone: input.telefone,
        whatsapp: input.whatsapp,
        email: input.email,
        logo_url: input.logo_url,
        endereco: input.endereco || {},
        cor_primaria: input.cor_primaria || "#6366f1",
        cor_secundaria: input.cor_secundaria || "#818cf8",
      })
      .eq("id", profile.loja_id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath("/dashboard/configuracoes");
    return { data: updatedLoja as DadosLojaInfo, error: null };
  } catch (error: any) {
    console.error("Erro em updateDadosLoja:", error);
    return { data: null, error: error.message || "Erro interno." };
  }
}

// ============================================
// OBTER CONFIGURAÇÕES OPERACIONAIS DA LOJA
// ============================================
export async function getConfiguracoesLoja(): Promise<{
  data: ConfiguracoesLojaInfo | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Usuário não autenticado." };
    }

    const { data: profile } = await supabase
      .from("usuarios")
      .select("loja_id")
      .eq("id", user.id)
      .single();

    if (!profile?.loja_id) {
      return { data: null, error: "Loja ativa não associada ao usuário." };
    }

    // Tentar obter a configuração existente
    let { data: config, error } = await supabase
      .from("configuracoes_loja")
      .select("*")
      .eq("loja_id", profile.loja_id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    // Se não existir, criar uma configuração inicial com valores padrão
    if (!config) {
      const { data: newConfig, error: insertError } = await supabase
        .from("configuracoes_loja")
        .insert({
          loja_id: profile.loja_id,
          permitir_estoque_negativo: true,
          exigir_cpf_venda: false,
          permitir_desconto_caixa: true,
          desconto_maximo_percentual: 20.00,
          mensagem_comprovante: "Obrigado pela preferência! Volte sempre.",
          fuso_horario: "America/Sao_Paulo",
          moeda: "BRL"
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError.message };
      }
      config = newConfig;
    }

    return { data: config as ConfiguracoesLojaInfo, error: null };
  } catch (error: any) {
    console.error("Erro em getConfiguracoesLoja:", error);
    return { data: null, error: error.message || "Erro interno." };
  }
}

// ============================================
// ATUALIZAR CONFIGURAÇÕES OPERACIONAIS DA LOJA
// ============================================
export async function updateConfiguracoesLoja(input: Partial<ConfiguracoesLojaInfo>): Promise<{
  data: ConfiguracoesLojaInfo | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Usuário não autenticado." };
    }

    const { data: profile } = await supabase
      .from("usuarios")
      .select("loja_id, tipo")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { data: null, error: "Perfil não encontrado." };
    }

    if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
      return { data: null, error: "Apenas dono ou gerente podem alterar configurações operacionais." };
    }

    const { data: updatedConfig, error } = await supabase
      .from("configuracoes_loja")
      .update({
        permitir_estoque_negativo: input.permitir_estoque_negativo,
        exigir_cpf_venda: input.exigir_cpf_venda,
        permitir_desconto_caixa: input.permitir_desconto_caixa,
        desconto_maximo_percentual: input.desconto_maximo_percentual,
        mensagem_comprovante: input.mensagem_comprovante,
        fuso_horario: input.fuso_horario,
        moeda: input.moeda
      })
      .eq("loja_id", profile.loja_id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath("/dashboard/configuracoes");
    return { data: updatedConfig as ConfiguracoesLojaInfo, error: null };
  } catch (error: any) {
    console.error("Erro em updateConfiguracoesLoja:", error);
    return { data: null, error: error.message || "Erro interno." };
  }
}
