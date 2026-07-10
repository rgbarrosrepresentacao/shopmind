"use client";

import * as React from "react";
import { 
  getFidelidadeConfig, 
  getFidelidadeKPIs, 
  getInsightsFidelidade, 
  getClientesInativosRecuperacao, 
  getCampanhasFidelidade, 
  getRecompensasFidelidade, 
  getClientesFidelidadeRanking 
} from "@/lib/actions/fidelidade";
import { FidelidadeKPIs } from "./fidelidade-kpis";
import { FidelidadeInsights } from "./fidelidade-insights";
import { FidelidadeRecuperacao } from "./fidelidade-recuperacao";
import { FidelidadeCampanhas } from "./fidelidade-campanhas";
import { FidelidadeRecompensas } from "./fidelidade-recompensas";
import { FidelidadeRanking } from "./fidelidade-ranking";
import { FidelidadeConfig } from "./fidelidade-config";
import { Gift, Coins, Award, HelpCircle, LayoutDashboard, Settings, BellRing, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

interface FidelidadePageClientProps {
  userTipo: string;
}

export default function FidelidadePageClient({ userTipo }: FidelidadePageClientProps) {
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "recuperacao" | "campanhas" | "recompensas" | "ranking" | "config">("dashboard");
  const [loading, setLoading] = React.useState(true);

  // Consolidated Dashboard States
  const [kpis, setKpis] = React.useState<any>(null);
  const [insights, setInsights] = React.useState<string[]>([]);
  const [recuperacaoData, setRecuperacaoData] = React.useState<any>(null);
  const [campanhas, setCampanhas] = React.useState<any[]>([]);
  const [recompensas, setRecompensas] = React.useState<any[]>([]);
  const [ranking, setRanking] = React.useState<any[]>([]);
  const [config, setConfig] = React.useState<any>(null);

  // Sorting for ranking tab
  const [rankingSort, setRankingSort] = React.useState<"total_gasto" | "total_compras" | "ticket_medio">("total_gasto");
  const [loadingRanking, setLoadingRanking] = React.useState(false);

  React.useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        kpisRes,
        insightsRes,
        recuperacaoRes,
        campanhasRes,
        recompensasRes,
        rankingRes,
        configRes
      ] = await Promise.all([
        getFidelidadeKPIs(),
        getInsightsFidelidade(),
        getClientesInativosRecuperacao(),
        getCampanhasFidelidade(),
        getRecompensasFidelidade(),
        getClientesFidelidadeRanking(rankingSort),
        getFidelidadeConfig()
      ]);

      if (kpisRes.data) setKpis(kpisRes.data);
      if (insightsRes.data) setInsights(insightsRes.data);
      if (recuperacaoRes.data) setRecuperacaoData(recuperacaoRes.data);
      if (campanhasRes.data) setCampanhas(campanhasRes.data);
      if (recompensasRes.data) setRecompensas(recompensasRes.data);
      if (rankingRes.data) setRanking(rankingRes.data);
      if (configRes.data) setConfig(configRes.data);

    } catch (err) {
      toast.error("Erro ao carregar dados de fidelidade");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reload ranking specifically when sorting changes
  const handleRankingSortChange = async (sort: "total_gasto" | "total_compras" | "ticket_medio") => {
    setRankingSort(sort);
    setLoadingRanking(true);
    try {
      const res = await getClientesFidelidadeRanking(sort);
      if (res.data) {
        setRanking(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRanking(false);
    }
  };

  // --- EXPORTERS UTILITIES (CSV, EXCEL, PDF) ---

  // A. CSV Exporter (Nativo)
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  };

  // B. Excel Exporter (HTML Table Wrapper)
  const exportToExcel = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("Não há dados para exportar.");
      return;
    }
    const headers = Object.keys(data[0]).map(h => `<th>${h}</th>`).join("");
    const rows = data.map(row => 
      `<tr>${Object.values(row).map(val => `<td>${val}</td>`).join("")}</tr>`
    ).join("");
    
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          table { border-collapse: collapse; font-family: sans-serif; } 
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; } 
          th { background-color: #6366f1; color: #ffffff; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h2>ShopMind — Relatório Comercial</h2>
        <table>
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel exportado com sucesso!");
  };

  // C. PDF Exporter (Print Window Wrapper)
  const exportToPDF = (title: string, columns: string[], rows: any[][]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Por favor, ative os pop-ups para imprimir o relatório.");
      return;
    }

    const headersHTML = columns.map(col => `<th>${col}</th>`).join("");
    const rowsHTML = rows.map(row => 
      `<tr>${row.map(val => `<td>${val}</td>`).join("")}</tr>`
    ).join("");
    
    const today = new Date().toLocaleDateString('pt-BR');

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; padding: 35px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px; }
            .logo { font-size: 24px; font-weight: 900; color: #6366f1; letter-spacing: -0.5px; }
            .date { font-size: 11px; color: #64748b; font-weight: bold; }
            h1 { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 10px 12px; font-size: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 50px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ShopMind</div>
            <div class="date">Gerado em: ${today}</div>
          </div>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>${headersHTML}</tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <div class="footer">
            ShopMind Fidelidade & Retenção — Todos os direitos reservados.
          </div>
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

  return (
    <div className="space-y-6 select-none">
      {/* Header section with refresh button */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            🎁 Fidelidade Inteligente & Cashback
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie campanhas promocionais, catálogo de prêmios e acompanhe a retenção de clientes.
          </p>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3.5 py-2 border border-border bg-card rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", { "animate-spin": loading })} />
          Atualizar Dados
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto select-none">
        {[
          { id: "dashboard", label: "Painel Geral", icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: "recuperacao", label: "Central de Recuperação", icon: <BellRing className="w-4 h-4" /> },
          { id: "campanhas", label: "Campanhas", icon: <Gift className="w-4 h-4" /> },
          { id: "recompensas", label: "Prêmios & Recompensas", icon: <Coins className="w-4 h-4" /> },
          { id: "ranking", label: "Ranking de Clientes", icon: <Award className="w-4 h-4" /> },
          { id: "config", label: "Configurações", icon: <Settings className="w-4 h-4" /> },
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

      {/* RENDER ACTIVE TAB COMPONENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 bg-card border border-border rounded-2xl p-8">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Carregando dados do programa de fidelidade...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: DASHBOARD GENERAL OVERVIEW */}
          {activeTab === "dashboard" && kpis && (
            <div className="space-y-6 animate-fade-in">
              <FidelidadeKPIs kpis={kpis} />
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                <div className="xl:col-span-2">
                  {/* Local Insights */}
                  <FidelidadeInsights insights={insights} loading={loading} />
                </div>
                
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    💡 Dicas Rápidas de Fidelidade
                  </h4>
                  <div className="text-xs text-slate-600 leading-relaxed font-semibold space-y-3 pt-2">
                    <p>• <strong>R$ 1 = 1 ponto</strong> é a conversão mais comum e fácil de entender para o consumidor final.</p>
                    <p>• Crie campanhas de <strong>Pontos em Dobro</strong> em dias específicos (ex: terças-feiras) para aquecer o movimento da loja.</p>
                    <p>• <strong>Cashback de 2% a 5%</strong> garante que o cliente sempre saia sabendo que possui descontos te esperando no próximo retorno.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CENTRAL DE RECUPERAÇÃO */}
          {activeTab === "recuperacao" && recuperacaoData && (
            <div className="animate-fade-in">
              <FidelidadeRecuperacao 
                recuperacaoData={recuperacaoData} 
                loading={loading}
                onExportCSV={exportToCSV}
                onExportExcel={exportToExcel}
                onExportPDF={exportToPDF}
              />
            </div>
          )}

          {/* TAB 3: CAMPANHAS */}
          {activeTab === "campanhas" && (
            <div className="animate-fade-in">
              <FidelidadeCampanhas 
                campanhas={campanhas} 
                loading={loading} 
                userTipo={userTipo}
                onRefresh={loadAllData}
              />
            </div>
          )}

          {/* TAB 4: PRÊMIOS & RECOMPENSAS */}
          {activeTab === "recompensas" && (
            <div className="animate-fade-in">
              <FidelidadeRecompensas 
                recompensas={recompensas} 
                loading={loading} 
                userTipo={userTipo}
                onRefresh={loadAllData}
              />
            </div>
          )}

          {/* TAB 5: RANKING DE CLIENTES */}
          {activeTab === "ranking" && (
            <div className="animate-fade-in">
              <FidelidadeRanking 
                ranking={ranking} 
                loading={loadingRanking}
                onExportCSV={exportToCSV}
                onExportExcel={exportToExcel}
                onExportPDF={exportToPDF}
                sortBy={rankingSort}
                onSortChange={handleRankingSortChange}
              />
            </div>
          )}

          {/* TAB 6: CONFIGURAÇÕES */}
          {activeTab === "config" && (
            <div className="animate-fade-in">
              <FidelidadeConfig 
                initialConfig={config} 
                userTipo={userTipo} 
                onRefresh={loadAllData}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
