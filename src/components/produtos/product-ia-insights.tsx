"use client";

import * as React from "react";
import { Sparkles, ArrowUpRight, TrendingUp, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import type { Product, ProductStockAudit } from "@/lib/types/produtos";
import { computeMargin, computeEstoqueStatus } from "@/lib/types/produtos";
import { cn } from "@/lib/utils/cn";

interface ProductIAInsightsProps {
  product: Product;
  audit: ProductStockAudit;
}

interface InsightCard {
  type: "info" | "warning" | "error" | "success" | "ai";
  title: string;
  message: string;
  action?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ProductIAInsights({ product, audit }: ProductIAInsightsProps) {
  const { margem } = computeMargin(Number(product.preco_custo), Number(product.preco_venda));
  const estStatus = computeEstoqueStatus(Number(product.estoque_atual), Number(product.estoque_minimo));

  const generateInsights = (): InsightCard[] => {
    const list: InsightCard[] = [];

    // 1. Estoque Critico/Zerado
    if (Number(product.estoque_atual) <= 0) {
      list.push({
        type: "error",
        title: "Esgotado! Perda de Oportunidades",
        message: "O produto está totalmente sem estoque. Registros apontam buscas frequentes, reabasteça com urgência para não perder vendas.",
        action: "Solicitar Compra",
        icon: AlertCircle,
      });
    } else if (estStatus === "critico") {
      list.push({
        type: "warning",
        title: "Estoque Crítico detectado",
        message: `O estoque atual (${product.estoque_atual}) está abaixo do mínimo ideal (${product.estoque_minimo}).`,
        action: "Comprar Reposição",
        icon: AlertTriangle,
      });
    }

    // 2. Margem de Lucro Alerta
    if (margem < 15) {
      list.push({
        type: "error",
        title: "Alerta de Margem Crítica",
        message: `Sua margem atual está em ${margem.toFixed(1)}%. O custo unitário está muito próximo do preço de venda. Recomendamos elevar o preço para pelo menos ${((Number(product.preco_custo) * 1.35)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (margem de 26%) para manter a operação saudável.`,
        action: "Ajustar Preço",
        icon: AlertTriangle,
      });
    } else if (margem >= 40) {
      list.push({
        type: "success",
        title: "Excelente Margem de Contribuição",
        message: `Com ${margem.toFixed(1)}% de margem, este produto é altamente rentável. Ótima oportunidade para oferecer descontos progressivos em kits ou usá-lo como isca de atração.`,
        icon: TrendingUp,
      });
    }

    // 3. Giro de Estoque
    if (audit.totalVendido > 15) {
      list.push({
        type: "ai",
        title: "Alta Demanda (Curva A)",
        message: `Este produto teve ${audit.totalVendido} saídas nos últimos dias. Mantendo este ritmo, seu estoque durará aproximadamente ${(Number(product.estoque_atual) / (audit.totalVendido / 30 || 1)).toFixed(0)} dias. Programe compras automáticas.`,
        icon: Sparkles,
      });
    } else if (audit.totalVendido === 0 && audit.movimentacoes30d === 0 && Number(product.estoque_atual) > 0) {
      list.push({
        type: "warning",
        title: "Estoque Parado sem Giro",
        message: "Nenhuma venda registrada nos últimos 30 dias. Este item está ocupando espaço e capital de giro. Considere criar uma promoção de queima de estoque.",
        action: "Criar Promoção",
        icon: RefreshCw,
      });
    }

    // Default insight if empty
    if (list.length === 0) {
      list.push({
        type: "info",
        title: "Desempenho Estável",
        message: "O produto mantém níveis saudáveis de estoque, margem de contribuição média estável e giro compatível com a categoria. Nenhuma ação recomendada no momento.",
        icon: Sparkles,
      });
    }

    return list;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Sparkles className="w-4 h-4 text-ia animate-pulse" />
        <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
          Recomendações e Insights IA
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <div
              key={idx}
              className={cn(
                "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
                {
                  "bg-red-500/5 border-red-500/20 text-foreground":
                    insight.type === "error",
                  "bg-amber-500/5 border-amber-500/20 text-foreground":
                    insight.type === "warning",
                  "bg-emerald-500/5 border-emerald-500/20 text-foreground":
                    insight.type === "success",
                  "bg-primary/5 border-primary/20 text-foreground":
                    insight.type === "info",
                  "bg-gradient-to-r from-ia/15 to-violet-500/10 border-ia/30 shadow-glow-purple text-foreground":
                    insight.type === "ai",
                }
              )}
            >
              <div className="flex gap-3 items-start">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                    {
                      "bg-red-500/10 text-red-400": insight.type === "error",
                      "bg-amber-500/10 text-amber-400": insight.type === "warning",
                      "bg-emerald-500/10 text-emerald-400":
                        insight.type === "success",
                      "bg-primary/10 text-primary-400": insight.type === "info",
                      "bg-ia/20 text-ia animate-pulse": insight.type === "ai",
                    }
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 space-y-1">
                  <h4
                    className={cn("text-sm font-semibold", {
                      "text-red-400": insight.type === "error",
                      "text-amber-400": insight.type === "warning",
                      "text-emerald-400": insight.type === "success",
                      "text-primary": insight.type === "info",
                      "text-ia font-bold": insight.type === "ai",
                    })}
                  >
                    {insight.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                    {insight.message}
                  </p>
                  
                  {insight.action && (
                    <button
                      onClick={() => alert(`Ação "${insight.action}" será integrada com o módulo de Compras/Vendas na próxima fase.`)}
                      className={cn(
                        "inline-flex items-center text-[10px] font-bold uppercase tracking-wider gap-0.5 mt-2 transition-colors cursor-pointer",
                        {
                          "text-red-400 hover:text-red-300": insight.type === "error",
                          "text-amber-400 hover:text-amber-300": insight.type === "warning",
                          "text-ia hover:text-ia/80": insight.type === "ai",
                        }
                      )}
                    >
                      {insight.action}
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
