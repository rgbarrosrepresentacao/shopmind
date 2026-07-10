"use client";

import * as React from "react";
import type { SuspendedSale } from "@/lib/types/pdv";
import { formatBRL } from "@/lib/types/produtos";
import { X, Play, Trash2, Clock } from "lucide-react";

interface PDVSuspendedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suspendedSales: SuspendedSale[];
  onResumeSale: (sale: SuspendedSale) => void;
  onDiscardSale: (saleId: string) => void;
}

export const PDVSuspendedDialog: React.FC<PDVSuspendedDialogProps> = ({
  isOpen,
  onClose,
  suspendedSales,
  onResumeSale,
  onDiscardSale,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog Body */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            📂 Vendas Suspensas / Salvas (F8)
            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black px-2 py-0.5 rounded-full">
              {suspendedSales.length} salvas
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suspended Sales List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-slate-50/20">
          {suspendedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground/20 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-muted-foreground">Nenhuma Venda Suspensa</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
                Suspenda uma venda ativa no carrinho (`F7`) para atendê-la mais tarde.
              </p>
            </div>
          ) : (
            suspendedSales.map((sale) => {
              const subtotal = sale.items.reduce((acc, i) => acc + (i.produto.preco_venda * i.quantidade), 0);
              const itemsCount = sale.items.reduce((acc, i) => acc + i.quantidade, 0);

              return (
                <div
                  key={sale.id}
                  className="flex items-center justify-between bg-white border border-border/80 rounded-xl p-4 shadow-sm hover:border-border transition-colors group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {sale.identificador || `Identificação #${sale.id.substring(0, 4)}`}
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                        {itemsCount} {itemsCount === 1 ? "item" : "itens"}
                      </span>
                    </div>

                    <div className="text-[10px] text-muted-foreground space-x-1">
                      <span>Salvo em: {new Date(sale.created_at).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}</span>
                      {sale.cliente && <span>| Cliente: <strong className="text-slate-700">{sale.cliente.nome}</strong></span>}
                    </div>

                    <p className="text-xs font-black text-primary mt-1">
                      {formatBRL(Math.max(0, subtotal - sale.descontoGeral))}
                    </p>
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onResumeSale(sale);
                        onClose();
                      }}
                      className="px-3.5 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 active:scale-[0.98]"
                    >
                      <Play className="w-3 h-3 fill-current" /> Retomar
                    </button>

                    <button
                      onClick={() => onDiscardSale(sale.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Suspensa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
