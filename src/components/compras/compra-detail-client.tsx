"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CompraDetalhe } from "@/lib/types/compras";
import { getCompra, cancelarCompra } from "@/lib/actions/compras";
import { formatBRL, getStatusLabel, getStatusColor, calcularImpactoMargem } from "@/lib/types/compras";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import {
  ArrowLeft, Truck, Package, Calendar, DollarSign, User,
  FileText, ShieldAlert, XCircle, Loader2, Clock,
  ArrowDownCircle, ArrowUpCircle, BarChart3,
} from "lucide-react";

export default function CompraDetailClient({ compraId, userTipo = "caixa" }: { compraId: string; userTipo?: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [compra, setCompra] = React.useState<CompraDetalhe | null>(null);
  const [cancelando, setCancelando] = React.useState(false);

  React.useEffect(() => { load(); }, [compraId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCompra(compraId);
      if (res.error) { toast.error(res.error); return; }
      setCompra(res.data);
    } catch { toast.error("Erro ao carregar compra."); }
    finally { setLoading(false); }
  };

  const handleCancelar = async () => {
    const motivo = window.prompt("Informe o motivo do cancelamento:");
    if (!motivo) return;
    setCancelando(true);
    try {
      const res = await cancelarCompra(compraId, motivo);
      if (res.error) toast.error(res.error);
      else { toast.success("Compra cancelada com sucesso."); load(); }
    } finally { setCancelando(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted animate-pulse rounded-xl w-1/3" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
        <h3 className="text-lg font-bold text-foreground">Compra não encontrada</h3>
        <Link href="/dashboard/compras" className="text-sm text-primary hover:underline mt-2 block">← Voltar</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/compras" className="p-2 hover:bg-muted rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              Compra {compra.numero_nf ? `NF ${compra.numero_nf}` : "S/N"}
              <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ml-2", getStatusColor(compra.status as any))}>
                {getStatusLabel(compra.status as any)}
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground">ID: {compra.id.slice(0, 8)}... | Criada em {new Date(compra.created_at).toLocaleString("pt-BR")}</p>
          </div>
        </div>
        {compra.status === "concluida" && ["dono", "gerente"].includes(userTipo) && (
          <Button onClick={handleCancelar} disabled={cancelando} variant="destructive" size="sm">
            {cancelando ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
            Cancelar Compra
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items Table */}
          <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Itens ({compra.itens.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
                    <th className="text-left px-4 py-3 font-bold">Produto</th>
                    <th className="text-right px-3 py-3 font-bold">Qtd</th>
                    <th className="text-right px-3 py-3 font-bold">Custo Unit.</th>
                    <th className="text-right px-3 py-3 font-bold">Total</th>
                    <th className="text-center px-3 py-3 font-bold">Atualiz. Custo</th>
                    <th className="text-right px-3 py-3 font-bold">Custo Anterior</th>
                    <th className="text-right px-3 py-3 font-bold">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {compra.itens.map(item => {
                    const impacto = item.custo_anterior !== null && item.produto_preco_venda
                      ? calcularImpactoMargem(item.custo_anterior, item.preco_unitario, item.produto_preco_venda) : null;
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{item.nome_produto}</p>
                          {impacto && (
                            <p className={cn("text-[10px] font-bold", impacto.diferencaCusto > 0 ? "text-red-500" : "text-emerald-500")}>
                              {impacto.diferencaCusto > 0 ? <ArrowUpCircle className="w-2.5 h-2.5 inline mr-0.5" /> : <ArrowDownCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                              {Math.abs(impacto.diferencaPercentual).toFixed(1)}% variação de custo
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{Number(item.quantidade)}</td>
                        <td className="px-3 py-3 text-right">{formatBRL(item.preco_unitario)}</td>
                        <td className="px-3 py-3 text-right font-black">{formatBRL(item.total)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", {
                            "bg-emerald-100 text-emerald-600 border-emerald-200": item.atualizar_custo,
                            "bg-slate-100 text-slate-500 border-slate-200": !item.atualizar_custo,
                          })}>{item.atualizar_custo ? "SIM" : "NÃO"}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground">{item.custo_anterior ? formatBRL(item.custo_anterior) : "-"}</td>
                        <td className="px-3 py-3 text-right">
                          {impacto ? (
                            <span className={cn("font-black", impacto.novaMargem < 20 ? "text-red-500" : impacto.novaMargem < 30 ? "text-amber-500" : "text-emerald-500")}>
                              {impacto.novaMargem.toFixed(1)}%
                            </span>
                          ) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Info Sidebar */}
        <div className="space-y-4">
          {/* Fornecedor */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-2">
            <h3 className="text-xs font-black text-foreground flex items-center gap-2"><Truck className="w-4 h-4" /> Fornecedor</h3>
            <p className="text-sm font-bold text-foreground">{compra.fornecedor?.nome}</p>
            {compra.fornecedor?.cnpj && <p className="text-[10px] text-muted-foreground">CNPJ: {compra.fornecedor.cnpj}</p>}
            {compra.fornecedor?.telefone && <p className="text-[10px] text-muted-foreground">Tel: {compra.fornecedor.telefone}</p>}
            {compra.fornecedor?.email && <p className="text-[10px] text-muted-foreground">Email: {compra.fornecedor.email}</p>}
            {compra.fornecedor?.contato && <p className="text-[10px] text-muted-foreground">Contato: {compra.fornecedor.contato}</p>}
          </div>

          {/* Details */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-2">
            <h3 className="text-xs font-black text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Detalhes</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Data:</span><span className="font-bold">{new Date(compra.data_compra).toLocaleDateString("pt-BR")}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pagamento:</span><span className="font-bold capitalize">{compra.metodo_pagamento || "-"}</span></div>
              {compra.data_vencimento && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Vencimento:</span><span className="font-bold">{new Date(compra.data_vencimento).toLocaleDateString("pt-BR")}</span></div>}
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Operador:</span><span className="font-bold">{compra.usuario_nome}</span></div>
              {compra.observacao && <div className="pt-1 border-t border-border"><p className="text-[10px] text-muted-foreground italic">"{compra.observacao}"</p></div>}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 shadow-lg text-white space-y-3">
            <h3 className="text-xs font-black flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Resumo Financeiro</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-white/60">Subtotal:</span><span className="font-bold">{formatBRL(compra.subtotal)}</span></div>
              {Number(compra.desconto) > 0 && <div className="flex justify-between text-xs"><span className="text-white/60">Desconto:</span><span className="font-bold text-emerald-400">-{formatBRL(compra.desconto)}</span></div>}
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-sm font-bold">Total:</span>
                <span className="text-lg font-black text-emerald-400">{formatBRL(compra.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
