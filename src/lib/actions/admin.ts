"use server";

import { createClient } from "@/lib/supabase/server";

export interface GlobalAdminKPIs {
  total_queries: number;
  total_cached: number;
  total_success: number;
  total_blocked: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface GlobalStoreUsage {
  nome_loja: string;
  slug: string;
  mes: number;
  ano: number;
  consultas_utilizadas: number;
  consultas_totais: number;
  limite_diario: number;
  tokens_total: number;
  custo_estimado: number;
}

export interface GlobalRecentLog {
  id: string;
  nome_loja: string;
  usuario_nome: string | null;
  tipo: string | null;
  pergunta: string;
  resposta: string;
  modelo: string;
  tokens_total: number;
  custo_estimado: number;
  is_cached: boolean;
  status: string;
  created_at: string;
}

export interface GlobalRecentPurchase {
  id: string;
  nome_loja: string;
  pacote_nome: string | null;
  quantidade: number;
  valor: number;
  status: string;
  created_at: string;
}

export interface GlobalAdminData {
  global_kpis: GlobalAdminKPIs;
  stores_usage: GlobalStoreUsage[];
  recent_logs: GlobalRecentLog[];
  recent_purchases: GlobalRecentPurchase[];
}

/**
 * Puxa todos os dados do painel administrativo global do ShopMind.
 * Apenas acessível para a conta datacentershope@gmail.com.
 */
export async function getGlobalAdminData(): Promise<{ data: GlobalAdminData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // 1. Validar autenticação e e-mail
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { data: profile } = await supabase
      .from("usuarios")
      .select("email, tipo")
      .eq("id", user.id)
      .single();

    if (!profile || profile.email !== "datacentershope@gmail.com") {
      throw new Error("Acesso negado. Apenas o administrador global do ShopMind possui acesso a este painel.");
    }

    // 2. Chamar a RPC segura que ignora RLS para o administrador
    const { data, error } = await supabase.rpc("get_global_admin_data");

    if (error) {
      console.error("Erro ao executar RPC get_global_admin_data:", error);
      return { data: null, error: error.message };
    }

    return { data: data as GlobalAdminData, error: null };
  } catch (err: any) {
    console.error("Erro na Server Action de administração:", err);
    return { data: null, error: err.message };
  }
}
