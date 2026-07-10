"use client";

import * as React from "react";
import {
  Eye,
  Edit2,
  Trash2,
  Star,
  Flame,
  AlertTriangle,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Product,
  ProductSortField,
  ProductSortDirection,
} from "@/lib/types/produtos";
import {
  computeMargin,
  computeEstoqueStatus,
  computeMargemStatus,
  formatBRL,
  formatPercent,
} from "@/lib/types/produtos";
import { toggleFavorite } from "@/lib/actions/products";
import { useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface ProdutosTableProps {
  products: Product[];
  isLoading: boolean;
  sortBy: ProductSortField;
  sortDir: ProductSortDirection;
  onSort: (field: ProductSortField) => void;
  onDeleteClick: (product: Product) => void;
  onRefresh?: () => void;
}

export function ProdutosTable({
  products,
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onDeleteClick,
  onRefresh,
}: ProdutosTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggleFavorite = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    startTransition(async () => {
      const { error } = await toggleFavorite(product.id, !product.favorito);
      if (!error && onRefresh) {
        onRefresh();
      }
    });
  };

  const renderSortIcon = (field: ProductSortField) => {
    if (sortBy !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1 text-primary inline" />
    );
  };

  // Header click helper
  const handleSortClick = (field: ProductSortField) => {
    onSort(field);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Nenhum produto cadastrado"
        description="Comece adicionando produtos ao seu catálogo para gerenciar estoque, vendas e preços."
        action={
          <Link href="/dashboard/produtos/novo">
            <Button variant="primary" size="sm">
              Cadastrar Primeiro Produto
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[70px]">Foto</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSortClick("nome")}
              >
                Produto {renderSortIcon("nome")}
              </TableHead>
              <TableHead>SKU / Cód. Barras</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground select-none text-right"
                onClick={() => handleSortClick("estoque_atual")}
              >
                Estoque {renderSortIcon("estoque_atual")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground select-none text-right"
                onClick={() => handleSortClick("preco_custo")}
              >
                Custo {renderSortIcon("preco_custo")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground select-none text-right"
                onClick={() => handleSortClick("preco_venda")}
              >
                Venda {renderSortIcon("preco_venda")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground select-none text-right"
                onClick={() => handleSortClick("margem")}
              >
                Margem {renderSortIcon("margem")}
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const { lucro, margem } = computeMargin(
                Number(product.preco_custo),
                Number(product.preco_venda)
              );
              const estStatus = computeEstoqueStatus(
                Number(product.estoque_atual),
                Number(product.estoque_minimo)
              );
              const margStatus = computeMargemStatus(margem);

              return (
                <TableRow
                  key={product.id}
                  className="cursor-pointer group"
                >
                  {/* Favorite Toggle */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleToggleFavorite(e, product)}
                      disabled={isPending}
                      className={cn(
                        "p-1.5 rounded-md hover:bg-muted text-muted-foreground/60 hover:text-amber-400 transition-colors cursor-pointer",
                        product.favorito && "text-amber-400"
                      )}
                    >
                      <Star
                        className={cn(
                          "w-4 h-4",
                          product.favorito && "fill-amber-400 text-amber-400"
                        )}
                      />
                    </button>
                  </TableCell>

                  {/* Foto URL Thumbnail */}
                  <TableCell>
                    <div className="w-10 h-10 rounded-lg border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center relative">
                      {product.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.foto_url}
                          alt={product.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-4.5 h-4.5 text-muted-foreground/50" />
                      )}
                      {product.destaque && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md">
                          <Flame className="w-2.5 h-2.5 fill-current" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Nome & Marca */}
                  <TableCell>
                    <Link
                      href={`/dashboard/produtos/${product.id}`}
                      className="block hover:underline"
                    >
                      <div className="font-semibold text-foreground text-sm line-clamp-1">
                        {product.nome}
                      </div>
                      {product.marca && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {product.marca}
                        </div>
                      )}
                    </Link>
                  </TableCell>

                  {/* SKU & Barcode */}
                  <TableCell>
                    <div className="font-mono text-xs text-foreground/80">
                      {product.sku || "—"}
                    </div>
                    {product.codigo_barras && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {product.codigo_barras}
                      </div>
                    )}
                  </TableCell>

                  {/* Categoria */}
                  <TableCell>
                    <Badge variant="outline">
                      {product.categoria?.nome || "Sem categoria"}
                    </Badge>
                  </TableCell>

                  {/* Estoque atual */}
                  <TableCell className="text-right">
                    <div
                      className={cn(
                        "font-semibold font-mono",
                        estStatus === "zerado" && "text-red-400",
                        estStatus === "critico" && "text-red-400",
                        estStatus === "baixo" && "text-amber-400",
                        estStatus === "normal" && "text-foreground"
                      )}
                    >
                      {Number(product.estoque_atual).toLocaleString("pt-BR")}{" "}
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {product.unidade}
                      </span>
                    </div>
                    {estStatus !== "normal" && estStatus !== "zerado" && (
                      <div className="text-[10px] text-amber-500 flex items-center justify-end gap-0.5 mt-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> Mín. {product.estoque_minimo}
                      </div>
                    )}
                    {estStatus === "zerado" && (
                      <div className="text-[10px] text-red-500 font-semibold mt-0.5">
                        Esgotado
                      </div>
                    )}
                  </TableCell>

                  {/* Preço de Custo */}
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatBRL(Number(product.preco_custo))}
                  </TableCell>

                  {/* Preço de Venda */}
                  <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                    {formatBRL(Number(product.preco_venda))}
                  </TableCell>

                  {/* Margem */}
                  <TableCell className="text-right">
                    <div
                      className={cn(
                        "font-semibold font-mono text-xs",
                        margStatus === "negativa" && "text-red-400",
                        margStatus === "baixa" && "text-amber-400",
                        margStatus === "media" && "text-foreground",
                        margStatus === "alta" && "text-emerald-400"
                      )}
                    >
                      {formatPercent(margem)}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      Lucro {formatBRL(lucro)}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={product.status === "ativo" ? "success" : "default"}
                    >
                      {product.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/produtos/${product.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/produtos/${product.id}/editar`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteClick(product)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
        {products.map((product) => {
          const { lucro, margem } = computeMargin(
            Number(product.preco_custo),
            Number(product.preco_venda)
          );
          const estStatus = computeEstoqueStatus(
            Number(product.estoque_atual),
            Number(product.estoque_minimo)
          );

          return (
            <div
              key={product.id}
              className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between hover:border-border transition-all duration-200"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center relative shrink-0">
                  {product.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.foto_url}
                      alt={product.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/45" />
                  )}
                  {product.destaque && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md">
                      <Flame className="w-2.5 h-2.5 fill-current" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      {product.categoria?.nome || "Sem categoria"}
                    </span>
                    <Badge
                      variant={product.status === "ativo" ? "success" : "default"}
                      className="scale-90 origin-top-right"
                    >
                      {product.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1 mt-0.5">
                    {product.nome}
                  </h3>
                  <div className="flex gap-2 font-mono text-[10px] text-muted-foreground mt-0.5">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.codigo_barras && (
                      <span>Cód: {product.codigo_barras}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price and Stock row */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/40 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">
                    Estoque
                  </span>
                  <span
                    className={cn(
                      "font-semibold font-mono",
                      estStatus === "zerado" && "text-red-400",
                      estStatus === "critico" && "text-red-400",
                      estStatus === "baixo" && "text-amber-400",
                      estStatus === "normal" && "text-foreground"
                    )}
                  >
                    {Number(product.estoque_atual)} {product.unidade}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">
                    Venda
                  </span>
                  <span className="font-semibold font-mono text-foreground">
                    {formatBRL(Number(product.preco_venda))}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">
                    Margem
                  </span>
                  <span className="font-semibold font-mono text-emerald-400">
                    {formatPercent(margem)}
                  </span>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                <button
                  onClick={(e) => handleToggleFavorite(e, product)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400"
                >
                  <Star
                    className={cn(
                      "w-4 h-4",
                      product.favorito && "fill-amber-400 text-amber-400"
                    )}
                  />
                  {product.favorito ? "Favorito" : "Favoritar"}
                </button>

                <div className="flex items-center gap-1.5">
                  <Link href={`/dashboard/produtos/${product.id}`}>
                    <Button variant="secondary" size="sm" className="px-2.5 py-1">
                      <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                    </Button>
                  </Link>
                  <Link href={`/dashboard/produtos/${product.id}/editar`}>
                    <Button variant="secondary" size="sm" className="px-2.5 py-1">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteClick(product)}
                    className="text-destructive hover:bg-destructive/10 px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
