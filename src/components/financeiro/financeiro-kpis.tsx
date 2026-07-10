"use client";

import * as React from "react";
import type { FinanceiroKPIs } from "@/lib/types/financeiro";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  DollarSign, TrendingUp, TrendingDown, Landmark, 
  Clock, AlertTriangle, Scale, Activity, ShieldCheck, Zap
} from "lucide-react";

interface FinanceiroKPIsViewProps {
  kpis: FinanceiroKPIs & {
    liquidezImediata?: number;
    liquidezSeca?: number;
    liquidezCorrente?: number;
    capitalGiro?: number;
    ebitda?: number;
    endividamento?: number;
  };
}

export function FinanceiroKPIsView({ kpis }: FinanceiroKPIsViewProps) {
  
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 60) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (score >= 40) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-red-500 bg-red-500/10 border-red-500/20";
  };

  const getRatioStatusBadge = (val: number) => {
    if (val >= 1.5) return <span className="text-[8px] bg-emerald-50 border border-emerald-200 text-emerald-600 px-1.5 py-0.5 rounded font-black">🟢 Saudável</span>;
    if (val >= 1.0) return <span className="text-[8px] bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded font-black">🔵 Estável</span>;
    return <span className="text-[8px] bg-rose-50 border border-rose-200 text-rose-600 px-1.5 py-0.5 rounded font-black animate-pulse">🔴 Risco</span>;
  };

  const cards = [
    {
      title: "Saldo Consolidado",
      value: formatBRL(kpis.saldoConsolidado),
      subtitle: "Disponível nas Contas",
      icon: Landmark,
      color: kpis.saldoConsolidado >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50",
    },
    {
      title: "Receitas do Mês",
      value: formatBRL(kpis.receitasMes),
      subtitle: "Total recebido no mês",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Despesas do Mês",
      value: formatBRL(kpis.despesasMes),
      subtitle: "Total pago no mês",
      icon: TrendingDown,
      color: "text-rose-600 bg-rose-50",
    },
    {
      title: "Lucro / Prejuízo",
      value: formatBRL(kpis.lucroMes),
      subtitle: `Margem: ${kpis.margemOperacional.toFixed(1)}%`,
      icon: Scale,
      color: kpis.lucroMes >= 0 ? "text-violet-600 bg-violet-50" : "text-red-600 bg-red-50",
    },
    {
      title: "Contas a Receber",
      value: formatBRL(kpis.contasReceberPendente),
      subtitle: "Títulos futuros / pendentes",
      icon: DollarSign,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Contas a Pagar",
      value: formatBRL(kpis.contasPagarPendente),
      subtitle: "Compromissos pendentes",
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      title: "Inadimplência Geral",
      value: formatBRL(kpis.inadimplenciaValor),
      subtitle: "Títulos de clientes vencidos",
      icon: AlertTriangle,
      color: kpis.inadimplenciaValor > 0 ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-50",
    },
  ];

  const hasAdvanced = kpis.ebitda !== undefined;

  return (
    <div className="space-y-4">
      {/* Principal Health Score & Executive Preview Header */}
      <div className="bg-card border border-border/85 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 bg-gradient-to-r from-slate-50/50 to-indigo-50/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">Diagnóstico de Saúde Financeira</h3>
            <p className="text-[10px] text-muted-foreground">
              Projeção acumulada e liquidez contábil auditada em tempo real com RLS.
            </p>
          </div>
        </div>
        
        {/* Health Score Badge */}
        <div className="flex items-center gap-3.5 bg-white border border-border/60 p-2.5 rounded-xl self-start md:self-auto shadow-sm">
          <div className={cn("px-3 py-1 rounded-lg text-xs font-black border uppercase tracking-wider flex items-center gap-1.5", getHealthScoreColor(kpis.saudeFinanceiraScore))}>
            Índice de Saúde: {kpis.saudeFinanceiraScore} pts
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">
            {kpis.saudeFinanceiraScore >= 80 ? "🟢 Excelente" :
             kpis.saudeFinanceiraScore >= 60 ? "🔵 Boa" :
             kpis.saudeFinanceiraScore >= 40 ? "🟡 Regular" : "🔴 Crítica"}
          </span>
        </div>
      </div>

      {/* Grid of basic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index}
              className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 group hover:-translate-y-0.5"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105", card.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider truncate">{card.title}</span>
                <span className="text-base font-black text-foreground block mt-0.5 truncate">{card.value}</span>
                <span className="text-[8px] text-muted-foreground/80 font-bold block mt-0.5 truncate">{card.subtitle}</span>
              </div>
            </div>
          );
        })}

        {/* Special Resultado Projetado Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 shadow-md text-white flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black text-indigo-100 block uppercase tracking-wider truncate">Resultado Projetado (30d)</span>
            <span className="text-base font-black block mt-0.5 truncate">{formatBRL(kpis.resultadoProjetado)}</span>
            <span className="text-[8px] text-indigo-150 font-bold block mt-0.5 truncate">Saldo + Pendentes 30 dias</span>
          </div>
        </div>
      </div>

      {/* Advanced CFO Treasury Indicators (EBITDA, Liquidity Ratios) */}
      {hasAdvanced && (
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Indicadores de Tesouraria CFO</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">EBITDA Real</p>
              <p className="text-xs font-black text-foreground mt-0.5">{formatBRL(kpis.ebitda || 0)}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Capital de Giro</p>
              <p className="text-xs font-black text-foreground mt-0.5">{formatBRL(kpis.capitalGiro || 0)}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Liquidez Corrente</p>
              <p className="text-xs font-black text-foreground mt-0.5">{kpis.liquidezCorrente?.toFixed(2)}</p>
              <div className="mt-1">{getRatioStatusBadge(kpis.liquidezCorrente || 0)}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Liquidez Seca</p>
              <p className="text-xs font-black text-foreground mt-0.5">{kpis.liquidezSeca?.toFixed(2)}</p>
              <div className="mt-1">{getRatioStatusBadge(kpis.liquidezSeca || 0)}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Liquidez Imediata</p>
              <p className="text-xs font-black text-foreground mt-0.5">{kpis.liquidezImediata?.toFixed(2)}</p>
              <div className="mt-1">{getRatioStatusBadge(kpis.liquidezImediata || 0)}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Endividamento</p>
              <p className="text-xs font-black text-rose-600 mt-0.5">{(kpis.endividamento || 0).toFixed(1)}%</p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
