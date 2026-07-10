"use client";

import * as React from "react";
import { formatBRL } from "@/lib/types/produtos";
import { Printer, Download, X } from "lucide-react";

interface DocumentoItem {
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  total: number;
}

interface DocumentoFicha {
  id: string;
  tipo_documento: "recibo" | "pedido" | "orcamento" | "comprovante" | "venda" | "devolucao" | "cupom";
  numero: string;
  numero_sequencial: number;
  serie: string;
  valor_total: number;
  status: "emitido" | "cancelado" | "rascunho" | "reimpresso";
  emitido_em: string;
  cancelado_em?: string | null;
  motivo_cancelamento?: string | null;
  pdf_url?: string | null;
  clientes?: {
    nome: string;
    cpf: string;
    telefone?: string;
    email?: string;
    endereco?: string;
  } | null;
  usuarios?: {
    nome: string;
  } | null;
  vendas?: {
    subtotal: number;
    desconto: number;
    troco: number;
    forma_pagamento: string;
    venda_itens?: DocumentoItem[];
  } | null;
}

interface FiscalPrintLayoutProps {
  documento: DocumentoFicha;
  config: {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    inscricao_estadual?: string;
    inscricao_municipal?: string;
    endereco: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    telefone?: string;
    email?: string;
    site?: string;
    logo_url?: string;
    mensagem_rodape?: string;
  };
  formato: "58mm" | "80mm" | "A4";
  onClose?: () => void;
}

