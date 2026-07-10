"use client";

import * as React from "react";
import type { CartItem } from "@/lib/types/pdv";
import { formatBRL } from "@/lib/types/produtos";
import { Trash2, Plus, Minus, Tag, Calculator } from "lucide-react";
import { validarLimiteDesconto } from "@/lib/types/pdv";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

interface PDVCartProps {
  items: CartItem[];
  userRole: string; // 'caixa' | 'gerente' | 'dono'
  descontoGeral: number;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onSuspendSale: () => void;
  onCheckout: () => void;
  onUpdateDescontoGeral: (discount: number) => void;
}

export const PDVCart: React.FC<PDVCartProps> = ({
  items,
  userRole,
  descontoGeral,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  onSuspendSale,
  onCheckout,
  onUpdateDescontoGeral,
}) => {
  const [editingDescontoGeral, setEditingDescontoGeral] = React.useState(false);
  const [tempDescontoGeral, setTempDescontoGeral] = React.useState(descontoGeral.toString());

  // Computations
  const subtotal = React.useMemo(() => {
    return items.reduce((acc, item) => acc + (item.produto.preco_venda * item.quantidade), 0);
  }, [items]);

  const totalItemDiscounts = React.useMemo(() => {
    return items.reduce((acc, item) => acc + item.desconto, 0);
  }, [items]);

  const totalDiscount = totalItemDiscounts + descontoGeral;
  const netTotal = Math.max(0, subtotal - totalDiscount);

  // Validate discount per item when modified
  const handleItemDiscountChange = (item: CartItem, discountStr: string) => {
    const val = parseFloat(discountStr) || 0;
    if (val < 0) return;

    // Limit item discount to product value
    const itemSubtotal = item.produto.preco_venda * item.quantidade;
    if (val > itemSubtotal) {
      toast.error("O desconto não pode ser maior que o subtotal do item.");
      return;
    }

    // Verify profile limit
    const hypotheticalTotalDiscount = totalDiscount - item.desconto + val;
    const isAllowed = validarLimiteDesconto(subtotal, hypotheticalTotalDiscount, userRole);
    
    if (!isAllowed) {
      toast.error(
        `Desconto não permitido. Seu limite (${
          userRole === "caixa" ? "10%" : "30%"
        }) foi excedido. Exige autorização.`
      );
      return;
    }

    onUpdateDiscount(item.produto.id, val);
  };

  // Validate general discount
  const handleApplyDescontoGeral = () => {
    const val = parseFloat(tempDescontoGeral) || 0;
    if (val < 0) return;

    if (val > subtotal - totalItemDiscounts) {
      toast.error("Desconto geral excede o saldo da venda.");
      return;
    }

    const hypotheticalTotalDiscount = totalItemDiscounts + val;
    const isAllowed = validarLimiteDesconto(subtotal, hypotheticalTotalDiscount, userRole);

    if (!isAllowed) {
      toast.error(
        `Desconto não permitido. Seu limite (${
          userRole === "caixa" ? "10%" : "30%"
        }) foi excedido.`
      );
      return;
    }

    onUpdateDescontoGeral(val);
    setEditingDescontoGeral(false);
  };

  React.useEffect(() => {
    setTempDescontoGeral(descontoGeral.toString());
  }, [descontoGeral]);

  return (
    <div className="flex flex-col h-full bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm relative">
      
      {/* Header Cart */}
      <div className="px-5 py-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-black tracking-tight text-foreground flex items-center gap-2">
          🛒 Carrinho de Compras
          <span className="bg-primary/10 text-primary font-black text-xs px-2 py-0.5 rounded-full">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </span>
        </h3>
        <span className="text-[10px] uppercase font-bold text-muted-foreground bg-slate-100 border border-border/30 px-2 py-0.5 rounded">
          Operador: {userRole.toUpperCase()}
        </span>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-slate-50/10">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Calculator className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">Carrinho Vazio</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
              Selecione produtos no catálogo ou utilize o leitor de código de barras.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.produto.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-border/60 rounded-xl p-3.5 gap-3 shadow-sm hover:border-border transition-colors group"
            >
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">
                  {item.produto.nome}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Unitário: {formatBRL(item.produto.preco_venda)}
                </p>
              </div>

              {/* Adjust Quantity (Touch Optimized) */}
              <div className="flex items-center border border-border rounded-lg bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.produto.id, Math.max(1, item.quantidade - 1))}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-l-lg transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    onUpdateQuantity(item.produto.id, val);
                  }}
                  className="w-10 text-center bg-transparent border-none text-xs font-bold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.produto.id, item.quantidade + 1)}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-r-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Discount / Item Price */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                {/* Desconto Item Input */}
                <div className="relative flex items-center max-w-[80px]">
                  <Tag className="absolute left-2 w-3 h-3 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Desc"
                    value={item.desconto || ""}
                    onChange={(e) => handleItemDiscountChange(item, e.target.value)}
                    className="w-full pl-6 pr-1.5 py-1.5 bg-slate-50 border border-border rounded-md text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="text-right min-w-[70px]">
                  <p className="text-xs font-black text-foreground">
                    {formatBRL(item.total)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.produto.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors cursor-pointer"
                  title="Remover Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals Summary & Actions Panel */}
      <div className="p-4 border-t border-border bg-slate-50/50 space-y-4">
        
        {/* Financial Summary */}
        <div className="space-y-1.5 text-xs text-muted-foreground font-medium">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold text-foreground">{formatBRL(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center h-6">
            <span className="flex items-center gap-1">
              Descontos
              {editingDescontoGeral ? (
                <div className="flex items-center gap-1 ml-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tempDescontoGeral}
                    onChange={(e) => setTempDescontoGeral(e.target.value)}
                    className="w-16 px-1.5 py-0.5 text-[10px] font-bold bg-white border border-border rounded outline-none"
                  />
                  <button
                    onClick={handleApplyDescontoGeral}
                    className="px-1.5 py-0.5 text-[9px] bg-primary text-white rounded font-bold cursor-pointer"
                  >
                    Ok
                  </button>
                  <button
                    onClick={() => {
                      setTempDescontoGeral(descontoGeral.toString());
                      setEditingDescontoGeral(false);
                    }}
                    className="px-1.5 py-0.5 text-[9px] bg-slate-200 text-slate-600 rounded font-bold cursor-pointer"
                  >
                    X
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingDescontoGeral(true)}
                  className="text-[10px] text-primary font-bold hover:underline ml-1 cursor-pointer"
                >
                  (Editar Geral)
                </button>
              )}
            </span>
            <span className="font-bold text-success">
              -{formatBRL(totalDiscount)}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-border/80">
            <span className="text-sm font-black text-foreground">Total Líquido</span>
            <span className="text-xl font-black text-primary">
              {formatBRL(netTotal)}
            </span>
          </div>
        </div>

        {/* Buttons Action Group */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onClearCart}
            className="py-2.5 border border-border text-xs font-bold text-muted-foreground bg-white hover:bg-slate-50 active:bg-slate-100 hover:text-foreground rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Limpar (F4)
          </button>
          
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onSuspendSale}
            className="py-2.5 border border-border text-xs font-bold text-muted-foreground bg-white hover:bg-slate-50 active:bg-slate-100 hover:text-foreground rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Suspender (F7)
          </button>

          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCheckout}
            className="col-span-2 py-3.5 bg-primary text-white font-extrabold text-sm rounded-xl hover:bg-primary-hover active:scale-[0.99] transition-all shadow-md shadow-primary/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            Concluir Venda (F2)
          </button>
        </div>
      </div>
    </div>
  );
};
