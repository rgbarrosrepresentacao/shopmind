import FidelidadePageClient from "@/components/fidelidade/fidelidade-page-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ShopMind — Fidelidade Inteligente & Cashback",
  description: "Gerenciador de campanhas de fidelidade, catálogo de recompensas, controle de cashback e ranking de clientes.",
};

export default async function FidelidadePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Caixa NÃO possui acesso ao painel administrativo de fidelidade
  if (profile.tipo === "caixa") {
    redirect("/dashboard");
  }

  return <FidelidadePageClient userTipo={profile.tipo} />;
}
