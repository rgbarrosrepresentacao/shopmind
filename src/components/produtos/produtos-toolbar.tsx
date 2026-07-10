"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Star,
  Flame,
  AlertTriangle,
  XCircle,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Category } from "@/lib/types/produtos";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ImportProductsModal } from "./import-products-modal";
import { exportProductsAction } from "@/lib/actions/products";
import { toast } from "@/components/ui/toast";

interface ProdutosToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoriaId: string;
  onCategoriaChange: (value: string) => void;
  categories: Category[];
  status: "ativo" | "inativo" | "todos";
  onStatusChange: (value: "ativo" | "inativo" | "todos") => void;
  estoque: "todos" | "baixo" | "zerado" | "normal";
  onEstoqueChange: (value: "todos" | "baixo" | "zerado" | "normal") => void;
  favorito: boolean | undefined;
  onFavoritoChange: (value: boolean | undefined) => void;
  destaque: boolean | undefined;
  onDestaqueChange: (value: boolean | undefined) => void;
  totalResults: number;
  onClearFilters: () => void;
  isPending?: boolean;
}

export function ProdutosToolbar({
  search,
  onSearchChange,
  categoriaId,
  onCategoriaChange,
  categories,
  status,
  onStatusChange,
  estoque,
  onEstoqueChange,
  favorito,
  onFavoritoChange,
  destaque,
  onDestaqueChange,
  totalResults,
  onClearFilters,
  isPending = false,
}: ProdutosToolbarProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportProductsAction();
      if (res.error || !res.data) {
        toast.error(res.error || "Erro ao buscar produtos para exportação.");
        return;
      }

      if (res.data.length === 0) {
        toast.info("Nenhum produto cadastrado para exportação.");
        return;
      }

      const csvHeaders = "Nome;SKU;Codigo de Barras;Preco Custo;Preco Venda;Estoque;Estoque Minimo;Unidade;Status Fiscal\n";
      const csvContent = res.data.map(p => {
        return `"${p.nome.replace(/"/g, '""')}";"${p.sku || ""}";"${p.codigo_barras || ""}";${p.preco_custo || 0};${p.preco_venda || 0};${p.estoque_atual || 0};${p.estoque_minimo || 0};"${p.unidade || "UN"}";"${p.fiscal_status || "pending_review"}"`;
      }).join("\n");

      const blob = new Blob([csvHeaders + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `produtos_exportados_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Produtos exportados com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar arquivo de exportação.");
    } finally {
      setIsExporting(false);
    }
  };

  // Check if any filter is active
  const hasActiveFilters =
    search !== "" ||
    categoriaId !== "" ||
    status !== "ativo" ||
    estoque !== "todos" ||
    favorito !== undefined ||
    destaque !== undefined;

  return (
    <div className="flex flex-col gap-4 bg-card border border-border/60 p-4 rounded-xl shadow-sm transition-all duration-300">
      {/* Search & Actions Row */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="w-full md:max-w-md relative">
          <Input
            placeholder="Buscar por nome, SKU, código de barras ou marca..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-4.5 h-4.5 text-muted-foreground" />}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-10 text-xs gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>

          {/* Export Draft Button */}
          <Button
            variant="secondary"
            size="sm"
            className="h-10 text-xs gap-1.5"
            onClick={handleExport}
            isLoading={isExporting}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </Button>

          {/* Import Draft Button */}
          <Button
            variant="secondary"
            size="sm"
            className="h-10 text-xs gap-1.5"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </Button>

          {/* Add Product Button */}
          <Link href="/dashboard/produtos/novo">
            <Button variant="primary" size="sm" className="h-10 text-xs gap-1.5">
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/50 animate-slide-down">
          {/* Category Filter */}
          <Select
            label="Categoria"
            value={categoriaId}
            onChange={(e) => onCategoriaChange(e.target.value)}
            className="w-full"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            label="Status"
            value={status}
            onChange={(e) =>
              onStatusChange(e.target.value as "ativo" | "inativo" | "todos")
            }
            className="w-full"
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </Select>

          {/* Stock Filter */}
          <Select
            label="Estoque"
            value={estoque}
            onChange={(e) =>
              onEstoqueChange(
                e.target.value as "todos" | "baixo" | "zerado" | "normal"
              )
            }
            className="w-full"
          >
            <option value="todos">Todos os estoques</option>
            <option value="normal">Estoque Normal</option>
            <option value="baixo">Estoque Baixo</option>
            <option value="zerado">Sem Estoque</option>
          </Select>

          {/* Boolean Filters (Favoritos / Destaques) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground select-none">
              Destaques e Favoritos
            </span>
            <div className="flex gap-2 h-10 items-center">
              <button
                type="button"
                onClick={() => onFavoritoChange(favorito ? undefined : true)}
                className={cn(
                  "flex items-center justify-center flex-1 h-full rounded-lg border text-xs gap-1.5 transition-colors cursor-pointer",
                  favorito === true
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500 font-semibold"
                    : "bg-input border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Star className={cn("w-3.5 h-3.5", favorito && "fill-amber-500")} />
                Favoritos
              </button>
              <button
                type="button"
                onClick={() => onDestaqueChange(destaque ? undefined : true)}
                className={cn(
                  "flex items-center justify-center flex-1 h-full rounded-lg border text-xs gap-1.5 transition-colors cursor-pointer",
                  destaque === true
                    ? "bg-red-500/10 border-red-500/40 text-red-500 font-semibold"
                    : "bg-input border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Flame className={cn("w-3.5 h-3.5", destaque && "fill-red-500")} />
                Destaques
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Chips & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick-filter Chips */}
          <button
            onClick={() => onEstoqueChange(estoque === "baixo" ? "todos" : "baixo")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
              estoque === "baixo"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm"
                : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Estoque Baixo
          </button>

          <button
            onClick={() => onEstoqueChange(estoque === "zerado" ? "todos" : "zerado")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
              estoque === "zerado"
                ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-sm"
                : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50"
            )}
          >
            <XCircle className="w-3.5 h-3.5" />
            Sem Estoque
          </button>

          <button
            onClick={() => onStatusChange(status === "inativo" ? "todos" : "inativo")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
              status === "inativo"
                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30 shadow-sm"
                : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/50"
            )}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Inativos
          </button>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-all cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Stats & Loading Indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isPending && (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
          )}
          <span>
            {totalResults} {totalResults === 1 ? "produto encontrado" : "produtos encontrados"}
          </span>
        </div>
      </div>

      <ImportProductsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          setIsImportOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
