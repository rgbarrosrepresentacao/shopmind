import ComprasPageClient from '@/components/compras/compras-page-client';
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: 'ShopMind — Compras Inteligentes',
  description: 'Gerencie compras, fornecedores, custos e reposição inteligente de estoque.',
};

export default async function ComprasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userTipo = "caixa";
  
  if (user) {
    const { data: profile } = await supabase
      .from("usuarios")
      .select("tipo")
      .eq("id", user.id)
      .single();
    if (profile) {
      userTipo = profile.tipo;
    }
  }

  return <ComprasPageClient userTipo={userTipo} />;
}
