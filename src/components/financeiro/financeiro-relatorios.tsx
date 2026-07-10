import * as React from "react";
import type { FinanceiroTransacao } from "@/lib/types/financeiro";
import { listFinanceiro } from "@/lib/actions/financeiro";
import { formatBRL } from "@/lib/types/compras";
import { toast } from "@/components/ui/toast";
import { 
  FileText, Download, Printer, Share2, BarChart3, 
  TrendingUp, TrendingDown, RefreshCw, Calendar 
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function FinanceiroRelatorios() {
  const [loading, setLoading] = React.useState(true);
  const [transacoes, setTransacoes] = React.useState<FinanceiroTransacao[]>([]);

  // Filtros de período do relatório
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  React.useEffect(() => {
    loadAllTransactionsForReports();
  }, [dataInicio, dataFim, refreshTrigger]);

  const loadAllTransactionsForReports = async () => {
    setLoading(true);
    try {
      // Buscar todos os registros do período sem limite de paginação (limite alto 1000)
      const res = await listFinanceiro({
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        perPage: 1000,
        page: 1,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        setTransacoes(res.data || []);
      }
    } catch {
      toast.error("Erro ao gerar relatórios.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // AGREGADORES CONTÁBEIS (Client-Side)
  // ============================================
  
  // 1. Receitas vs Despesas
  const totalReceitas = transacoes.filter(t => t.tipo === "receita" && t.status === "pago").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = transacoes.filter(t => t.tipo === "despesa" && t.status === "pago").reduce((acc, t) => acc + Number(t.valor), 0);
  const lucroLiquido = totalReceitas - totalDespesas;

  // 2. Agrupamento por Categoria
  const despesasPorCategoria: Record<string, number> = {};
  const receitasPorCategoria: Record<string, number> = {};

  transacoes.forEach(t => {
    if (t.status !== "pago") return; // Apenas conciliações efetivadas
    const valor = Number(t.valor);
    if (t.tipo === "receita") {
      receitasPorCategoria[t.categoria] = (receitasPorCategoria[t.categoria] || 0) + valor;
    } else {
      despesasPorCategoria[t.categoria] = (despesasPorCategoria[t.categoria] || 0) + valor;
    }
  });

  // 3. Agrupamento por Status de Pendências
  const totalReceberPendente = transacoes.filter(t => t.tipo === "receita" && t.status === "pendente").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalReceberAtrasado = transacoes.filter(t => t.tipo === "receita" && t.status === "atrasado").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalPagarPendente = transacoes.filter(t => t.tipo === "despesa" && t.status === "pendente").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalPagarAtrasado = transacoes.filter(t => t.tipo === "despesa" && t.status === "atrasado").reduce((acc, t) => acc + Number(t.valor), 0);

  // ============================================
  // EXPORTADORES DE DOCUMENTOS
  // ============================================
  
  // 1. Exportar CSV
  const handleExportCSV = () => {
    if (transacoes.length === 0) return;
    
    const headers = ["Descricao", "Tipo", "Valor", "Categoria", "Status", "Vencimento", "Pagamento", "Origem", "Parcela"];
    const rows = transacoes.map(t => [
      t.descricao,
      t.tipo === "receita" ? "Receita" : "Despesa",
      t.valor.toFixed(2),
      t.categoria,
      t.status,
      t.data_vencimento,
      t.data_pagamento || "",
      t.origem,
      `${t.numero_parcela}/${t.total_parcelas}`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado!");
  };

  // 2. Exportar Excel (HTML Table Trick)
  const handleExportExcel = () => {
    if (transacoes.length === 0) return;

    const headers = ["Descricao", "Tipo", "Valor", "Categoria", "Status", "Vencimento", "Pagamento", "Origem", "Parcela"];
    const rows = transacoes.map(t => [
      t.descricao,
      t.tipo === "receita" ? "Receita" : "Despesa",
      t.valor.toFixed(2),
      t.categoria,
      t.status,
      t.data_vencimento,
      t.data_pagamento || "",
      t.origem,
      `${t.numero_parcela}/${t.total_parcelas}`,
    ]);

    let tsvContent = "\uFEFF" + headers.join("\t") + "\n";
    rows.forEach(r => {
      tsvContent += r.join("\t") + "\n";
    });

    const blob = new Blob([tsvContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel exportado!");
  };

  // 3. Imprimir / PDF
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      
      {/* Filters & Export Actions Header */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/20">
        
        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" /> Período Contábil:
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="bg-white border border-border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none text-foreground cursor-pointer shadow-sm"
            />
            <span className="text-muted-foreground font-medium text-xs">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="bg-white border border-border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none text-foreground cursor-pointer shadow-sm"
            />
          </div>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="p-2 border border-border bg-white text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Atualizar Relatórios"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={transacoes.length === 0}
            className="px-3.5 py-2 text-[10px] font-black text-slate-700 hover:text-primary bg-white border border-border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={transacoes.length === 0}
            className="px-3.5 py-2 text-[10px] font-black text-slate-700 hover:text-emerald-600 bg-white border border-border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Share2 className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={transacoes.length === 0}
            className="px-3.5 py-2 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
          </button>
        </div>

      </div>

      {loading ? (
        <div className="h-48 bg-muted rounded-2xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Summary Box: Receitas vs Despesas (Competência Efetivada) */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary" /> Equilíbrio de Lançamentos Liquidados
            </h4>
            
            <div className="space-y-3.5 font-bold text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Total Recebido (Receitas)</span>
                <span className="text-emerald-600">{formatBRL(totalReceitas)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-rose-500" /> Total Pago (Despesas)</span>
                <span className="text-rose-600">{formatBRL(totalDespesas)}</span>
              </div>
              <div className={cn("flex justify-between items-center py-2 px-3 rounded-xl border", {
                "bg-emerald-50 text-emerald-800 border-emerald-100": lucroLiquido >= 0,
                "bg-rose-50 text-rose-800 border-rose-100": lucroLiquido < 0
              })}>
                <span className="font-black">Resultado Operacional</span>
                <span className="font-black text-sm">{formatBRL(lucroLiquido)}</span>
              </div>
            </div>
          </div>

          {/* Summary Box: Pendências / Provisões */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" /> Provisões e Títulos Pendentes
            </h4>
            
            <div className="space-y-2.5 font-bold text-[10px] sm:text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">A Receber: Pendentes Futuros</span>
                <span className="text-blue-600">{formatBRL(totalReceberPendente)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">A Receber: Atrasados (Inadimplência)</span>
                <span className="text-rose-600">{formatBRL(totalReceberAtrasado)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">A Pagar: Pendentes Futuros</span>
                <span className="text-amber-600">{formatBRL(totalPagarPendente)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">A Pagar: Atrasados (Compromissos)</span>
                <span className="text-rose-600">{formatBRL(totalPagarAtrasado)}</span>
              </div>
            </div>
          </div>

          {/* Summary Box: Receitas por Categoria */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Detalhamento de Receitas por Categoria</h4>
            <div className="space-y-2 max-h-52 overflow-y-auto font-bold text-xs pr-1">
              {Object.keys(receitasPorCategoria).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">Sem dados de receitas registradas.</p>
              ) : (
                Object.entries(receitasPorCategoria).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">{cat}</span>
                    <span className="text-emerald-600">{formatBRL(val)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary Box: Despesas por Categoria */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Detalhamento de Despesas por Categoria</h4>
            <div className="space-y-2 max-h-52 overflow-y-auto font-bold text-xs pr-1">
              {Object.keys(despesasPorCategoria).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">Sem dados de despesas registradas.</p>
              ) : (
                Object.entries(despesasPorCategoria).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">{cat}</span>
                    <span className="text-rose-600">{formatBRL(val)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
