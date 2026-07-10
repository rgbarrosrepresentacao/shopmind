"use client";

import * as React from "react";
import { Clock, User, PlusCircle, Edit, Trash2, ArrowRight } from "lucide-react";
import type { ProductActivity } from "@/lib/types/produtos";
import { formatBRL } from "@/lib/types/produtos";
import { cn } from "@/lib/utils/cn";

interface ProductHistoryProps {
  history: ProductActivity[];
}

export function ProductHistory({ history }: ProductHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum histórico de alterações disponível para este produto.
      </div>
    );
  }

  // Format field names for readable diffs
  const formatFieldName = (key: string): string => {
    const names: Record<string, string> = {
      nome: "Nome",
      sku: "SKU",
      codigo_barras: "Código de Barras",
      marca: "Marca",
      descricao: "Descrição",
      categoria_id: "Categoria ID",
      preco_custo: "Preço de Custo",
      preco_venda: "Preço de Venda",
      estoque_atual: "Estoque Atual",
      estoque_minimo: "Estoque Mínimo",
      unidade: "Unidade",
      status: "Status",
      favorito: "Favorito",
      destaque: "Destaque",
      ncm: "NCM",
      cest: "CEST",
      origem_fiscal: "Origem Fiscal",
      foto_url: "Foto URL",
    };
    return names[key] || key;
  };

  // Format values for diffs
  const formatDiffValue = (key: string, val: any): string => {
    if (val === null || val === undefined || val === "") return "vazio";
    if (typeof val === "boolean") return val ? "Sim" : "Não";
    if (key.includes("preco_") || key === "lucro") {
      return formatBRL(Number(val));
    }
    return String(val);
  };

  // Generate diff between two objects
  const getDiff = (before: any, after: any) => {
    if (!before || !after) return [];
    const diffs: { field: string; from: any; to: any }[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    // Ignore meta fields
    const ignoredKeys = ["updated_at", "created_at", "loja_id", "id", "deleted_at"];

    for (const key of keys) {
      if (ignoredKeys.includes(key)) continue;
      
      const valBefore = before[key];
      const valAfter = after[key];

      // Compare as strings/numbers
      if (String(valBefore) !== String(valAfter)) {
        diffs.push({
          field: key,
          from: valBefore,
          to: valAfter,
        });
      }
    }
    return diffs;
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((activity, idx) => {
          const isLast = idx === history.length - 1;
          const date = new Date(activity.created_at).toLocaleString("pt-BR");
          
          let icon = <Clock className="w-4 h-4" />;
          let iconBg = "bg-muted text-muted-foreground";
          let actionTitle = activity.acao;

          if (activity.acao === "criar" || activity.acao === "criacao") {
            icon = <PlusCircle className="w-4 h-4" />;
            iconBg = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            actionTitle = "Produto Cadastrado";
          } else if (activity.acao === "editar" || activity.acao === "edicao") {
            icon = <Edit className="w-4 h-4" />;
            iconBg = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
            actionTitle = "Produto Editado";
          } else if (activity.acao === "excluir" || activity.acao === "exclusao") {
            icon = <Trash2 className="w-4 h-4" />;
            iconBg = "bg-red-500/10 text-red-400 border border-red-500/20";
            actionTitle = "Produto Excluído";
          }

          const diffs =
            activity.acao === "editar" || activity.acao === "edicao"
              ? getDiff(activity.dados_anteriores, activity.dados_novos)
              : [];

          return (
            <li key={activity.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-border/40"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                      iconBg
                    )}
                  >
                    {icon}
                  </div>

                  {/* Log Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        {actionTitle}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {date}
                      </div>
                    </div>
                    
                    {/* User */}
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-muted-foreground/60" />
                      Por: <span className="font-medium text-foreground/80">{activity.usuario_nome}</span>
                    </div>

                    {/* Diff Display for Edits */}
                    {diffs.length > 0 && (
                      <div className="mt-2.5 bg-muted/30 border border-border/50 rounded-lg p-2.5 space-y-1.5">
                        {diffs.map((diff) => (
                          <div
                            key={diff.field}
                            className="flex flex-wrap items-center gap-1 text-xs text-foreground/90 font-mono"
                          >
                            <span className="font-semibold text-muted-foreground">
                              {formatFieldName(diff.field)}:
                            </span>
                            <span className="bg-red-500/5 text-red-400 px-1 py-0.5 rounded border border-red-500/10 line-through">
                              {formatDiffValue(diff.field, diff.from)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="bg-emerald-500/5 text-emerald-400 px-1 py-0.5 rounded border border-emerald-500/10 font-bold">
                              {formatDiffValue(diff.field, diff.to)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Creation Initial Values */}
                    {(activity.acao === "criar" || activity.acao === "criacao") && activity.dados_novos && (
                      <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        Preço inicial de venda:{" "}
                        <span className="font-semibold font-mono text-foreground">
                          {formatBRL(Number(activity.dados_novos.preco_venda))}
                        </span>{" "}
                        | Estoque inicial:{" "}
                        <span className="font-semibold font-mono text-foreground">
                          {Number(activity.dados_novos.estoque_atual)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
