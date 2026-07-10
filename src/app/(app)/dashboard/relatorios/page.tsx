import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RelatoriosPageClient } from "@/components/relatorios/relatorios-page-client";

export const metadata = {
  title: "ShopMind — Relatórios e DRE Financeiro",
  description: "Auditoria de faturamento, ticket médio, margens de lucro e demonstrativo de resultado simplificado (DRE).",
};

export default async function RelatoriosDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Caixas e vendedores não possuem acesso aos relatórios consolidados e DRE
  if (profile.tipo === "caixa" || profile.tipo === "vendedor") {
    redirect("/dashboard");
  }

  return <RelatoriosPageClient userTipo={profile.tipo} />;
}
