import * as React from "react";
import type { ProdutoCustoComparacao } from "@/lib/types/fornecedores";
import { getProdutosComparadorCusto } from "@/lib/actions/fornecedores";
import { formatBRL } from "@/lib/types/compras";
import { toast } from "@/components/ui/toast";
import {
  Scale, Search, TrendingUp, Sparkles, PiggyBank
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function FornecedorComparador() {
  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<ProdutoCustoComparacao[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    loadComparacoes();
  }, [search]);

  const loadComparacoes = async () => {
    setLoading(true);
    try {
      const res = await getProdutosComparadorCusto(search);
      if (res.error) {
        toast.error(res.error);
      } else {
        setProducts(res.data || []);
      }
    } catch {
      toast.error("Erro ao carregar comparador de custos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> Comparador de Custos de Produtos
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Visualize economias potenciais comprando de fornecedores com menores preços históricos.
          </p>
        </div>
        <div className="w-full max-w-xs relative flex items-center">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3" />
          <input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-100 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
          />
        </div>
      </div>

      {/* Comparison Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/80 rounded-2xl">
          <Scale className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
          <p className="font-bold text-muted-foreground">Nenhum produto comparável encontrado</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Os produtos devem possuir compras registradas de 2 ou mais fornecedores diferentes para aparecerem nesta análise.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {products.map(p => (
            <div key={p.produto_id} className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
              
              {/* Product Info */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-foreground">{p.nome}</h4>
                    <p className="text-[9px] text-muted-foreground font-mono">
                      SKU: {p.sku || "Sem SKU"} | Estoque: {p.estoque_atual}
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                    <PiggyBank className="w-3 h-3" /> Economia: {formatBRL(p.economia_potencial)}
                  </span>
                </div>

                {/* Costs spread */}
                <div className="grid grid-cols-3 gap-2 border-y border-border/50 py-3.5 my-3.5 text-center">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-muted-foreground block mb-0.5">Menor Custo</span>
                    <span className="text-xs font-black text-emerald-600">{formatBRL(p.menor_custo)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-muted-foreground block mb-0.5">Maior Custo</span>
                    <span className="text-xs font-black text-red-500">{formatBRL(p.maior_custo)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-muted-foreground block mb-0.5">Diferença %</span>
                    <span className="text-xs font-black text-amber-500 flex items-center justify-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" /> {p.diferenca_percentual.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Suppliers Side-by-Side */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-black text-muted-foreground block tracking-wider">
                    Histórico de Preços por Fornecedor
                  </span>
                  <div className="space-y-1.5">
                    {p.fornecedores.map((f, idx) => (
                      <div key={f.fornecedor_id} className={cn("flex items-center justify-between p-2 rounded-xl text-[10px]", {
                        "bg-emerald-500/5 border border-emerald-500/10 text-emerald-700": idx === 0,
                        "bg-red-500/5 border border-red-500/10 text-red-700": idx === p.fornecedores.length - 1,
                        "bg-slate-50 border border-slate-100 text-slate-600": idx > 0 && idx < p.fornecedores.length - 1,
                      })}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0", {
                            "bg-emerald-500 text-white": idx === 0,
                            "bg-red-500 text-white": idx === p.fornecedores.length - 1,
                            "bg-slate-200 text-slate-500": idx > 0 && idx < p.fornecedores.length - 1,
                          })}>
                            {idx + 1}
                          </span>
                          <span className="font-bold truncate max-w-[150px]">{f.fornecedor_nome}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[8px] text-muted-foreground font-semibold">
                            {new Date(f.ultima_compra).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="font-black text-foreground">{formatBRL(f.custo)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Potential Savings Explanation */}
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-start gap-2 text-[9px] leading-normal text-muted-foreground shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <p>
                  Comprando no <strong className="text-emerald-600 font-bold">1º colocado</strong> em vez do último, você poupa <strong className="text-foreground font-bold">{formatBRL(p.maior_custo - p.menor_custo)}</strong> por unidade. Para o seu estoque atual de {p.estoque_atual} un., a economia acumulada é de <strong className="text-foreground font-bold">{formatBRL(p.economia_potencial)}</strong>.
                </p>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
