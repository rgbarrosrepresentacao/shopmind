import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FiscalPageClient } from "@/components/fiscal/fiscal-page-client";

export const metadata = {
  title: "ShopMind — Módulo Fiscal & Documentos",
  description: "Gerenciamento e auditoria de recibos, pedidos, orçamentos e comprovantes comerciais.",
};

export default async function FiscalDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Caixas NÃO possuem acesso ao painel de administração fiscal
  if (profile.tipo === "caixa") {
    redirect("/dashboard");
  }

  return <FiscalPageClient userTipo={profile.tipo} />;
}
