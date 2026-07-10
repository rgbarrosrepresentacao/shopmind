import { listProducts } from "@/lib/actions/products";
import { listCategories } from "@/lib/actions/categories";
import PDVPageClient from "@/components/pdv/pdv-page-client";

export const metadata = {
  title: "ShopMind — PDV Premium",
  description: "Terminal de Ponto de Venda moderno, rápido e inteligente integrado ao Caixa e CRM.",
};

export default async function PDVPage() {
  // Parallel fetch of catalog data on server
  const [resProducts, resCategories] = await Promise.all([
    listProducts({ perPage: 1000, status: "ativo", sortBy: "nome", sortDir: "asc" }),
    listCategories(),
  ]);

  const products = resProducts.data || [];
  const categories = resCategories.data || [];

  return (
    <div className="space-y-6">
      <PDVPageClient
        initialProducts={products}
        initialCategories={categories}
      />
    </div>
  );
}
