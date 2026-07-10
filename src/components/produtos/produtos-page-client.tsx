"use client";

import * as React from "react";
import { ProdutosKPIs } from "./produtos-kpis";
import { ProdutosToolbar } from "./produtos-toolbar";
import { ProdutosTable } from "./produtos-table";
import { DeleteProductDialog } from "./delete-product-dialog";
import { Pagination } from "@/components/ui/pagination";
import type {
  Product,
  ProductFilter,
  ProductKPIs as ProductKPIsType,
  Category,
  ProductSortField,
  ProductSortDirection,
} from "@/lib/types/produtos";
import { listProducts, getProductKPIs } from "@/lib/actions/products";
import { useTransition } from "react";

interface ProdutosPageClientProps {
  initialProducts: Product[];
  initialCount: number;
  initialKPIs: ProductKPIsType;
  categories: Category[];
}

export function ProdutosPageClient({
  initialProducts,
  initialCount,
  initialKPIs,
  categories,
}: ProdutosPageClientProps) {
  // Products list states
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [totalCount, setTotalCount] = React.useState(initialCount);
  const [kpis, setKpis] = React.useState<ProductKPIsType>(initialKPIs);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [searchVal, setSearchVal] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoriaId, setCategoriaId] = React.useState("");
  const [status, setStatus] = React.useState<"ativo" | "inativo" | "todos">("ativo");
  const [estoque, setEstoque] = React.useState<"todos" | "baixo" | "zerado" | "normal">("todos");
  const [favorito, setFavorito] = React.useState<boolean | undefined>(undefined);
  const [destaque, setDestaque] = React.useState<boolean | undefined>(undefined);

  // Sorting and Pagination states
  const [sortBy, setSortBy] = React.useState<ProductSortField>("created_at");
  const [sortDir, setSortDir] = React.useState<ProductSortDirection>("desc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const perPage = 10;

  // Modal deletion state
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null);

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setCurrentPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Reload products function
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ProductFilter = {
        search: debouncedSearch,
        categoria_id: categoriaId || null,
        status,
        estoque,
        favorito,
        destaque,
        sortBy,
        sortDir,
        page: currentPage,
        perPage,
      };

      const result = await listProducts(filters);
      if (!result.error) {
        setProducts(result.data);
        // If search/filter returns fewer items than total db count, set appropriate count
        setTotalCount(result.count);
      }

      // Also reload KPIs to keep dashboard synced
      const updatedKPIs = await getProductKPIs();
      setKpis(updatedKPIs);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    categoriaId,
    status,
    estoque,
    favorito,
    destaque,
    sortBy,
    sortDir,
    currentPage,
  ]);

  // Trigger loadData when filters change
  React.useEffect(() => {
    startTransition(() => {
      loadData();
    });
  }, [loadData]);

  // Handlers
  const handleSort = (field: ProductSortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchVal("");
    setDebouncedSearch("");
    setCategoriaId("");
    setStatus("ativo");
    setEstoque("todos");
    setFavorito(undefined);
    setDestaque(undefined);
    setSortBy("created_at");
    setSortDir("desc");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Catálogo de Produtos
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie preços, estoque, tributação e favoritos dos produtos.
        </p>
      </div>

      {/* KPI Dashboard */}
      <ProdutosKPIs kpis={kpis} />

      {/* Search and Filters Toolbar */}
      <ProdutosToolbar
        search={searchVal}
        onSearchChange={setSearchVal}
        categoriaId={categoriaId}
        onCategoriaChange={(val) => {
          setCategoriaId(val);
          setCurrentPage(1);
        }}
        categories={categories}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setCurrentPage(1);
        }}
        estoque={estoque}
        onEstoqueChange={(val) => {
          setEstoque(val);
          setCurrentPage(1);
        }}
        favorito={favorito}
        onFavoritoChange={(val) => {
          setFavorito(val);
          setCurrentPage(1);
        }}
        destaque={destaque}
        onDestaqueChange={(val) => {
          setDestaque(val);
          setCurrentPage(1);
        }}
        totalResults={totalCount}
        onClearFilters={handleClearFilters}
        isPending={isPending || isLoading}
      />

      {/* Table / Grid */}
      <ProdutosTable
        products={products}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onDeleteClick={setDeletingProduct}
        onRefresh={loadData}
      />

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        product={deletingProduct}
        isOpen={deletingProduct !== null}
        onClose={() => setDeletingProduct(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
