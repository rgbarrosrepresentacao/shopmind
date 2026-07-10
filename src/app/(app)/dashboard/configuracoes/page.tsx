import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConfiguracoesPageClient } from "@/components/configuracoes/configuracoes-page-client";

export const metadata = {
  title: "ShopMind — Configurações da Loja",
  description: "Gerencie dados cadastrais, identidade visual e parâmetros operacionais do sistema.",
};

export default async function ConfiguracoesDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Colaboradores que não são Dono ou Gerente não podem alterar configurações
  if (profile.tipo !== "dono" && profile.tipo !== "gerente") {
    redirect("/dashboard");
  }

  return <ConfiguracoesPageClient userTipo={profile.tipo} />;
}
