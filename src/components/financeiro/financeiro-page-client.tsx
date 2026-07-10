"use client";

import * as React from "react";
import type { FinanceiroKPIs, FinanceiroTransacao, FinanceiroIAInsight } from "@/lib/types/financeiro";
import { getFinanceiroKPIs, getFinanceiroIAInsights } from "@/lib/actions/financeiro";
import { FinanceiroKPIsView } from "./financeiro-kpis";
import { FinanceiroReceber } from "./financeiro-receber";
import { FinanceiroPagar } from "./financeiro-pagar";
import { FinanceiroFluxo } from "./financeiro-fluxo";
import { FinanceiroDRE } from "./financeiro-dre";
import { FinanceiroInadimplencia } from "./financeiro-inadimplencia";
import { FinanceiroInsights } from "./financeiro-insights";
import { FinanceiroRelatorios } from "./financeiro-relatorios";
import { FinanceiroDialog } from "./financeiro-dialogs";

// Importar novos componentes da Fase 5A
import { FinanceiroTesouraria } from "./financeiro-tesouraria";
import { FinanceiroCalendario } from "./financeiro-calendario";
import { FinanceiroConciliacao } from "./financeiro-conciliacao";
import { FinanceiroAuditoria } from "./financeiro-auditoria";
import { FinanceiroFechamento } from "./financeiro-fechamento";
import { FinanceiroCaixas } from "./financeiro-caixas";

import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { 
  Landmark, TrendingUp, TrendingDown, ArrowRightLeft, 
  Scale, AlertTriangle, Brain, FileText, RefreshCw, Plus,
  Coins, Calendar, ShieldCheck, Lock, Unlock
} from "lucide-react";

interface FinanceiroPageClientProps {
  userTipo?: string;
}

type TabType = 
  | "dashboard" 
  | "tesouraria"
  | "receber" 
  | "pagar" 
  | "fluxo" 
  | "dre" 
  | "calendario"
  | "conciliacao"
  | "auditoria"
  | "fechamento"
  | "caixas"
  | "inadimplencia" 
  | "ia" 
  | "relatorios";

