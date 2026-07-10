import FornecedorDetailClient from "@/components/fornecedores/fornecedor-detail-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ShopMind — Perfil do Fornecedor",
  description: "Histórico completo, produtos fornecidos, custos e score de relacionamento.",
};

export default async function FornecedorDetalhePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
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

  return <FornecedorDetailClient fornecedorId={id} userTipo={profile.tipo} />;
}
