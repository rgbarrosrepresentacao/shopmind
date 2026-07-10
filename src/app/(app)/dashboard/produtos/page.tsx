import { Metadata } from "next";
import { listProducts, getProductKPIs } from "@/lib/actions/products";
import { listCategories } from "@/lib/actions/categories";
import { ProdutosPageClient } from "@/components/produtos/produtos-page-client";

export const metadata: Metadata = {
  title: "ShopMind — Produtos",
  description: "Gerenciamento completo do catálogo de produtos do ShopMind.",
};

export default async function ProdutosPage() {
  // Fetch initial data from server actions
  const [productsResult, categoriesResult, kpis] = await Promise.all([
    listProducts({ status: "ativo", page: 1, perPage: 10 }),
    listCategories(),
    getProductKPIs(),
  ]);

  return (
    <ProdutosPageClient
      initialProducts={productsResult.data || []}
      initialCount={productsResult.count || 0}
      initialKPIs={kpis}
      categories={categoriesResult.data || []}
    />
  );
}