export default function FinanceiroPageClient({ userTipo = "caixa" }: FinanceiroPageClientProps) {
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabType>("dashboard");
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Data states
  const [kpis, setKpis] = React.useState<any | null>(null);
  const [insights, setInsights] = React.useState<FinanceiroIAInsight[]>([]);

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedTransacao, setSelectedTransacao] = React.useState<FinanceiroTransacao | null>(null);

  React.useEffect(() => {
    loadFinanceiroData();
  }, [refreshTrigger]);

  const loadFinanceiroData = async () => {
    setLoading(true);
    try {
      const [resKpis, resIA] = await Promise.all([
        getFinanceiroKPIs(),
        getFinanceiroIAInsights(),
      ]);
      setKpis(resKpis);
      setInsights(resIA.data || []);
    } catch {
      toast.error("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewLancamento = () => {
    setSelectedTransacao(null);
    setIsDialogOpen(true);
  };

  const handleEditLancamento = (t: FinanceiroTransacao) => {
    setSelectedTransacao(t);
    setIsDialogOpen(true);
  };

  const handleRefreshNeeded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading && !kpis) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-muted rounded-xl w-1/3" />
          <div className="h-10 bg-muted rounded-xl w-32" />
        </div>
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary animate-in fade-in duration-300" /> Centro Financeiro Inteligente
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Demonstrativo contábil, fluxo de caixa corporativo, reconciliações e controle integrado de tesouraria.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Refresh button */}
          <button
            onClick={handleRefreshNeeded}
            className="p-2.5 bg-white border border-border hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Atualizar Dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* New manual transaction button */}
          <button
            onClick={handleNewLancamento}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/10 flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Main KPI panel (Rendered above tabs for global context) */}
      {kpis && <FinanceiroKPIsView kpis={kpis} />}

      {/* Responsive Horizontal Scroll Menu Tabs */}
      <div className="overflow-x-auto flex-shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 bg-slate-100/80 rounded-2xl p-1.5 w-max border border-slate-200/40 shadow-inner">
          {[
            { id: "dashboard", label: "📊 Painel", icon: Landmark },
            { id: "tesouraria", label: "🏦 Tesouraria", icon: Coins },
            { id: "receber", label: "📈 A Receber", icon: TrendingUp },
            { id: "pagar", label: "📉 A Pagar", icon: TrendingDown },
            { id: "fluxo", label: "🔄 Fluxo & Forecast", icon: ArrowRightLeft },
            { id: "dre", label: "🧾 DRE Cascata", icon: Scale },
            { id: "calendario", label: "📅 Calendário", icon: Calendar },
            { id: "conciliacao", label: "🔍 Conciliação", icon: RefreshCw },
            { id: "auditoria", label: "🛡️ Auditoria & Razão", icon: ShieldCheck },
            { id: "fechamento", label: "🔒 Fechamentos", icon: Lock },
            { id: "caixas", label: "💸 Gestão de Caixas", icon: Unlock },
            { id: "inadimplencia", label: "🚨 Inadimplência", icon: AlertTriangle },
            { id: "ia", label: "🧠 IA Financeira", icon: Brain },
            { id: "relatorios", label: "📄 Relatórios", icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
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
      </div>

      {/* Tab Content Panels */}
      <div className="transition-all duration-300">
        
        {/* Tab 1: Dashboard / Brief View */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* DRE Simplificado Brief Card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Demonstrativo DRE (Mês Atual)</h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Cascata resumida de receitas, custos e margem.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("dre")}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    Ver Completo →
                  </button>
                </div>
                <FinanceiroDRE />
              </div>
            </div>

            {/* AI Advisor Panel Brief */}
            <div className="space-y-4">
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Avisos da IA Gerente</h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Insights analíticos automáticos.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("ia")}
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Ver Todos →
                  </button>
                </div>
                <FinanceiroInsights 
                  insights={insights.slice(0, 2)} 
                  onTabChange={(t) => setActiveTab(t as any)} 
                />
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Tesouraria & Contas [NEW] */}
        {activeTab === "tesouraria" && (
          <FinanceiroTesouraria />
        )}

        {/* Tab 3: Contas a Receber */}
        {activeTab === "receber" && (
          <FinanceiroReceber
            onEditClick={handleEditLancamento}
            onNewClick={handleNewLancamento}
            refreshTrigger={refreshTrigger}
            onRefreshNeeded={handleRefreshNeeded}
          />
        )}

        {/* Tab 4: Contas a Pagar */}
        {activeTab === "pagar" && (
          <FinanceiroPagar
            onEditClick={handleEditLancamento}
            onNewClick={handleNewLancamento}
            refreshTrigger={refreshTrigger}
            onRefreshNeeded={handleRefreshNeeded}
          />
        )}

        {/* Tab 5: Fluxo de Caixa Projetado */}
        {activeTab === "fluxo" && (
          <FinanceiroFluxo />
        )}

        {/* Tab 6: DRE Completo */}
        {activeTab === "dre" && (
          <FinanceiroDRE />
        )}

        {/* Tab 7: Calendário Executivo [NEW] */}
        {activeTab === "calendario" && (
          <FinanceiroCalendario />
        )}

        {/* Tab 8: Conciliação Bancária [NEW] */}
        {activeTab === "conciliacao" && (
          <FinanceiroConciliacao />
        )}

        {/* Tab 9: Auditoria & Livro Razão [NEW] */}
        {activeTab === "auditoria" && (
          <FinanceiroAuditoria />
        )}

        {/* Tab 10: Fechamentos Contábeis [NEW] */}
        {activeTab === "fechamento" && (
          <FinanceiroFechamento />
        )}

        {/* Tab 11: Gestão de Caixas CashEngine [NEW] */}
        {activeTab === "caixas" && (
          <FinanceiroCaixas />
        )}

        {/* Tab 12: Inadimplência Center */}
        {activeTab === "inadimplencia" && (
          <FinanceiroInadimplencia />
        )}

        {/* Tab 13: IA Insights Completo */}
        {activeTab === "ia" && (
          <FinanceiroInsights
            insights={insights}
            onTabChange={(t) => setActiveTab(t as any)}
          />
        )}

        {/* Tab 14: Relatórios e Exportação */}
        {activeTab === "relatorios" && (
          <FinanceiroRelatorios />
        )}

      </div>

      {/* Manual Transaction Dialog */}
      <FinanceiroDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleRefreshNeeded}
        transacao={selectedTransacao}
      />

    </div>
  );
}
