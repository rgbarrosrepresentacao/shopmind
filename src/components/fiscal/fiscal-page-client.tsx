"use client";

import * as React from "react";
import {
  getFiscalConfig,
  salvarFiscalConfig,
  getDocumentosFiscaisList,
  getOperadoresList,
  getDocumentoFichaCompleta,
  cancelarDocumentoFiscal,
  registrarHistoricoDocumento,
  getFiscalKPIs,
} from "@/lib/actions/fiscal";
import { FiscalPrintLayout } from "./fiscal-print-layout";
import { toast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/types/produtos";
import { cn } from "@/lib/utils/cn";
import {
  FileText,
  Settings,
  History,
  TrendingUp,
  Search,
  RefreshCw,
  Printer,
  Download,
  Trash2,
  Eye,
  Save,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
  FileDown,
  ChevronRight,
  User,
  Clock,
  X,
  CheckCircle2,
} from "lucide-react";

interface FiscalPageClientProps {
  userTipo: string;
}

export const FiscalPageClient: React.FC<FiscalPageClientProps> = ({ userTipo }) => {
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "historico" | "config" | "relatorios">("dashboard");
  const [loading, setLoading] = React.useState(true);

  // States
  const [config, setConfig] = React.useState<any>(null);
  const [kpis, setKpis] = React.useState<any>(null);
  const [documentos, setDocumentos] = React.useState<any[]>([]);
  const [operadores, setOperadores] = React.useState<any[]>([]);
  const [insights, setInsights] = React.useState<string[]>([]);

  // Dialog and Preview states
  const [selectedDoc, setSelectedDoc] = React.useState<any>(null);
  const [loadingDoc, setLoadingDoc] = React.useState(false);
  const [printFormat, setPrintFormat] = React.useState<"58mm" | "80mm" | "A4">("A4");
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);
  
  // Cancel dialog
  const [cancelDocId, setCancelDocId] = React.useState<string | null>(null);
  const [cancelMotivo, setCancelMotivo] = React.useState("");
  const [cancelLoading, setCancelLoading] = React.useState(false);

  // Filter States (for Histórico and Relatórios)
  const [filtroTipo, setFiltroTipo] = React.useState("todos");
  const [filtroStatus, setFiltroStatus] = React.useState("todos");
  const [filtroOperador, setFiltroOperador] = React.useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = React.useState("");
  const [filtroDataFim, setFiltroDataFim] = React.useState("");

  // Config Form States
  const [configLoading, setConfigLoading] = React.useState(false);
  const [razaoSocial, setRazaoSocial] = React.useState("");
  const [nomeFantasia, setNomeFantasia] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [ie, setIe] = React.useState("");
  const [im, setIm] = React.useState("");
  const [endereco, setEndereco] = React.useState("");
  const [bairro, setBairro] = React.useState("");
  const [cidade, setCidade] = React.useState("");
  const [estado, setEstado] = React.useState("");
  const [cep, setCep] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [site, setSite] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [seriePadrao, setSeriePadrao] = React.useState("1");
  const [ambiente, setAmbiente] = React.useState<"homologacao" | "producao">("homologacao");
  const [modoDocumento, setModoDocumento] = React.useState<"nao_fiscal" | "nfc_e">("nao_fiscal");
  const [formatoNumero, setFormatoNumero] = React.useState<"prefixado" | "simples">("prefixado");
  const [numRecibo, setNumRecibo] = React.useState(1);
  const [numPedido, setNumPedido] = React.useState(1);
  const [numOrcamento, setNumOrcamento] = React.useState(1);
  const [numComprovante, setNumComprovante] = React.useState(1);
  const [numVenda, setNumVenda] = React.useState(1);
  const [numDevolucao, setNumDevolucao] = React.useState(1);
  const [numCupom, setNumCupom] = React.useState(1);
  const [msgRodape, setMsgRodape] = React.useState("");

  const isReadOnly = userTipo === "estoquista";

  React.useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [configRes, kpisRes, docsRes, opRes] = await Promise.all([
        getFiscalConfig(),
        getFiscalKPIs(),
        getDocumentosFiscaisList(),
        getOperadoresList(),
      ]);

      if (configRes.data) {
        setConfig(configRes.data);
        // Map Form States
        setRazaoSocial(configRes.data.razao_social);
        setNomeFantasia(configRes.data.nome_fantasia);
        setCnpj(configRes.data.cnpj);
        setIe(configRes.data.inscricao_estadual || "");
        setIm(configRes.data.inscricao_municipal || "");
        setEndereco(configRes.data.endereco);
        setBairro(configRes.data.bairro);
        setCidade(configRes.data.cidade);
        setEstado(configRes.data.estado);
        setCep(configRes.data.cep);
        setTelefone(configRes.data.telefone || "");
        setEmail(configRes.data.email || "");
        setSite(configRes.data.site || "");
        setLogoUrl(configRes.data.logo_url || "");
        setSeriePadrao(configRes.data.serie_padrao);
        setAmbiente(configRes.data.ambiente);
        setModoDocumento(configRes.data.modo_documento);
        setFormatoNumero(configRes.data.formato_numero);
        setNumRecibo(configRes.data.proximo_numero_recibo);
        setNumPedido(configRes.data.proximo_numero_pedido);
        setNumOrcamento(configRes.data.proximo_numero_orcamento);
        setNumComprovante(configRes.data.proximo_numero_comprovante);
        setNumVenda(configRes.data.proximo_numero_venda);
        setNumDevolucao(configRes.data.proximo_numero_devolucao);
        setNumCupom(configRes.data.proximo_numero_cupom);
        setMsgRodape(configRes.data.mensagem_rodape || "");
      }

      if (kpisRes.data) setKpis(kpisRes.data);
      if (docsRes.data) setDocumentos(docsRes.data);
      if (opRes.data) setOperadores(opRes.data);

      // Generate local auditorial insights
      const localInsights = [];
      const list = docsRes.data || [];
      const cancelados = list.filter((d: any) => d.status === "cancelado");
      
      if (cancelados.length > 2) {
        localInsights.push(`⚠️ Detectamos **${cancelados.length} cancelamentos** recentes de comprovantes. Revise os motivos de cancelamento na aba Histórico para fins de auditoria.`);
      }
      
      if (list.length > 0) {
        const faturamento = list.filter((d: any) => d.status !== "cancelado").reduce((acc: number, d: any) => acc + Number(d.valor_total), 0);
        localInsights.push(`💡 Sua loja gerou **${formatBRL(faturamento)}** em volume financeiro comercial documentado através de recibos e pedidos.`);
      }

      const orcamentos = list.filter((d: any) => d.tipo_documento === "orcamento" && d.status !== "cancelado");
      if (orcamentos.length > 0) {
        localInsights.push(`💡 Você possui **${orcamentos.length} orçamentos comerciais** ativos. Lembre-se de fazer o follow-up com seus clientes para convertê-los em vendas.`);
      }

      if (localInsights.length === 0) {
        localInsights.push("💡 Módulo fiscal interno saudável. Monitore e audite todas as emissões comerciais de seus caixas em tempo real.");
      }

      setInsights(localInsights);
    } catch (err) {
      toast.error("Erro ao carregar painel fiscal");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setLoading(true);
    try {
      const res = await getDocumentosFiscaisList({
        tipo_documento: filtroTipo,
        status: filtroStatus,
        usuario_id: filtroOperador,
        data_inicio: filtroDataInicio ? `${filtroDataInicio}T00:00:00.000Z` : undefined,
        data_fim: filtroDataFim ? `${filtroDataFim}T23:59:59.999Z` : undefined,
      });
      if (res.data) {
        setDocumentos(res.data);
        toast.success("Filtros aplicados com sucesso!");
      }
    } catch (e) {
      toast.error("Falha ao filtrar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setConfigLoading(true);

    try {
      const payload = {
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        cnpj,
        inscricao_estadual: ie,
        inscricao_municipal: im,
        endereco,
        bairro,
        cidade,
        estado,
        cep,
        telefone,
        email,
        site,
        logo_url: logoUrl,
        serie_padrao: seriePadrao,
        ambiente,
        modo_documento: modoDocumento,
        formato_numero: formatoNumero,
        proximo_numero_recibo: numRecibo,
        proximo_numero_pedido: numPedido,
        proximo_numero_orcamento: numOrcamento,
        proximo_numero_comprovante: numComprovante,
        proximo_numero_venda: numVenda,
        proximo_numero_devolucao: numDevolucao,
        proximo_numero_cupom: numCupom,
        mensagem_rodape: msgRodape,
      };

      const res = await salvarFiscalConfig(payload);
      if (res.success) {
        toast.success("Configurações fiscais atualizadas!");
        loadAllData();
      } else {
        toast.error(`Erro ao salvar: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Falha: ${err.message}`);
    } finally {
      setConfigLoading(false);
    }
  };

  // View complete document file/card
  const handleOpenDocDetails = async (id: string) => {
    setLoadingDoc(true);
    try {
      const res = await getDocumentoFichaCompleta(id);
      if (res.data) {
        setSelectedDoc(res.data);
        await registrarHistoricoDocumento(id, "visualizacao");
      } else {
        toast.error("Erro ao carregar detalhes do documento");
      }
    } catch (e) {
      toast.error("Erro ao abrir detalhes");
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleTriggerPrint = async (doc: any, format: "58mm" | "80mm" | "A4") => {
    setPrintFormat(format);
    setShowPrintPreview(true);
    await registrarHistoricoDocumento(doc.id, "reimpressao");
  };

  const handleOpenCancel = (id: string) => {
    setCancelDocId(id);
    setCancelMotivo("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelDocId) return;
    if (cancelMotivo.trim().length < 5) {
      toast.error("Motivo do cancelamento muito curto.");
      return;
    }

    setCancelLoading(true);
    try {
      const res = await cancelarDocumentoFiscal(cancelDocId, cancelMotivo.trim());
      if (res.success) {
        toast.success("Documento comercial cancelado!");
        setCancelDocId(null);
        setSelectedDoc(null);
        loadAllData();
      } else {
        toast.error(`Erro ao cancelar: ${res.error}`);
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  // EXPORTERS (CSV, EXCEL, PDF)
  const handleExportCSV = () => {
    if (documentos.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }
    const headers = "ID,Tipo,Numero,Serie,ValorTotal,Status,EmitidoEm,Operador,Cliente,CPF";
    const rows = documentos.map((d) => {
      const op = d.usuarios?.nome || "Sistema";
      const cli = d.clientes?.nome || "Consumidor Final";
      const cpf = d.clientes?.cpf || "";
      return `"${d.id}","${d.tipo_documento}","${d.numero}","${d.serie}",${d.valor_total},"${d.status}","${d.emitido_em}","${op}","${cli}","${cpf}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `relatorio_documentos_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV exportado!");
  };

  const handleExportExcel = () => {
    if (documentos.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }
    const headers = `
      <tr>
        <th>ID Documento</th>
        <th>Tipo de Documento</th>
        <th>Número</th>
        <th>Série</th>
        <th>Valor Total (BRL)</th>
        <th>Status</th>
        <th>Emitido Em</th>
        <th>Operador</th>
        <th>Cliente</th>
        <th>CPF Cliente</th>
      </tr>
    `;
    const rows = documentos.map((d) => {
      const op = d.usuarios?.nome || "Sistema";
      const cli = d.clientes?.nome || "Consumidor Final";
      const cpf = d.clientes?.cpf || "";
      return `
        <tr>
          <td>${d.id}</td>
          <td>${d.tipo_documento.toUpperCase()}</td>
          <td>${d.numero}</td>
          <td>${d.serie}</td>
          <td>${d.valor_total}</td>
          <td>${d.status.toUpperCase()}</td>
          <td>${new Date(d.emitido_em).toLocaleString("pt-BR")}</td>
          <td>${op}</td>
          <td>${cli}</td>
          <td>${cpf}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          table { border-collapse: collapse; font-family: sans-serif; } 
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 11px; } 
          th { background-color: #6366f1; color: #ffffff; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h2>ShopMind — Relatório de Emissões de Documentos</h2>
        <table>
          <thead>${headers}</thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_documentos_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    toast.success("Excel exportado!");
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Ative pop-ups para imprimir.");
      return;
    }
    const headersHTML = `
      <tr>
        <th>Número</th>
        <th>Tipo</th>
        <th>Data Emissão</th>
        <th>Cliente</th>
        <th>Operador</th>
        <th>Status</th>
        <th style="text-align: right;">Total</th>
      </tr>
    `;
    const rowsHTML = documentos.map((d) => {
      const op = d.usuarios?.nome || "Sistema";
      const cli = d.clientes?.nome || "Consumidor Final";
      return `
        <tr>
          <td><strong>${d.numero}</strong></td>
          <td>${d.tipo_documento.toUpperCase()}</td>
          <td>${new Date(d.emitido_em).toLocaleDateString("pt-BR")}</td>
          <td>${cli}</td>
          <td>${op}</td>
          <td><span style="font-weight: bold; color: ${d.status === 'cancelado' ? '#ef4444' : '#10b981'}">${d.status.toUpperCase()}</span></td>
          <td style="text-align: right; font-weight: bold;">${formatBRL(d.valor_total)}</td>
        </tr>
      `;
    }).join("");

    const today = new Date().toLocaleDateString("pt-BR");

    const html = `
      <html>
        <head>
          <title>Balanço de Documentos Comerciais</title>
          <style>
            body { font-family: sans-serif; color: #334155; padding: 35px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 900; color: #6366f1; }
            .date { font-size: 11px; color: #64748b; font-weight: bold; }
            h1 { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 20px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; font-size: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; color: #475569; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 50px; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ShopMind</div>
            <div class="date">Gerado em: ${today}</div>
          </div>
          <h1>Balanço de Documentos Comerciais Emitidos</h1>
          <table>
            <thead>${headersHTML}</thead>
            <tbody>${rowsHTML}</tbody>
          </table>
          <div class="footer">ShopMind Módulo Fiscal Interno — Todos os direitos reservados.</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Preview Layout overlay render
  if (showPrintPreview && selectedDoc) {
    return (
      <FiscalPrintLayout
        documento={selectedDoc}
        config={config}
        formato={printFormat}
        onClose={() => setShowPrintPreview(false)}
      />
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Header section */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            🧾 Módulo Fiscal & Documentos Comerciais
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie recibos, comprovantes, pedidos e orçamentos comerciais com trilha de auditoria integrada.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3.5 py-2 border border-border bg-card rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", { "animate-spin": loading })} />
          Atualizar Painel
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto select-none">
        {[
          { id: "dashboard", label: "Painel Fiscal", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "historico", label: "Histórico de Emissões", icon: <History className="w-4 h-4" /> },
          { id: "config", label: "Configurações Fiscais", icon: <Settings className="w-4 h-4" /> },
          { id: "relatorios", label: "Relatórios & Exportações", icon: <FileText className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-3.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer relative",
              {
                "border-primary text-primary font-black": activeTab === tab.id,
                "border-transparent text-muted-foreground hover:text-foreground hover:border-border":
                  activeTab !== tab.id,
              }
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loader indicator */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 bg-card border border-border rounded-2xl p-8">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Carregando dados fiscais...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: DASHBOARD AND KPIs */}
          {activeTab === "dashboard" && kpis && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Emitidos (Mês)</span>
                    <h3 className="text-2xl font-black text-foreground">{kpis.emitidos}</h3>
                  </div>
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Cancelados (Mês)</span>
                    <h3 className="text-2xl font-black text-foreground">{kpis.cancelados}</h3>
                  </div>
                  <div className="w-10 h-10 bg-red-500/10 text-red-600 rounded-xl flex items-center justify-center border border-red-500/20">
                    <Trash2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Faturado</span>
                    <h3 className="text-2xl font-black text-foreground">{formatBRL(kpis.faturamentoComercial)}</h3>
                  </div>
                  <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Reimpressões</span>
                    <h3 className="text-2xl font-black text-foreground">{kpis.reimpresso}</h3>
                  </div>
                  <div className="w-10 h-10 bg-slate-500/10 text-slate-600 rounded-xl flex items-center justify-center border border-slate-500/20">
                    <Printer className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Insights Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    💡 Auditoria & Insights Fiscais Locais
                  </h4>
                  <div className="space-y-3.5">
                    {insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl text-xs text-slate-600 leading-relaxed font-semibold"
                        dangerouslySetInnerHTML={{ __html: insight }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    📋 Preparação para NFC-e
                  </h4>
                  <div className="text-xs text-slate-600 leading-relaxed font-semibold space-y-3">
                    <p>• <strong>Ambiente Fiscal</strong>: Configurado atualmente como **{config?.ambiente === "homologacao" ? "Homologação (Testes)" : "Produção (Real)"}**.</p>
                    <p>• <strong>Emissão Oficial</strong>: Desativada nesta fase. O sistema gera comprovantes de vendas comerciais internos altamente detalhados, ideais para o dia a dia.</p>
                    <p>• <strong>Campos Reservados</strong>: Estrutura pronta contendo hashes de chaves de acesso, retornos da SEFAZ e arquivos XML prontos no banco para futura ativação.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTÓRICO DE EMISSÕES */}
          {activeTab === "historico" && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Quick filter row */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Documento</label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary cursor-pointer"
                  >
                    <option value="todos">Todos os tipos</option>
                    <option value="recibo">Recibo Não Fiscal</option>
                    <option value="pedido">Pedido de Compra</option>
                    <option value="orcamento">Orçamento Comercial</option>
                    <option value="comprovante">Comprovante de Venda</option>
                    <option value="venda">Venda</option>
                    <option value="devolucao">Devolução</option>
                    <option value="cupom">Cupom Interno</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Status</label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary cursor-pointer"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="emitido">Emitido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Operador (Caixa)</label>
                  <select
                    value={filtroOperador}
                    onChange={(e) => setFiltroOperador(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary cursor-pointer"
                  >
                    <option value="todos">Todos os operadores</option>
                    {operadores.map((op) => (
                      <option key={op.id} value={op.id}>{op.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Período de Emissão</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="px-2 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none"
                    />
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="px-2 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleApplyFilters}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-1"
                >
                  <Search className="w-4 h-4" />
                  Filtrar Documentos
                </button>
              </div>

              {/* Documents List Table */}
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                {documentos.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <span className="text-3xl">🧾</span>
                    <p className="text-sm font-extrabold text-foreground">Nenhum documento emitido</p>
                    <p className="text-xs text-muted-foreground">Altere os filtros acima ou realize vendas no PDV para emitir recibos.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-slate-50 text-[10px] uppercase font-bold text-muted-foreground text-left">
                          <th className="py-3 px-4">Número</th>
                          <th className="py-3 px-4">Tipo</th>
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4">Valor Total</th>
                          <th className="py-3 px-4">Operador</th>
                          <th className="py-3 px-4">Data Emissão</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {documentos.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                            <td className="py-3.5 px-4 font-bold text-primary">{doc.numero}</td>
                            <td className="py-3.5 px-4 uppercase text-[10px] font-extrabold">{doc.tipo_documento}</td>
                            <td className="py-3.5 px-4 text-foreground">{doc.clientes?.nome || "Consumidor Final"}</td>
                            <td className="py-3.5 px-4 font-black">{formatBRL(doc.valor_total)}</td>
                            <td className="py-3.5 px-4 text-slate-500">{doc.usuarios?.nome || "Sistema"}</td>
                            <td className="py-3.5 px-4 text-[11px] text-muted-foreground">
                              {new Date(doc.emitido_em).toLocaleString("pt-BR")}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={cn(
                                "text-[9px] uppercase font-black px-2 py-0.5 rounded-full border",
                                doc.status === "emitido" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
                              )}>
                                {doc.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              <button
                                onClick={() => handleOpenDocDetails(doc.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 border border-border bg-white rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Visualizar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURAÇÕES FISCAIS */}
          {activeTab === "config" && (
            <form onSubmit={handleSaveConfig} className="space-y-5 text-left animate-fade-in">
              {isReadOnly && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold p-4 rounded-xl flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>Modo de Leitura: Apenas administradores (Dono/Gerente) possuem permissão para salvar alterações fiscais.</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Area: Company Data */}
                <div className="lg:col-span-2 space-y-5">
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border pb-3">
                      🏢 Dados Cadastrais da Empresa
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Razão Social *</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={razaoSocial}
                          onChange={(e) => setRazaoSocial(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Nome Fantasia *</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={nomeFantasia}
                          onChange={(e) => setNomeFantasia(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">CNPJ *</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={cnpj}
                          onChange={(e) => setCnpj(e.target.value)}
                          placeholder="00.000.000/0001-00"
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Inscrição Estadual</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={ie}
                          onChange={(e) => setIe(e.target.value)}
                          placeholder="Isento ou numérico"
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Inscrição Municipal</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={im}
                          onChange={(e) => setIm(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">CEP *</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Endereço Completo *</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={endereco}
                          onChange={(e) => setEndereco(e.target.value)}
                          placeholder="Rua, Número, Complemento"
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Bairro *</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Cidade *</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Estado (UF) *</label>
                        <input
                          type="text"
                          required
                          maxLength={2}
                          disabled={isReadOnly}
                          value={estado}
                          onChange={(e) => setEstado(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Site da Loja</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={site}
                          onChange={(e) => setSite(e.target.value)}
                          placeholder="www.minhaempresa.com.br"
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Endereço do Logo (URL)</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://suaimagem.com/logo.png"
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Area: Sequences & Formats */}
                <div className="space-y-5">
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider border-b border-border pb-3">
                      ⚙️ Sequenciais & Emissão
                    </h4>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Ambiente Fiscal</label>
                        <select
                          value={ambiente}
                          disabled={isReadOnly}
                          onChange={(e) => setAmbiente(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary cursor-pointer disabled:opacity-50"
                        >
                          <option value="homologacao">Homologação (Testes)</option>
                          <option value="producao">Produção (Real)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Modo do Módulo</label>
                        <select
                          value={modoDocumento}
                          disabled={isReadOnly}
                          onChange={(e) => setModoDocumento(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary cursor-pointer disabled:opacity-50"
                        >
                          <option value="nao_fiscal">Módulo Não Fiscal Interno</option>
                          <option value="nfc_e" disabled>NFC-e Oficial (Futuro)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Formato de Numeração</label>
                        <select
                          value={formatoNumero}
                          disabled={isReadOnly}
                          onChange={(e) => setFormatoNumero(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary cursor-pointer disabled:opacity-50"
                        >
                          <option value="prefixado">Prefixado (Ex: REC-000001)</option>
                          <option value="simples">Simples Sequencial (Ex: 000001)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Série Padrão</label>
                        <input
                          type="text"
                          required
                          disabled={isReadOnly}
                          value={seriePadrao}
                          onChange={(e) => setSeriePadrao(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>

                      {/* Document Type Counters */}
                      <div className="border-t border-slate-100 pt-3 mt-3 space-y-2.5">
                        <span className="text-[10px] uppercase font-black text-slate-500 block">Próximo Número Inicial</span>
                        
                        <div className="flex justify-between items-center gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-600">Recibos:</span>
                          <input
                            type="number"
                            min="1"
                            disabled={isReadOnly}
                            value={numRecibo}
                            onChange={(e) => setNumRecibo(parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-right bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none"
                          />
                        </div>

                        <div className="flex justify-between items-center gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-600">Pedidos:</span>
                          <input
                            type="number"
                            min="1"
                            disabled={isReadOnly}
                            value={numPedido}
                            onChange={(e) => setNumPedido(parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-right bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none"
                          />
                        </div>

                        <div className="flex justify-between items-center gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-600">Orçamentos:</span>
                          <input
                            type="number"
                            min="1"
                            disabled={isReadOnly}
                            value={numOrcamento}
                            onChange={(e) => setNumOrcamento(parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-right bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none"
                          />
                        </div>

                        <div className="flex justify-between items-center gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-600">Comprovantes:</span>
                          <input
                            type="number"
                            min="1"
                            disabled={isReadOnly}
                            value={numComprovante}
                            onChange={(e) => setNumComprovante(parseInt(e.target.value) || 1)}
                            className="w-20 px-2 py-1 text-right bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Mensagem do Rodapé (Cupom)</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={msgRodape}
                          onChange={(e) => setMsgRodape(e.target.value)}
                          placeholder="Ex: Volte sempre!"
                          className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={configLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-lg shadow-primary/15 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    {configLoading ? (
                      "Salvando..."
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar Configurações Fiscais
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 4: RELATÓRIOS & EXPORTAÇÃO */}
          {activeTab === "relatorios" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 text-left">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                  📂 Exportação Consolidada de Emissões
                </h4>
                <p className="text-xs text-muted-foreground leading-normal font-semibold">
                  Selecione os filtros desejados e clique nas opções de exportação abaixo para transferir o balanço comercial documentado para outros formatos:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Filtro de Documento</label>
                    <select
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="todos">Todos os documentos</option>
                      <option value="recibo">Recibo Não Fiscal</option>
                      <option value="pedido">Pedido de Compra</option>
                      <option value="orcamento">Orçamento Comercial</option>
                      <option value="comprovante">Comprovante de Venda</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Status do Documento</label>
                    <select
                      value={filtroStatus}
                      onChange={(e) => setFiltroStatus(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="todos">Todos os status</option>
                      <option value="emitido">Emitido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Data Início</label>
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Data Fim</label>
                    <input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-border bg-white hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <FileDown className="w-4 h-4 text-emerald-600" /> Exportar CSV
                  </button>
                  
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-border bg-white hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Exportar Excel
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-black rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4" /> Imprimir Relatório PDF
                  </button>
                </div>
              </div>

              {/* Summary table info */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-left space-y-3">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                  ⚠️ Auditoria de Contabilidade Comercial
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                  A emissão de relatórios consolidados em PDF, CSV ou Excel serve como balanço interno operacional para monitoramento do fluxo do PDV. A responsabilidade por exportar e armazenar os orçamentos e pedidos para segurança e controle é exclusiva do estabelecimento comercial.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* DETAIL DOCUMENT DRAWER MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          
          <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col max-h-[90vh] text-left">
            {/* Header */}
            <div className="p-4 border-b border-border bg-slate-50 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Visualizar Documento Comercial
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Ficha detalhada de emissão e auditoria.</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs font-semibold">
              
              {/* Main Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Número do Documento</p>
                  <p className="text-sm font-black text-primary">{selectedDoc.numero}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Tipo / Série</p>
                  <p className="text-sm font-black text-foreground uppercase">{selectedDoc.tipo_documento} (Série: {selectedDoc.serie})</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Valor Líquido</p>
                  <p className="text-sm font-black text-foreground">{formatBRL(selectedDoc.valor_total)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Data de Emissão</p>
                  <p className="text-sm font-black text-foreground">{new Date(selectedDoc.emitido_em).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              {/* Status information and logs */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Status de Auditoria</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border",
                    selectedDoc.status === "emitido" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
                  )}>
                    {selectedDoc.status}
                  </span>
                  {selectedDoc.status === "cancelado" && (
                    <span className="text-[10px] text-red-600 font-bold">
                      Cancelado em: {new Date(selectedDoc.cancelado_em).toLocaleDateString("pt-BR")} | Motivo: {selectedDoc.motivo_cancelamento}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer details info */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">👤 Informações do Cliente</span>
                {selectedDoc.clientes ? (
                  <div className="bg-slate-50/30 border border-slate-100 p-3 rounded-xl space-y-1">
                    <p><strong>Nome:</strong> {selectedDoc.clientes.nome}</p>
                    <p><strong>CPF:</strong> {selectedDoc.clientes.cpf || "Não cadastrado"}</p>
                    <p><strong>Endereço:</strong> {selectedDoc.clientes.endereco || "Não informado"}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 font-semibold pl-2">Consumidor Final (Sem cadastro)</p>
                )}
              </div>

              {/* History trail list */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">⏳ Histórico do Documento (Trilha)</span>
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedDoc.historico && selectedDoc.historico.length > 0 ? (
                    selectedDoc.historico.map((h: any) => (
                      <div key={h.id} className="p-2.5 flex justify-between items-start text-[10px] font-semibold hover:bg-slate-50/30">
                        <div className="space-y-0.5">
                          <p className="text-black font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {h.acao.toUpperCase()}
                          </p>
                          <p className="text-slate-500">{h.detalhes}</p>
                        </div>
                        <span className="text-slate-400 text-[9px]">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4 font-semibold">Sem histórico registrado.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer with print options */}
            <div className="p-4 border-t border-border bg-slate-50 flex justify-between items-center flex-wrap gap-2">
              <div className="flex gap-1">
                {/* Print Format Selector */}
                {selectedDoc.status !== "cancelado" && (
                  <div className="flex border border-border bg-white rounded-xl overflow-hidden p-0.5">
                    {["58mm", "80mm", "A4"].map((f) => (
                      <button
                        key={f}
                        onClick={() => handleTriggerPrint(selectedDoc, f as any)}
                        className="px-2.5 py-1.5 text-[10px] font-extrabold hover:bg-slate-50 rounded-lg cursor-pointer transition-all active:scale-[0.98] text-slate-600 flex items-center gap-0.5"
                      >
                        <Printer className="w-3 h-3" />
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {/* Cancel Document (Manager only) */}
                {selectedDoc.status !== "cancelado" && !isReadOnly && (
                  <button
                    onClick={() => handleOpenCancel(selectedDoc.id)}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-border hover:bg-red-50 text-destructive text-xs font-black rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancelar Documento
                  </button>
                )}
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL REASON CONFIRM DIALOG MODAL */}
      {cancelDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setCancelDocId(null)} />
          
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col text-left">
            <div className="p-4 border-b border-border bg-slate-50 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 text-destructive">
                  ⚠️ Cancelar Documento Comercial
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Esta ação é irreversível.</p>
              </div>
              <button
                onClick={() => setCancelDocId(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Motivo do Cancelamento *</label>
                <textarea
                  required
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  placeholder="Informe o motivo da devolução, refaturamento ou cancelamento (mín. 5 caracteres)..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setCancelDocId(null)}
                className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="px-4 py-2 bg-destructive hover:bg-red-600 text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-red-500/10 active:scale-[0.98] transition-all flex items-center gap-1"
              >
                {cancelLoading ? "Processando..." : <><Trash2 className="w-4 h-4" /> Confirmar Cancelamento</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
