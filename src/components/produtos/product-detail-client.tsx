"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Star,
  Flame,
  Image as ImageIcon,
  Tag,
  Package,
  DollarSign,
  Barcode,
  Scale,
  Calendar,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductHistory } from "./product-history";
import { ProductIAInsights } from "./product-ia-insights";
import { DeleteProductDialog } from "./delete-product-dialog";
import type { Product, ProductActivity, ProductStockAudit } from "@/lib/types/produtos";
import { computeMargin, computeEstoqueStatus, computeMargemStatus, formatBRL, formatPercent } from "@/lib/types/produtos";
import { toggleFavorite } from "@/lib/actions/products";
import { useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface ProductDetailClientProps {
  product: Product;
  history: ProductActivity[];
  audit: ProductStockAudit;
}

export function ProductDetailClient({
  product: initialProduct,
  history,
  audit,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [product, setProduct] = React.useState<Product>(initialProduct);
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const { lucro, margem } = computeMargin(Number(product.preco_custo), Number(product.preco_venda));
  const estStatus = computeEstoqueStatus(Number(product.estoque_atual), Number(product.estoque_minimo));
  const margStatus = computeMargemStatus(margem);

  const handleToggleFavorite = async () => {
    startTransition(async () => {
      const nextFav = !product.favorito;
      const { error } = await toggleFavorite(product.id, nextFav);
      if (!error) {
        setProduct((prev) => ({ ...prev, favorito: nextFav }));
        router.refresh();
      }
    });
  };

  const getFiscalOriginLabel = (code: string | null): string => {
    if (!code) return "Não informado";
    const labels: Record<string, string> = {
      "0": "0 - Nacional",
      "1": "1 - Estrangeira - Importação Direta",
      "2": "2 - Estrangeira - Adquirida mercado interno",
      "3": "3 - Nacional - Conteúdo Importação > 40%",
      "4": "4 - Nacional - Produção conf. PPB",
      "5": "5 - Nacional - Conteúdo Importação <= 40%",
      "6": "6 - Estrangeira - Importação direta, sem similar nacional",
      "7": "7 - Estrangeira - Mercado interno, sem similar nacional",
      "8": "8 - Nacional - Conteúdo Importação > 70%",
    };
    return labels[code] || `${code} - Outros`;
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => router.push("/dashboard/produtos")}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">
                ID: {product.id.slice(0, 8)}...
              </span>
              <Badge variant={product.status === "ativo" ? "success" : "default"}>
                {product.status === "ativo" ? "Catálogo Ativo" : "Inativo"}
              </Badge>
              {product.destaque && (
                <Badge variant="error" className="gap-0.5">
                  <Flame className="w-3 h-3 fill-current" /> Destaque
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {product.nome}
            </h1>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Favorite Button */}
          <Button
            variant="secondary"
            onClick={handleToggleFavorite}
            disabled={isPending}
            className="h-10 text-xs gap-1.5"
          >
            <Star
              className={cn(
                "w-4 h-4 transition-all",
                product.favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              )}
            />
            {product.favorito ? "Favorito" : "Favoritar"}
          </Button>

          {/* Edit Button */}
          <Link href={`/dashboard/produtos/${product.id}/editar`}>
            <Button variant="secondary" className="h-10 text-xs gap-1.5">
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </Button>
          </Link>

          {/* Delete Button */}
          <Button
            variant="destructive"
            onClick={() => setIsDeleteOpen(true)}
            className="h-10 text-xs gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (Image + Info Cards) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo & General Card */}
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product Image */}
            <div className="aspect-square rounded-xl border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center relative md:col-span-1">
              {product.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.foto_url}
                  alt={product.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <span className="text-[10px] text-muted-foreground">
                    Sem Imagem Cadastrada
                  </span>
                </div>
              )}
            </div>

            {/* General Fields */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Categoria
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      {product.categoria?.nome || "Sem categoria"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Unidade
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Scale className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground font-mono">
                      {product.unidade}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Marca
                  </span>
                  <div className="text-sm font-medium text-foreground mt-1">
                    {product.marca || "—"}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Cadastrado Em
                  </span>
                  <div className="flex items-center gap-1 text-sm font-medium text-foreground mt-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {new Date(product.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>

              {/* SKU & Barcode Codes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border/40">
                <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-semibold uppercase tracking-wider">
                      Código SKU
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {product.sku || "Não informado"}
                    </span>
                  </div>
                </div>
                
                <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Barcode className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-semibold uppercase tracking-wider">
                      Cód. Barras (EAN)
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {product.codigo_barras || "Não informado"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {product.descricao && (
            <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-2">
              <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                Descrição do Produto
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {product.descricao}
              </p>
            </div>
          )}

          {/* Precificação Details */}
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
              Precificação e Rentabilidade
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground block font-semibold">
                  Preço de Custo
                </span>
                <span className="text-base font-bold font-mono text-foreground mt-1">
                  {formatBRL(Number(product.preco_custo))}
                </span>
              </div>

              <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground block font-semibold">
                  Preço de Venda
                </span>
                <span className="text-lg font-extrabold font-mono text-foreground mt-1">
                  {formatBRL(Number(product.preco_venda))}
                </span>
              </div>

              <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground block font-semibold">
                  Margem de Lucro
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={cn(
                      "text-base font-bold font-mono",
                      margStatus === "negativa" && "text-red-400",
                      margStatus === "baixa" && "text-amber-400",
                      margStatus === "media" && "text-foreground",
                      margStatus === "alta" && "text-emerald-400"
                    )}
                  >
                    {formatPercent(margem)}
                  </span>
                  <Percent className="w-3 h-3 text-muted-foreground shrink-0" />
                </div>
              </div>

              <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground block font-semibold">
                  Lucro Real Unitário
                </span>
                <span className="text-base font-bold font-mono text-emerald-400 mt-1">
                  {formatBRL(lucro)}
                </span>
              </div>
            </div>
          </div>

          {/* Tributação & Fiscal Details */}
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
              Estrutura Fiscal / Tributária
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-border/50 rounded-xl p-3 bg-muted/20">
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  NCM
                </span>
                <span className="text-sm font-mono font-bold text-foreground mt-0.5 block">
                  {product.ncm || "Não definido"}
                </span>
              </div>

              <div className="border border-border/50 rounded-xl p-3 bg-muted/20">
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  CEST
                </span>
                <span className="text-sm font-mono font-bold text-foreground mt-0.5 block">
                  {product.cest || "Não definido"}
                </span>
              </div>

              <div className="border border-border/50 rounded-xl p-3 bg-muted/20 md:col-span-1">
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  Origem do ICMS
                </span>
                <span className="text-xs font-semibold text-foreground mt-0.5 block truncate" title={getFiscalOriginLabel(product.origem_fiscal)}>
                  {getFiscalOriginLabel(product.origem_fiscal)}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline de Alterações */}
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
              Histórico de Atividade (Timeline)
            </h3>
            <ProductHistory history={history} />
          </div>
        </div>

        {/* Right column (Stock & IA insights) */}
        <div className="space-y-6">
          {/* Estoque Card */}
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
              Situação do Estoque
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block">
                  Quantidade Atual
                </span>
                <span
                  className={cn(
                    "text-3xl font-extrabold font-mono",
                    estStatus === "zerado" && "text-red-400",
                    estStatus === "critico" && "text-red-400",
                    estStatus === "baixo" && "text-amber-400",
                    estStatus === "normal" && "text-foreground"
                  )}
                >
                  {Number(product.estoque_atual).toLocaleString("pt-BR")}
                </span>
                <span className="text-xs font-medium text-muted-foreground ml-1">
                  {product.unidade}
                </span>
              </div>

              <Badge
                variant={
                  estStatus === "normal"
                    ? "success"
                    : estStatus === "baixo"
                    ? "warning"
                    : "error"
                }
              >
                {estStatus === "normal"
                  ? "Estoque Ok"
                  : estStatus === "baixo"
                  ? "Abaixo do Ideal"
                  : estStatus === "critico"
                  ? "Crítico"
                  : "Esgotado"}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-input rounded-full h-2 overflow-hidden border border-border/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  {
                    "bg-red-500": estStatus === "zerado" || estStatus === "critico",
                    "bg-amber-500": estStatus === "baixo",
                    "bg-emerald-500": estStatus === "normal",
                  }
                )}
                style={{
                  width: `${Math.min(
                    (Number(product.estoque_atual) /
                      Math.max(Number(product.estoque_minimo) * 2, 1)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/30">
              <div>
                <span className="text-muted-foreground block">Mínimo Ideal</span>
                <span className="font-semibold font-mono text-foreground">
                  {Number(product.estoque_minimo).toLocaleString("pt-BR")}{" "}
                  {product.unidade}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block">Última Venda</span>
                <span className="font-semibold text-foreground">
                  {audit.ultimaVenda
                    ? new Date(audit.ultimaVenda).toLocaleDateString("pt-BR")
                    : "Nenhuma registrada"}
                </span>
              </div>
            </div>
          </div>

          {/* Auditoria Resumida */}
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground border-b border-border/30 pb-2">
              Auditoria de Fluxo
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">Total Comprado (Entradas)</span>
                <span className="font-bold font-mono text-foreground">
                  {Number(audit.totalComprado).toLocaleString("pt-BR")} {product.unidade}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">Total Vendido (Saídas)</span>
                <span className="font-bold font-mono text-foreground">
                  {Number(audit.totalVendido).toLocaleString("pt-BR")} {product.unidade}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">Movimentações (30 dias)</span>
                <span className="font-bold font-mono text-foreground">
                  {audit.movimentacoes30d}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">Última Movimentação</span>
                <span className="font-bold text-foreground">
                  {audit.ultimaMovimentacao
                    ? new Date(audit.ultimaMovimentacao).toLocaleString("pt-BR")
                    : "Sem registros"}
                </span>
              </div>
            </div>
          </div>

          {/* AI Insights Card Panel */}
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
            <ProductIAInsights product={product} audit={audit} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteProductDialog
        product={product}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => router.push("/dashboard/produtos")}
      />
    </div>
  );
}
