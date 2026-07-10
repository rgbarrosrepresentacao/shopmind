import FornecedoresPageClient from "@/components/fornecedores/fornecedores-page-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ShopMind — Fornecedores Inteligentes",
  description: "Análise comercial, histórico de compras e custos de fornecedores.",
};

export default async function FornecedoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Caixa has no access to the supplier module
  if (profile.tipo === "caixa") {
    redirect("/dashboard");
  }

  return <FornecedoresPageClient userTipo={profile.tipo} />;
}
