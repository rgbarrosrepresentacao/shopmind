import { Metadata } from "next";
import { listCategories } from "@/lib/actions/categories";
import { getLojasDoUsuario } from "@/lib/actions/multilojas";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/produtos/product-form";

export const metadata: Metadata = {
  title: "ShopMind — Novo Produto",
  description: "Cadastrar um novo produto no catálogo.",
};

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('usuarios')
    .select('tipo')
    .eq('id', user?.id)
    .single();
  const userTipo = profile?.tipo || 'caixa';

  const [categoriesResult, lojas] = await Promise.all([
    listCategories(),
    getLojasDoUsuario()
  ]);

  return (
    <ProductForm
      categories={categoriesResult.data || []}
      lojas={lojas}
      userTipo={userTipo}
    />
  );
}
