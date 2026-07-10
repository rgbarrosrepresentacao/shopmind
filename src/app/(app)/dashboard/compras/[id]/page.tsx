import CompraDetailClient from '@/components/compras/compra-detail-client';
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: 'ShopMind — Detalhes da Compra',
  description: 'Visualize os detalhes da compra, itens, custos e movimentações de estoque.',
};

export default async function CompraDetalhePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
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

  return <CompraDetailClient compraId={id} userTipo={userTipo} />;
}
