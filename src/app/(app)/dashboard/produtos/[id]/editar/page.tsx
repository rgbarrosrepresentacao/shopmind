import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/actions/products";
import { listCategories } from "@/lib/actions/categories";
import { getLojasDoUsuario } from "@/lib/actions/multilojas";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/produtos/product-form";

export const metadata: Metadata = {
  title: "ShopMind — Editar Produto",
  description: "Atualizar informações cadastrais e preços do produto.",
};

interface EditarProdutoPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function EditarProdutoPage({ params }: EditarProdutoPageProps) {
  // Await params to support modern Next.js conventions
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('usuarios')
    .select('tipo')
    .eq('id', user?.id)
    .single();
  const userTipo = profile?.tipo || 'caixa';

  const [productResult, categoriesResult, lojas] = await Promise.all([
    getProduct(id),
    listCategories(),
    getLojasDoUsuario()
  ]);

  if (productResult.error || !productResult.data) {
    notFound();
  }

  return (
    <ProductForm
      product={productResult.data}
      categories={categoriesResult.data || []}
      lojas={lojas}
      userTipo={userTipo}
    />
  );
}
