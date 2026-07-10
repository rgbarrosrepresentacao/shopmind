"use client";

import * as React from "react";
import type { CartItem } from "@/lib/types/pdv";
import { formatBRL } from "@/lib/types/produtos";
import { Printer, ShoppingBag, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FiscalPrintLayout } from "../fiscal/fiscal-print-layout";
import { getFiscalConfig, getDocumentoFichaCompleta, registrarHistoricoDocumento } from "@/lib/actions/fiscal";

interface PDVReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vendaInfo: {
    vendaId: string;
    numero: number;
    created_at: string;
    documentoFiscalId?: string | null;
    documentoFiscalNumero?: string | null;
    documentoFiscalTipo?: string | null;
    formaPagamento?: string;
    troco?: number;
  } | null;
  items: CartItem[];
  clienteNome?: string | null;
  descontoGeral: number;
  total: number;
  troco: number;
  formaPagamento: string;
  operadorNome: string;
  onStartNewSale: () => void;
}

export const PDVReceiptDialog: React.FC<PDVReceiptDialogProps> = ({
  isOpen,
  onClose,
  vendaInfo,
  items,
  clienteNome,
  descontoGeral,
  total,
  troco,
  formaPagamento,
  operadorNome,
  onStartNewSale,
}) => {
  const [documento, setDocumento] = React.useState<any>(null);
  const [config, setConfig] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [formato, setFormato] = React.useState<"58mm" | "80mm" | "A4">("80mm");

  // Fetch fiscal document and config when available
  React.useEffect(() => {
    if (isOpen && vendaInfo?.documentoFiscalId) {
      setLoading(true);
      Promise.all([
        getFiscalConfig(),
        getDocumentoFichaCompleta(vendaInfo.documentoFiscalId)
      ])
        .then(([configRes, docRes]) => {
          if (configRes.data) {
            setConfig(configRes.data);
            // Default format can be A4 if configured or 80mm
            if (configRes.data.modo_documento === "nfc_e") {
              setFormato("80mm");
            }
          }
          if (docRes.data) {
            setDocumento(docRes.data);
            // Audit record for the action
            registrarHistoricoDocumento(
              vendaInfo.documentoFiscalId!,
              "visualizacao",
              "Documento visualizado automaticamente na tela de finalização de venda."
            );
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Erro ao carregar dados do recibo fiscal:", err);
          setLoading(false);
        });
    } else {
      setDocumento(null);
      setConfig(null);
    }
  }, [isOpen, vendaInfo?.documentoFiscalId]);

  if (!isOpen || !vendaInfo) return null;

  // Handle printing in the fiscal context
  const handlePrintFiscal = () => {
    if (vendaInfo.documentoFiscalId) {
      registrarHistoricoDocumento(
        vendaInfo.documentoFiscalId,
        "reimpressao",
        `Reimpressão do documento ${vendaInfo.documentoFiscalNumero} no fechamento do PDV.`
      );
    }
    window.print();
  };

  // Fallback: Standard manual calculations
  const subtotal = items.reduce((acc, item) => acc + item.produto.preco_venda * item.quantidade, 0);
  const totalItemDiscounts = items.reduce((acc, item) => acc + item.desconto, 0);
  const totalDiscount = totalItemDiscounts + descontoGeral;

  const getFormaPagamentoLabel = (method: string) => {
    switch (method) {
      case "dinheiro":
        return "Dinheiro";
      case "pix":
        return "Pix";
      case "cartao_credito":
        return "Cartão de Crédito";
      case "cartao_debito":
        return "Cartão de Débito";
      case "multiplo":
        return "Múltiplo";
      default:
        return method;
    }
  };

  // RENDER LOADING STATE
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-8 z-10 flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
              Gerando Recibo Comercial...
            </h3>
            <p className="text-xs text-muted-foreground">
              Preparando layouts e registrando trilha de auditoria.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // RENDER FISCAL TEMPLATE IF LOADED
  if (documento && config) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-start py-6 px-4 print:p-0 print:bg-white select-none">
        <div className="w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl z-10 print:shadow-none print:border-none print:bg-white">
          
          {/* Format Selector Header */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Emitido
              </span>
              <h3 className="text-xs font-black tracking-wider text-slate-200">
                RECIBO {vendaInfo.documentoFiscalNumero}
              </h3>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
                {(["58mm", "80mm", "A4"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormato(fmt)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                      formato === fmt ? "bg-white text-slate-900 shadow-sm" : "text-white hover:bg-white/5"
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <button
                onClick={onStartNewSale}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Visualizer */}
          <div className="thermal-receipt bg-white max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
            <FiscalPrintLayout
              documento={documento}
              config={config}
              formato={formato}
              onClose={onStartNewSale}
            />
          </div>

          {/* Bottom Custom Actions Bar */}
          <div className="p-4 border-t border-border bg-slate-50 flex justify-between items-center print:hidden">
            <p className="text-[10px] text-muted-foreground font-semibold">
              Trilha de auditoria gravada para o operador {operadorNome.toUpperCase()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePrintFiscal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-border text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Re-imprimir
              </button>
              <button
                onClick={onStartNewSale}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl transition-all shadow-md shadow-primary/15 cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" /> Nova Venda (F1)
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // FALLBACK: ORIGINAL NON-FISCAL THERMAL COUPON
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      {/* Dialog Body */}
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between print:hidden">
          <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-primary" /> Venda Concluída!
          </h3>
          <button
            onClick={onStartNewSale}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 print:bg-white print:p-0">
          
          {/* Thermal Receipt Paper Emulator */}
          <div id="print-area" className="thermal-receipt bg-white border border-slate-200 shadow-sm p-6 max-w-[340px] mx-auto font-mono text-[11px] text-slate-800 leading-relaxed print:border-none print:shadow-none print:p-0 print:max-w-none">
            
            {/* Header info */}
            <div className="text-center space-y-1 mb-4 border-b border-dashed border-slate-300 pb-3">
              <h2 className="text-sm font-black tracking-wider text-black">SHOPMIND RETAIL</h2>
              <p className="text-[9px] text-slate-500">SISTEMA INTELIGENTE DE VENDAS</p>
              <p className="text-[9px] text-slate-500">CNPJ: 00.000.000/0001-00</p>
              <p className="text-[9px] text-slate-500">RUA DO COMÉRCIO, 100 - CENTRO</p>
            </div>

            {/* Sale metadata */}
            <div className="space-y-0.5 border-b border-dashed border-slate-300 pb-3 mb-3">
              <p><strong>CUPOM NÃO FISCAL</strong></p>
              <p>VENDA: #{vendaInfo.numero}</p>
              <p>DATA: {new Date(vendaInfo.created_at).toLocaleString("pt-BR")}</p>
              <p>OPERADOR: {operadorNome.toUpperCase()}</p>
              {clienteNome && <p>CLIENTE: {clienteNome.toUpperCase()}</p>}
            </div>

            {/* Columns header */}
            <div className="grid grid-cols-12 font-bold border-b border-slate-200 pb-1 mb-2">
              <span className="col-span-6">PRODUTO</span>
              <span className="col-span-2 text-right">QTD</span>
              <span className="col-span-4 text-right">TOTAL</span>
            </div>

            {/* Items list */}
            <div className="space-y-2 border-b border-dashed border-slate-300 pb-3 mb-3">
              {items.map((item) => (
                <div key={item.produto.id} className="grid grid-cols-12 items-start">
                  <div className="col-span-6 flex flex-col">
                    <span className="font-bold text-black">{item.produto.nome}</span>
                    <span className="text-[9px] text-slate-500">
                      {formatBRL(item.produto.preco_venda)} x {item.quantidade} {item.produto.unidade}
                    </span>
                    {item.desconto > 0 && (
                      <span className="text-[9px] text-success">
                        Desconto: -{formatBRL(item.desconto)}
                      </span>
                    )}
                  </div>
                  <span className="col-span-2 text-right">{item.quantidade}</span>
                  <span className="col-span-4 text-right font-bold text-black">
                    {formatBRL(item.total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-right">
              <p>Subtotal: {formatBRL(subtotal)}</p>
              {totalDiscount > 0 && <p className="text-success">Total Descontos: -{formatBRL(totalDiscount)}</p>}
              <p className="text-sm font-black text-black">TOTAL LÍQUIDO: {formatBRL(total)}</p>
            </div>

            {/* Payments & Change */}
            <div className="space-y-0.5 border-b border-dashed border-slate-300 pb-3 mb-3">
              <p>PAGAMENTO: {getFormaPagamentoLabel(formaPagamento)}</p>
              <p>TROCO: {formatBRL(troco)}</p>
            </div>

            {/* Footer message */}
            <div className="text-center text-[9px] text-slate-500 pt-1 space-y-1">
              <p>Obrigado pela preferência!</p>
              <p>ShopMind AI - Soluções Inteligentes para Varejo</p>
              <p className="font-bold text-[8px] border border-slate-300 py-1.5 px-2 mt-2 inline-block">
                ESTA NÃO É UMA NOTA FISCAL
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-2 gap-2.5 print:hidden">
          <button
            onClick={() => window.print()}
            className="py-3 border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimir Cupom
          </button>
          
          <button
            onClick={onStartNewSale}
            className="py-3 bg-primary text-white font-extrabold text-xs rounded-xl hover:bg-primary-hover active:scale-[0.99] transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" /> Nova Venda
          </button>
        </div>
      </div>

      {/* Styled media print tag to enforce format thermally */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
