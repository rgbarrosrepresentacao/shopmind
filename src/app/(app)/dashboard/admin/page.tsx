import AdminPageClient from "@/components/admin/admin-page-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ShopMind — Painel de Controle Global",
  description: "Monitoramento administrativo interno de consumo de IA, faturamento e créditos contábeis de todos os lojistas.",
};

export default async function AdminPage() {
  const supabase = await createClient();
  
  // 1. Validar autenticação do usuário
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Validar perfil e e-mail do administrador global
  const { data: profile } = await supabase
    .from("usuarios")
    .select("email, tipo")
    .eq("id", user.id)
    .single();

  if (!profile || profile.email !== "datacentershope@gmail.com") {
    redirect("/dashboard");
  }

  return <AdminPageClient />;
}
