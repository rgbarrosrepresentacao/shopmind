import * as React from "react";
import type { FornecedorIAInsight } from "@/lib/types/fornecedores";
import { cn } from "@/lib/utils/cn";
import {
  Brain, Sparkles, TrendingUp, Truck, ShieldAlert, Award, PiggyBank
} from "lucide-react";

interface FornecedorInsightsProps {
  insights: FornecedorIAInsight[];
  onTabChange?: (tab: "listagem" | "comparador" | "ia") => void;
}

export function FornecedorInsights({ insights, onTabChange }: FornecedorInsightsProps) {
  return (
    <div className="space-y-6">
      {/* 1. IA Gerente Insights */}
      <div>
        <h3 className="text-xs font-black text-foreground flex items-center gap-2 mb-3 uppercase tracking-wider">
          <Brain className="w-4 h-4 text-purple-600 animate-pulse" /> IA Gerente — Análises e Recomendações
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map(insight => (
            <div key={insight.id} className={cn(
              "border rounded-2xl p-5 shadow-sm space-y-2.5 transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
              insight.tipo === "perigo" ? "bg-gradient-to-br from-red-50 to-red-100/30 border-red-100" :
              insight.tipo === "alerta" ? "bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-100" :
              insight.tipo === "sucesso" ? "bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-100" :
              "bg-gradient-to-br from-purple-50/80 to-indigo-100/20 border-purple-100/60"
            )}>
              <div className="flex items-start gap-3.5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", {
                  "bg-red-500 text-white": insight.tipo === "perigo",
                  "bg-amber-500 text-white": insight.tipo === "alerta",
                  "bg-emerald-500 text-white": insight.tipo === "sucesso",
                  "bg-purple-600 text-white animate-pulse-glow": insight.tipo === "info",
                })}>
                  <Brain className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-black tracking-wider text-purple-600 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> IA Gerente
                  </span>
                  <h4 className="text-xs font-black text-foreground">{insight.titulo}</h4>
                  <p className="text-[10px] text-slate-700 leading-relaxed">{insight.descricao}</p>
                  {insight.acao === "comparador" && onTabChange && (
                    <button onClick={() => onTabChange("comparador")} 
                      className="inline-flex items-center text-[10px] font-bold text-primary hover:underline mt-1.5 cursor-pointer">
                      {insight.acaoLabel} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Central de Insights */}
      <div>
        <h3 className="text-xs font-black text-foreground flex items-center gap-2 mb-3 uppercase tracking-wider">
          <Award className="w-4 h-4 text-primary" /> Central de Insights de Relacionamento
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Menor Custo */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-2 flex flex-col justify-between hover:border-primary/30 transition-colors">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><PiggyBank className="w-4 h-4" /></div>
              <h4 className="text-xs font-black text-foreground">Menor Custo</h4>
              <p className="text-[9px] text-muted-foreground leading-normal">O comparador de custos analisa concorrentes apontando onde economizar.</p>
            </div>
            <button onClick={() => onTabChange?.("comparador")} className="text-[9px] font-bold text-primary hover:underline mt-2 text-left cursor-pointer">Comparar Preços →</button>
          </div>

          {/* Mais Utilizado */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-2 flex flex-col justify-between hover:border-primary/30 transition-colors">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Truck className="w-4 h-4" /></div>
              <h4 className="text-xs font-black text-foreground">Mais Utilizado</h4>
              <p className="text-[9px] text-muted-foreground leading-normal">Destaca fornecedores líderes pelo maior volume financeiro de compras.</p>
            </div>
            <button onClick={() => onTabChange?.("listagem")} className="text-[9px] font-bold text-primary hover:underline mt-2 text-left cursor-pointer">Ver Líderes →</button>
          </div>

          {/* Inativo */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-2 flex flex-col justify-between hover:border-primary/30 transition-colors">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><ShieldAlert className="w-4 h-4" /></div>
              <h4 className="text-xs font-black text-foreground">Inativos</h4>
              <p className="text-[9px] text-muted-foreground leading-normal">Detecta automaticamente fornecedores inativos (30, 60, 90 ou 120 dias).</p>
            </div>
            <button onClick={() => onTabChange?.("listagem")} className="text-[9px] font-bold text-primary hover:underline mt-2 text-left cursor-pointer">Filtrar Inativos →</button>
          </div>

          {/* Crescimento de Preço */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-2 flex flex-col justify-between hover:border-primary/30 transition-colors">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
              <h4 className="text-xs font-black text-foreground">Variação de Preços</h4>
              <p className="text-[9px] text-muted-foreground leading-normal">Registra aumentos anormais e flutuações de custos nos itens fornecidos.</p>
            </div>
            <span className="text-[9px] text-muted-foreground/60 italic mt-2 font-bold">Monitoramento Ativo</span>
          </div>

          {/* Estratégico */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-2 flex flex-col justify-between hover:border-primary/30 transition-colors">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
              <h4 className="text-xs font-black text-foreground">Estratégicos</h4>
              <p className="text-[9px] text-muted-foreground leading-normal">Pontua fornecedores de 0 a 100 baseado em volume, recência e frequência.</p>
            </div>
            <button onClick={() => onTabChange?.("listagem")} className="text-[9px] font-bold text-primary hover:underline mt-2 text-left cursor-pointer">Ver Scores →</button>
          </div>

        </div>
      </div>
    </div>
  );
}
