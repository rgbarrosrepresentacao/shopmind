"use client";

import * as React from "react";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  TrendingUp,
  Zap,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ProductKPIs } from "@/lib/types/produtos";
import { formatBRL, formatPercent } from "@/lib/types/produtos";

interface ProdutosKPIsProps {
  kpis: ProductKPIs;
}

interface KPICardData {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
  iconBg: string;
  pulse?: boolean;
}

export function ProdutosKPIs({ kpis }: ProdutosKPIsProps) {
  const cards: KPICardData[] = [
    {
      label: "Total de Produtos",
      value: kpis.total,
      subtitle: `${kpis.ativos} ativos`,
      icon: Package,
      color: "text-blue-400",
      bgGradient: "from-blue-500/10 to-blue-600/5",
      iconBg: "bg-blue-500/15 text-blue-400",
    },
    {
      label: "Produtos Ativos",
      value: kpis.ativos,
      subtitle: `${kpis.total > 0 ? ((kpis.ativos / kpis.total) * 100).toFixed(0) : 0}% do catálogo`,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgGradient: "from-emerald-500/10 to-emerald-600/5",
      iconBg: "bg-emerald-500/15 text-emerald-400",
    },
    {
      label: "Estoque Baixo",
      value: kpis.estoqueBaixo,
      subtitle: "Próximo do mínimo",
      icon: AlertTriangle,
      color: "text-amber-400",
      bgGradient: "from-amber-500/10 to-amber-600/5",
      iconBg: "bg-amber-500/15 text-amber-400",
      pulse: kpis.estoqueBaixo > 0,
    },
    {
      label: "Sem Estoque",
      value: kpis.semEstoque,
      subtitle: "Reposição urgente",
      icon: XCircle,
      color: "text-red-400",
      bgGradient: "from-red-500/10 to-red-600/5",
      iconBg: "bg-red-500/15 text-red-400",
      pulse: kpis.semEstoque > 0,
    },
    {
      label: "Valor em Estoque",
      value: formatBRL(kpis.valorEstoque),
      subtitle: "A preço de custo",
      icon: DollarSign,
      color: "text-violet-400",
      bgGradient: "from-violet-500/10 to-violet-600/5",
      iconBg: "bg-violet-500/15 text-violet-400",
    },
    {
      label: "Margem Média",
      value: formatPercent(kpis.margemMedia),
      subtitle: kpis.margemMedia >= 30 ? "Margem saudável" : kpis.margemMedia >= 15 ? "Margem média" : "Margem baixa",
      icon: TrendingUp,
      color: kpis.margemMedia >= 30 ? "text-emerald-400" : kpis.margemMedia >= 15 ? "text-amber-400" : "text-red-400",
      bgGradient: kpis.margemMedia >= 30 ? "from-emerald-500/10 to-emerald-600/5" : kpis.margemMedia >= 15 ? "from-amber-500/10 to-amber-600/5" : "from-red-500/10 to-red-600/5",
      iconBg: kpis.margemMedia >= 30 ? "bg-emerald-500/15 text-emerald-400" : kpis.margemMedia >= 15 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400",
    },
    {
      label: "Alto Giro",
      value: kpis.giroAlto,
      subtitle: "Produtos com saída rápida",
      icon: Zap,
      color: "text-cyan-400",
      bgGradient: "from-cyan-500/10 to-cyan-600/5",
      iconBg: "bg-cyan-500/15 text-cyan-400",
    },
    {
      label: "Baixo Giro",
      value: kpis.giroBaixo,
      subtitle: "Pouca movimentação",
      icon: TrendingDown,
      color: "text-orange-400",
      bgGradient: "from-orange-500/10 to-orange-600/5",
      iconBg: "bg-orange-500/15 text-orange-400",
      pulse: kpis.giroBaixo > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br p-4 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5 group",
              card.bgGradient
            )}
          >
            {/* Background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative flex items-start justify-between mb-3">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg transition-transform duration-300 group-hover:scale-110",
                  card.iconBg
                )}
              >
                <Icon
                  className={cn("w-4.5 h-4.5", card.pulse && "animate-pulse")}
                />
              </div>
            </div>

            <div className="relative">
              <p className={cn("text-2xl font-bold tracking-tight", card.color)}>
                {card.value}
              </p>
              <p className="text-[11px] font-semibold text-foreground/80 mt-0.5">
                {card.label}
              </p>
              {card.subtitle && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
