import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProductHistory, getProductStockAudit } from "@/lib/actions/products";
import { ProductDetailClient } from "@/components/produtos/product-detail-client";

export const metadata: Metadata = {
  title: "ShopMind — Detalhes do Produto",
  description: "Visualizar e auditar informações do produto.",
};

interface ProdutoDetalhePageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function ProdutoDetalhePage({ params }: ProdutoDetalhePageProps) {
  // Await params to support modern Next.js conventions
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const [productResult, history, audit] = await Promise.all([
    getProduct(id),
    getProductHistory(id),
    getProductStockAudit(id),
  ]);

  if (productResult.error || !productResult.data) {
    notFound();
  }

  return (
    <ProductDetailClient
      product={productResult.data}
      history={history}
      audit={audit}
    />
  );
}