export const FiscalPrintLayout: React.FC<FiscalPrintLayoutProps> = ({
  documento,
  config,
  formato,
  onClose,
}) => {
  React.useEffect(() => {
    // Escutador para Ctrl+P
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getFormaPagamentoLabel = (method?: string) => {
    if (!method) return "Dinheiro";
    switch (method) {
      case "dinheiro": return "Dinheiro";
      case "pix": return "Pix";
      case "cartao_credito": return "Cartão de Crédito";
      case "cartao_debito": return "Cartão de Débito";
      case "multiplo": return "Múltiplo";
      default: return method;
    }
  };

  const getTipoDocumentoLabel = (tipo: string) => {
    switch (tipo) {
      case "recibo": return "RECIBO NÃO FISCAL";
      case "pedido": return "PEDIDO DE COMPRA";
      case "orcamento": return "ORÇAMENTO COMERCIAL";
      case "comprovante": return "COMPROVANTE DE VENDA";
      case "venda": return "COMPROVANTE DE VENDA";
      case "devolucao": return "COMPROVANTE DE DEVOLUÇÃO";
      case "cupom": return "CUPOM OPERACIONAL";
      default: return tipo.toUpperCase();
    }
  };

  // Obter itens da venda ou simular um item genérico baseado no total
  const itens: DocumentoItem[] = documento.vendas?.venda_itens || [
    {
      produto_nome: getTipoDocumentoLabel(documento.tipo_documento),
      quantidade: 1,
      preco_unitario: documento.valor_total,
      desconto: 0,
      total: documento.valor_total,
    },
  ];

  const subtotal = documento.vendas?.subtotal || documento.valor_total;
  const desconto = documento.vendas?.desconto || 0;
  const troco = documento.vendas?.troco || 0;
  const formaPagamento = getFormaPagamentoLabel(documento.vendas?.forma_pagamento);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `http://localhost:3000/dashboard/fiscal/consulta?id=${documento.id}`
  )}`;

  return (
    <div className="flex flex-col items-center bg-slate-50 min-h-screen p-4 md:p-8 print:bg-white print:p-0">
      
      {/* Top action bar (No-print) */}
      <div className="w-full max-w-2xl bg-white border border-border rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between print:hidden select-none">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
            Visualizador de Documento Comercial
          </h4>
          <p className="text-[10px] text-muted-foreground font-semibold">
            Visualizando no formato <strong className="text-primary">{formato === "A4" ? "Folha A4" : `Bobina Térmica de ${formato}`}</strong>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-primary/15 transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Imprimir (Ctrl+P)
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-border hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-[0.98]"
            >
              <X className="w-4 h-4" />
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* RENDER CHOSEN FORMAT */}
      <div id="print-area" className="w-full flex justify-center">
        {formato === "A4" ? (
          /* ======================================= */
          /* FORMATO 1: FOLHA A4 TIMBRADA            */
          /* ======================================= */
          <div className="bg-white border border-slate-200 shadow-lg w-full max-w-[800px] p-10 font-sans text-xs text-slate-800 space-y-8 print:border-none print:shadow-none print:p-0">
            {/* Header timbrado */}
            <div className="grid grid-cols-3 border-b-2 border-primary pb-6 items-center gap-4">
              <div className="col-span-2 space-y-1">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="max-h-14 max-w-[220px] object-contain mb-2" />
                ) : (
                  <h1 className="text-2xl font-black tracking-tight text-primary uppercase">{config.nome_fantasia}</h1>
                )}
                <p className="font-extrabold text-sm text-slate-900">{config.razao_social}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  CNPJ: {config.cnpj} {config.inscricao_estadual && `| IE: ${config.inscricao_estadual}`}
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {config.endereco}, {config.bairro} - {config.cidade}/{config.estado} | CEP: {config.cep}
                </p>
                {config.telefone && <p className="text-[10px] text-muted-foreground font-semibold">Tel: {config.telefone} | {config.email}</p>}
              </div>

              <div className="border-l border-slate-200 pl-6 space-y-1.5 text-right">
                <span className="text-[10px] uppercase font-black px-3 py-1 rounded-full border bg-slate-100 text-slate-700 border-slate-200 inline-block mb-1">
                  {documento.status}
                </span>
                <h3 className="text-sm font-black text-black tracking-wide leading-none">
                  {getTipoDocumentoLabel(documento.tipo_documento)}
                </h3>
                <p className="text-base font-black text-primary">Nº {documento.numero}</p>
                <p className="text-[10px] text-slate-500 font-semibold">Série: {documento.serie} | Via Única</p>
                <p className="text-[10px] text-slate-500 font-semibold">Data: {new Date(documento.emitido_em).toLocaleString("pt-BR")}</p>
              </div>
            </div>

            {/* Cancelled watermark banner */}
            {documento.status === "cancelado" && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-bold p-4 rounded-xl space-y-1 text-center select-none">
                <span className="text-sm font-black tracking-wider uppercase">🔴 DOCUMENTO COMERCIAL CANCELADO 🔴</span>
                {documento.cancelado_em && (
                  <p className="text-[10px] font-semibold text-red-600/80">
                    Cancelado em: {new Date(documento.cancelado_em).toLocaleString("pt-BR")} | Motivo: {documento.motivo_cancelamento}
                  </p>
                )}
              </div>
            )}

            {/* Customer Details */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-slate-200 pb-1.5">
                👤 Informações do Cliente / Destinatário
              </h4>
              {documento.clientes ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                  <p><strong>Nome:</strong> {documento.clientes.nome.toUpperCase()}</p>
                  <p><strong>CPF/CNPJ:</strong> {documento.clientes.cpf || "Não Informado"}</p>
                  <p><strong>Telefone:</strong> {documento.clientes.telefone || "Não Informado"}</p>
                  <p><strong>E-mail:</strong> {documento.clientes.email || "Não Informado"}</p>
                  <p className="col-span-2"><strong>Endereço:</strong> {documento.clientes.endereco || "Não Informado"}</p>
                </div>
              ) : (
                <p className="text-slate-500 text-xs font-semibold">Consumidor Final (Sem identificação cadastral)</p>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-slate-200 pb-1.5">
                📦 Discriminação dos Produtos / Serviços
              </h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100/60 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 text-left">Código</th>
                    <th className="py-2.5 px-3 text-left">Produto</th>
                    <th className="py-2.5 px-3 text-right">Preço Unit.</th>
                    <th className="py-2.5 px-3 text-right">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Desconto</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px]">#{String(index + 1).padStart(3, "0")}</td>
                      <td className="py-2.5 px-3 font-bold text-black">{item.produto_nome}</td>
                      <td className="py-2.5 px-3 text-right">{formatBRL(item.preco_unitario)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{item.quantidade}</td>
                      <td className="py-2.5 px-3 text-right text-success">{item.desconto > 0 ? `-${formatBRL(item.desconto)}` : "R$ 0,00"}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-black">{formatBRL(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Payments Section */}
            <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
              {/* Left Side: Payments & QR Code */}
              <div className="flex gap-4 items-center">
                <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 border border-slate-200 p-1.5 bg-white rounded-lg flex-shrink-0" />
                <div className="space-y-1 font-semibold text-[10px] text-slate-500 leading-relaxed">
                  <p className="text-black font-bold text-xs uppercase">Consulta de Autenticidade</p>
                  <p>Escaneie o QR Code ao lado para verificar a veracidade deste documento em nosso portal oficial.</p>
                  <p>Operador: {(documento.usuarios?.nome || "Operador").toUpperCase()}</p>
                </div>
              </div>

              {/* Right Side: Totals Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-right text-[11px] font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Bruto (Subtotal):</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                {desconto > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Descontos Concedidos:</span>
                    <span>-{formatBRL(desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-black">
                  <span>VALOR LÍQUIDO TOTAL:</span>
                  <span className="text-primary">{formatBRL(documento.valor_total)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500">
                  <span>Meio de Pagamento:</span>
                  <span>{formaPagamento}</span>
                </div>
                {troco > 0 && (
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Troco Devolvido:</span>
                    <span>{formatBRL(troco)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Institutional */}
            <div className="border-t border-slate-200 pt-6 text-center space-y-2 select-none">
              <p className="text-xs font-extrabold text-slate-700">{config.mensagem_rodape}</p>
              <div className="flex justify-center gap-4 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                <span>ShopMind ERP Inteligente</span>
                <span>•</span>
                <span>Documento Comercial Sem Valor Fiscal</span>
                <span>•</span>
                <span>Via do Cliente</span>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================= */
          /* FORMATO 2: BOBINA TÉRMICA (58MM / 80MM)  */
          /* ======================================= */
          <div
            style={{ width: formato === "58mm" ? "58mm" : "80mm" }}
            className="bg-white border border-slate-200 shadow-lg p-4 font-mono text-[10px] text-slate-800 leading-relaxed print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Header info */}
            <div className="text-center space-y-1 mb-4 border-b border-dashed border-slate-300 pb-3">
              <h2 className="text-xs font-black tracking-wider text-black uppercase">{config.nome_fantasia}</h2>
              <p className="text-[8px] text-slate-500">{config.razao_social}</p>
              <p className="text-[8px] text-slate-500">CNPJ: {config.cnpj}</p>
              <p className="text-[8px] text-slate-500">{config.endereco}</p>
              {config.telefone && <p className="text-[8px] text-slate-500">TEL: {config.telefone}</p>}
            </div>

            {/* Cancelled header */}
            {documento.status === "cancelado" && (
              <div className="text-center border border-red-500 text-red-600 font-bold p-2 mb-3 text-[9px]">
                <p>*** DOCUMENTO CANCELADO ***</p>
                {documento.cancelado_em && (
                  <p className="text-[7px]">Data: {new Date(documento.cancelado_em).toLocaleDateString()}</p>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-0.5 border-b border-dashed border-slate-300 pb-3 mb-3">
              <p className="font-bold text-black">{getTipoDocumentoLabel(documento.tipo_documento)}</p>
              <p>NUMERO: {documento.numero} | SERIE: {documento.serie}</p>
              <p>EMISSÃO: {new Date(documento.emitido_em).toLocaleString("pt-BR")}</p>
              <p>OPERADOR: {(documento.usuarios?.nome || "Operador").toUpperCase()}</p>
              {documento.clientes && (
                <div className="border-t border-dashed border-slate-200 mt-1.5 pt-1.5 space-y-0.5">
                  <p><strong>CLIENTE:</strong> {documento.clientes.nome.toUpperCase()}</p>
                  {documento.clientes.cpf && <p><strong>CPF:</strong> {documento.clientes.cpf}</p>}
                </div>
              )}
            </div>

            {/* Columns header */}
            <div className="grid grid-cols-12 font-bold border-b border-slate-200 pb-1 mb-2">
              <span className="col-span-6">PRODUTO</span>
              <span className="col-span-2 text-right">QTD</span>
              <span className="col-span-4 text-right">TOTAL</span>
            </div>

            {/* Items list */}
            <div className="space-y-2 border-b border-dashed border-slate-300 pb-3 mb-3">
              {itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 items-start">
                  <div className="col-span-6 flex flex-col">
                    <span className="font-bold text-black">{item.produto_nome}</span>
                    <span className="text-[8px] text-slate-500">
                      {formatBRL(item.preco_unitario)} x {item.quantidade}
                    </span>
                    {item.desconto > 0 && (
                      <span className="text-[8px] text-success">
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
              {desconto > 0 && <p className="text-success">Total Descontos: -{formatBRL(desconto)}</p>}
              <p className="text-xs font-black text-black">TOTAL LÍQUIDO: {formatBRL(documento.valor_total)}</p>
            </div>

            {/* Payments & Change */}
            <div className="space-y-0.5 border-b border-dashed border-slate-300 pb-3 mb-3">
              <p>PAGAMENTO: {formaPagamento}</p>
              <p>TROCO: {formatBRL(troco)}</p>
            </div>

            {/* QR Code and Footer */}
            <div className="text-center space-y-3 pt-1">
              <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 mx-auto border border-slate-200 p-1 bg-white rounded" />
              <div className="text-[8px] text-slate-500 leading-normal space-y-1">
                <p className="font-bold text-black uppercase">Consulta de Autenticidade</p>
                <p>{config.mensagem_rodape}</p>
                <p className="font-bold text-[7px] border border-slate-300 py-1 px-1.5 mt-2 inline-block uppercase tracking-wider">
                  CUPOM COMERCIAL SEM VALOR FISCAL
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Styled media print tag to enforce formatting */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden, header, sidebar, nav {
            display: none !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: ${formato === "A4" ? "210mm" : formato};
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
