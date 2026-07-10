import * as React from "react";
import type { FinanceiroIAInsight } from "@/lib/types/financeiro";
import { cn } from "@/lib/utils/cn";
import { 
  Brain, Sparkles, TrendingUp, TrendingDown, 
  ArrowRight, ShieldAlert, CheckCircle, Info 
} from "lucide-react";

interface FinanceiroInsightsProps {
  insights: FinanceiroIAInsight[];
  onTabChange: (tab: "dashboard" | "receber" | "pagar" | "fluxo" | "dre" | "inadimplencia" | "ia" | "relatorios") => void;
}

export function FinanceiroInsights({
  insights,
  onTabChange,
}: FinanceiroInsightsProps) {
  
  const getInsightIcon = (tipo: string) => {
    switch (tipo) {
      case "perigo":
        return ShieldAlert;
      case "sucesso":
        return CheckCircle;
      case "alerta":
        return ShieldAlert;
      case "info":
      default:
        return Info;
    }
  };

  const getInsightColor = (tipo: string) => {
    switch (tipo) {
      case "perigo":
        return "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-900";
      case "sucesso":
        return "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-900";
      case "alerta":
        return "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-900";
      case "info":
      default:
        return "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-900";
    }
  };

  const getIconColor = (tipo: string) => {
    switch (tipo) {
      case "perigo":
        return "bg-rose-500/10 text-rose-600";
      case "sucesso":
        return "bg-emerald-500/10 text-emerald-600";
      case "alerta":
        return "bg-amber-500/10 text-amber-600";
      case "info":
      default:
        return "bg-blue-500/10 text-blue-600";
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Strategic Header */}
      <div className="relative bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 text-white rounded-3xl p-6 overflow-hidden shadow-lg border border-indigo-950">
        
        {/* Glow blur background elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 animate-pulse-glow shadow-md">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-[9px] font-black text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded uppercase tracking-wider">IA Gerente Financeira</span>
            <h2 className="text-base font-black text-white mt-1 flex items-center gap-1">
              Conselheiro Econômico Estratégico <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-[10px] text-indigo-150 mt-1 leading-relaxed max-w-xl font-medium">
              Analiso os vencimentos futuros, a inadimplência de clientes e os custos de fornecedores para prever a saúde financeira da sua loja. Veja abaixo os principais focos de atenção identificados.
            </p>
          </div>
        </div>
      </div>

      {/* Insights Cards List */}
      <div className="space-y-4">
        {insights.map((insight) => {
          const Icon = getInsightIcon(insight.tipo);
          const colorClasses = getInsightColor(insight.tipo);
          const iconColorClasses = getIconColor(insight.tipo);

          return (
            <div 
              key={insight.id}
              className={cn("bg-gradient-to-r rounded-2xl p-5 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md", colorClasses)}
            >
              <div className="flex gap-3.5 items-start">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-current/10 shadow-sm", iconColorClasses)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-black text-slate-800 leading-normal">{insight.titulo}</h4>
                  <p className="text-[10px] font-medium text-slate-600/90 leading-relaxed max-w-lg">
                    {insight.descricao}
                  </p>
                </div>
              </div>

              {/* Acionabilidade / Shortcut button */}
              {insight.acao && (
                <button
                  type="button"
                  onClick={() => {
                    if (insight.acao === "fluxo") onTabChange("fluxo");
                    else if (insight.acao === "dre") onTabChange("dre");
                    else if (insight.acao === "inadimplencia") onTabChange("inadimplencia");
                  }}
                  className={cn("px-3.5 py-2 text-[9px] font-black rounded-xl border flex items-center gap-1 self-start sm:self-auto transition-all cursor-pointer shadow-sm hover:shadow", {
                    "bg-rose-600 text-white border-rose-700 hover:bg-rose-700 shadow-rose-600/5": insight.tipo === "perigo",
                    "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-emerald-600/5": insight.tipo === "sucesso",
                    "bg-amber-600 text-white border-amber-700 hover:bg-amber-700 shadow-amber-600/5": insight.tipo === "alerta",
                    "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-indigo-600/5": insight.tipo === "info" || !insight.tipo,
                  })}
                >
                  {insight.acaoLabel || "Acessar Módulo"}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
