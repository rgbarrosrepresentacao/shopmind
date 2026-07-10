import IAPageClient from "@/components/ia/ia-page-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ShopMind — IA Gerente",
  description: "Diagnósticos em tempo real, análises preditivas sob demanda e controle de cotas de IA.",
};

export default async function IAPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // O Caixa NÃO possui acesso ao módulo de IA Gerente
  if (profile.tipo === "caixa") {
    redirect("/dashboard");
  }

  return <IAPageClient userTipo={profile.tipo} />;
}
