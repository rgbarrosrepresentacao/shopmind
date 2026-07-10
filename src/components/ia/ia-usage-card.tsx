"use client";

import * as React from "react";
import type { IACreditos } from "@/lib/types/ia";
import { Sparkles, Brain, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface IAUsageCardProps {
  credits: IACreditos;
  onBuyClick: () => void;
  className?: string;
}

export function IAUsageCard({
  credits,
  onBuyClick,
  className,
}: IAUsageCardProps) {
  const limiteTotal = credits.consultas_incluidas + credits.consultas_extras;
  const saldoDisponivel = Math.max(0, limiteTotal - credits.consultas_utilizadas);
  const percentUsed = Math.min(100, (credits.consultas_utilizadas / limiteTotal) * 100);

  // Determinar severidade para cores do card e barra de progresso
  const isCritical = saldoDisponivel === 0 || percentUsed >= 100;
  const isWarning = !isCritical && percentUsed >= 80;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 shadow-sm",
        {
          "bg-gradient-to-br from-rose-50/20 via-card to-rose-100/10 border-rose-500/20 text-rose-950 shadow-rose-500/5": isCritical,
          "bg-gradient-to-br from-amber-50/20 via-card to-amber-100/10 border-amber-500/20 text-amber-955 shadow-amber-500/5": isWarning,
          "bg-gradient-to-br from-indigo-50/10 via-card to-purple-50/10 border-indigo-500/15 text-slate-900": !isCritical && !isWarning,
        },
        className
      )}
    >
      {/* Background soft glow */}
      <div className={cn(
        "absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20",
        {
          "bg-rose-500": isCritical,
          "bg-amber-500": isWarning,
          "bg-indigo-500": !isCritical && !isWarning,
        }
      )} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm flex-shrink-0",
              {
                "bg-rose-500/10 border-rose-500/20 text-rose-600": isCritical,
                "bg-amber-500/10 border-amber-500/20 text-amber-600": isWarning,
                "bg-indigo-500/10 border-indigo-500/20 text-indigo-600": !isCritical && !isWarning,
              }
            )}
          >
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <Brain className="w-5 h-5 text-ia animate-pulse-glow" />
            )}
          </div>
          <div>
            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded uppercase tracking-wider">
              Consumo de Créditos
            </span>
            <h4 className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1">
              IA Gerente ShopMind <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h4>
          </div>
        </div>

        {/* Custo estimado (administração visual) */}
        {credits.custo_estimado > 0 && (
          <span className="text-[8px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40">
            Custo: ${Number(credits.custo_estimado).toFixed(4)}
          </span>
        )}
      </div>

      {/* Uso das consultas */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-black text-slate-800">
            {credits.consultas_utilizadas} / {limiteTotal} <span className="text-[10px] text-muted-foreground font-semibold">consultas usadas</span>
          </span>
          <span
            className={cn("text-xs font-extrabold", {
              "text-rose-600": isCritical,
              "text-amber-600": isWarning,
              "text-emerald-600": !isCritical && !isWarning,
            })}
          >
            {saldoDisponivel} disponíveis
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full h-2 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", {
              "bg-rose-500 shadow-sm shadow-rose-500/20": isCritical,
              "bg-amber-500 shadow-sm shadow-amber-500/20": isWarning,
              "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-sm shadow-indigo-500/20": !isCritical && !isWarning,
            })}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Alertas */}
      {isCritical && (
        <div className="mt-3.5 p-2 rounded-xl bg-rose-50 border border-rose-200/30 text-[9px] font-bold text-rose-800 flex items-center gap-1.5 leading-relaxed animate-fade-in">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
          Limite mensal esgotado. Suas consultas à IA estão bloqueadas até a renovação mensal ou recarga extra.
        </div>
      )}

      {isWarning && (
        <div className="mt-3.5 p-2 rounded-xl bg-amber-50 border border-amber-200/30 text-[9px] font-bold text-amber-850 flex items-center gap-1.5 leading-relaxed animate-fade-in">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          Atenção: Sua loja atingiu mais de 80% do limite de consultas de IA deste mês.
        </div>
      )}

      {!isCritical && !isWarning && (
        <div className="mt-3.5 p-2 rounded-xl bg-indigo-50/50 border border-indigo-100/20 text-[9px] font-bold text-indigo-850 flex items-center gap-1.5 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          IA Gerente ativada e pronta para responder perguntas operacionais e financeiras.
        </div>
      )}

      {/* Botões operacionais */}
      <div className="mt-4 flex gap-2 items-center">
        <button
          onClick={onBuyClick}
          className={cn(
            "w-full py-2 px-3 text-[10px] font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm",
            {
              "bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/10": isCritical,
              "bg-amber-600 hover:bg-amber-700 text-white border-amber-700 shadow-amber-600/10": isWarning,
              "bg-white hover:bg-slate-50 text-slate-700 border-border": !isCritical && !isWarning,
            }
          )}
        >
          <Zap className={cn("w-3 h-3", { "text-amber-300": isCritical || isWarning })} />
          Comprar Mais Consultas
        </button>
      </div>
    </div>
  );
}
