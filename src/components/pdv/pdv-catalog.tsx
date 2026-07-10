"use client";

import * as React from "react";
import type { Product, Category } from "@/lib/types/produtos";
import { formatBRL, computeMargin } from "@/lib/types/produtos";
import { Search, Sparkles, Star, Package, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PDVCatalogProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Product) => void;
}

export const PDVCatalog: React.FC<PDVCatalogProps> = ({
  products,
  categories,
  onAddProduct,
}) => {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all"); // 'all' | 'favorites' | categoryId
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Scanner Keyboard Emulation Listener
  // Standard scanner reads code -> presses Enter.
  // We can track the keys typed quickly, or just listen for standard Enter on search box when barcode matches.
  // Let's implement a listener on search input for barcode.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const term = search.trim();
      if (!term) return;

      // Exact match search by barcode or SKU
      const exactMatch = products.find(
        (p) =>
          p.status === "ativo" &&
          (p.codigo_barras === term || p.sku === term)
      );

      if (exactMatch) {
        onAddProduct(exactMatch);
        setSearch(""); // clear search
      }
    }
  };

  // Touch focus shortcut
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Focus search input on F3 or Ctrl+F
      if (e.key === "F3" || ((e.ctrlKey || e.metaKey) && e.key === "f")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Filter products
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // Must be active
      if (p.status !== "ativo") return false;

      // Category filter
      if (selectedCategory === "favorites") {
        if (!p.favorito) return false;
      } else if (selectedCategory !== "all") {
        if (p.categoria_id !== selectedCategory) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.nome.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.codigo_barras?.toLowerCase().includes(q) ||
          p.marca?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [products, selectedCategory, search]);

  return (
    <div className="flex flex-col h-full bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Catalog Search Header */}
      <div className="p-4 border-b border-border bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Pesquisar por Nome, SKU ou Código de Barras... (F3)"
            className="w-full pl-10 pr-4 py-3 bg-white border border-border text-sm text-foreground rounded-xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 border-b border-border bg-white scrollbar-none select-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer whitespace-nowrap",
            {
              "bg-primary border-primary text-white shadow-md shadow-primary/10":
                selectedCategory === "all",
              "bg-slate-50 border-border text-muted-foreground hover:bg-slate-100 hover:text-foreground":
                selectedCategory !== "all",
            }
          )}
        >
          📂 Todos
        </button>

        <button
          onClick={() => setSelectedCategory("favorites")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
            {
              "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10":
                selectedCategory === "favorites",
              "bg-slate-50 border-border text-muted-foreground hover:bg-slate-100 hover:text-foreground":
                selectedCategory !== "favorites",
            }
          )}
        >
          <Star className={cn("w-3.5 h-3.5", selectedCategory === "favorites" ? "fill-white" : "fill-amber-500 stroke-amber-500")} /> Favoritos
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer whitespace-nowrap",
              {
                "bg-primary border-primary text-white shadow-md shadow-primary/10":
                  selectedCategory === cat.id,
                "bg-slate-50 border-border text-muted-foreground hover:bg-slate-100 hover:text-foreground":
                  selectedCategory !== cat.id,
              }
            )}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      {/* Products Grid (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhum produto encontrado
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Verifique os filtros ou busque por outro termo
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const { margem } = computeMargin(p.preco_custo, p.preco_venda);
              const isHighMargin = margem >= 30;
              const estoqueDisponivel = Number(p.estoque_atual) - Number((p as any).estoque_reservado || 0);
              const isLowStock = estoqueDisponivel <= Number(p.estoque_minimo);
              const isOutOfStock = estoqueDisponivel <= 0;

              return (
                <button
                  key={p.id}
                  disabled={isOutOfStock}
                  onClick={() => onAddProduct(p)}
                  className={cn(
                    "flex flex-col text-left bg-white border border-border/80 rounded-xl overflow-hidden hover:border-primary hover:shadow-md cursor-pointer transition-all duration-150 relative select-none group focus:outline-none focus:ring-2 focus:ring-primary/20",
                    {
                      "opacity-60 cursor-not-allowed border-red-200 bg-red-50/10": isOutOfStock,
                      "active:scale-[0.98]": !isOutOfStock,
                    }
                  )}
                >
                  {/* Photo or Placeholder with touch-friendly layout */}
                  <div className="w-full aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden border-b border-border/40">
                    {p.foto_url ? (
                      <img
                        src={p.foto_url}
                        alt={p.nome}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-lg font-black text-muted-foreground/40 group-hover:scale-110 transition-transform duration-300">
                        {p.nome.substring(0, 2).toUpperCase()}
                      </span>
                    )}

                    {/* Stock Badges */}
                    {isOutOfStock ? (
                      <span className="absolute inset-0 bg-red-950/40 text-white font-black text-[10px] uppercase flex items-center justify-center tracking-wider text-center px-1">
                        Sem Estoque
                      </span>
                    ) : isLowStock ? (
                      <span className="absolute bottom-1 left-1 bg-amber-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded tracking-wide">
                        Estoque Baixo
                      </span>
                    ) : null}

                    {/* High Margin Badges (Up-selling guide) */}
                    {isHighMargin && !isOutOfStock && (
                      <span className="absolute top-1 right-1 bg-violet-600 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm shadow-violet-500/25">
                        <Sparkles className="w-2.5 h-2.5 fill-white" /> +MARGEM
                      </span>
                    )}

                    {/* Favorite Star */}
                    {p.favorito && (
                      <span className="absolute top-1 left-1 bg-amber-400 text-white p-0.5 rounded-full shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-white stroke-white" />
                      </span>
                    )}
                  </div>

                  {/* Body text with big tap area */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {p.nome}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {p.sku ? `SKU: ${p.sku}` : `Cód: ${p.codigo_barras || "-"}`}
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-50">
                      <span className="text-sm font-black text-foreground">
                        {formatBRL(p.preco_venda)}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground">
                        /{p.unidade}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
