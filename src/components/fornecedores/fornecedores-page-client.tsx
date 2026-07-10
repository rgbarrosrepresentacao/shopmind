"use client";

import * as React from "react";
import type { FornecedorKPIs, FornecedorListItem, FornecedorIAInsight } from "@/lib/types/fornecedores";
import { getFornecedoresKPIs, listFornecedoresAvancado, getFornecedoresIAInsights } from "@/lib/actions/fornecedores";
import { FornecedorKPIsView } from "./fornecedor-kpis";
import { FornecedorList } from "./fornecedor-list";
import { FornecedorComparador } from "./fornecedor-comparador";
import { FornecedorInsights } from "./fornecedor-insights";
import { FornecedorDialog } from "./fornecedor-dialogs";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { Truck, Plus, RefreshCw, Scale, Brain } from "lucide-react";

interface FornecedoresPageClientProps {
  userTipo?: string;
}

export default function FornecedoresPageClient({ userTipo = "caixa" }: FornecedoresPageClientProps) {
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"listagem" | "comparador" | "ia">("listagem");

  // Data states
  const [kpis, setKpis] = React.useState<FornecedorKPIs | null>(null);
  const [fornecedores, setFornecedores] = React.useState<FornecedorListItem[]>([]);
  const [totalFornecedores, setTotalFornecedores] = React.useState(0);
  const [insights, setInsights] = React.useState<FornecedorIAInsight[]>([]);

  // Filters
  const [filters, setFilters] = React.useState<{
    search: string;
    status: "todos" | "ativo" | "inativo";
    comprasFilter: "todos" | "com_compras" | "sem_compras";
    inativosDias: "todos" | "30" | "60" | "90" | "120";
    sortBy: "nome" | "valor_comprado" | "qtd_compras" | "ultima_compra";
    sortDir: "asc" | "desc";
    page: number;
    perPage: number;
  }>({
    search: "",
    status: "todos",
    comprasFilter: "todos",
    inativosDias: "todos",
    sortBy: "nome",
    sortDir: "asc",
    page: 1,
    perPage: 15,
  });

  // Modal states
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = React.useState<FornecedorListItem | null>(null);

  React.useEffect(() => {
    loadAll();
  }, []);

  React.useEffect(() => {
    loadFornecedoresList();
  }, [filters]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [resKpis, resIA] = await Promise.all([
        getFornecedoresKPIs(),
        getFornecedoresIAInsights(),
      ]);
      setKpis(resKpis);
      setInsights(resIA.data || []);
      await loadFornecedoresList();
    } catch {
      toast.error("Erro ao carregar dados do painel.");
    } finally {
      setLoading(false);
    }
  };

  const loadFornecedoresList = async () => {
    try {
      const res = await listFornecedoresAvancado(filters);
      if (res.error) {
        toast.error(res.error);
      } else {
        setFornecedores(res.data || []);
        setTotalFornecedores(res.count || 0);
      }
    } catch {
      toast.error("Erro ao carregar listagem de fornecedores.");
    }
  };

  const handleCreateClick = () => {
    setSelectedFornecedor(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (fornecedor: FornecedorListItem) => {
    setSelectedFornecedor(fornecedor);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    loadAll();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-muted rounded-xl w-1/3" />
          <div className="h-10 bg-muted rounded-xl w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Fornecedores Inteligentes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise de compras, histórico de custos, relacionamento e oportunidades de economia.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Refresh Button */}
          <button
            onClick={loadAll}
            className="p-2.5 bg-white border border-border hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Atualizar Dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* New Supplier (Only for estoquista, gerente, dono) */}
          {userTipo !== "caixa" && (
            <Button onClick={handleCreateClick} className="shadow-lg shadow-primary/20 flex-1 sm:flex-initial rounded-xl font-bold py-2.5 text-xs">
              <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      {/* KPIs Grid */}
      {kpis && <FornecedorKPIsView kpis={kpis} />}

      {/* Tabs Menu */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 rounded-2xl p-1.5 w-fit border border-slate-200/40 shadow-inner">
        {[
          { id: "listagem", label: "📋 Listagem", icon: Truck },
          { id: "comparador", label: "⚖️ Comparador", icon: Scale },
          { id: "ia", label: "🧠 IA Gerente", icon: Brain },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer",
                {
                  "bg-white text-foreground shadow-md border border-slate-200/30": activeTab === tab.id,
                  "text-muted-foreground hover:text-foreground hover:bg-white/40": activeTab !== tab.id,
                }
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        
        {activeTab === "listagem" && (
          <FornecedorList
            fornecedores={fornecedores}
            total={totalFornecedores}
            filters={filters}
            setFilters={setFilters}
            userTipo={userTipo}
            onEditClick={handleEditClick}
            onRefresh={loadAll}
          />
        )}

        {activeTab === "comparador" && (
          <FornecedorComparador />
        )}

        {activeTab === "ia" && (
          <FornecedorInsights
            insights={insights}
            onTabChange={(tab) => setActiveTab(tab)}
          />
        )}

      </div>

      {/* Create/Edit Dialog */}
      <FornecedorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
        fornecedor={selectedFornecedor}
        userTipo={userTipo}
      />

    </div>
  );
}
