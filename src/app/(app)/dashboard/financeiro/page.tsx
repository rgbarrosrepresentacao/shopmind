import FinanceiroPageClient from "@/components/financeiro/financeiro-page-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ShopMind — Financeiro Inteligente",
  description: "Demonstrativo DRE, fluxo de caixa projetado, controle de inadimplência e contas a pagar e receber.",
};

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Caixa e Estoquista NÃO possuem acesso ao módulo financeiro
  if (profile.tipo === "caixa" || profile.tipo === "estoquista") {
    redirect("/dashboard");
  }

  return <FinanceiroPageClient userTipo={profile.tipo} />;
}
