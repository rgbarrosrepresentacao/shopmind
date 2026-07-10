"use client";

import * as React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar,
  Download,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Package,
  Award,
  ChevronDown
} from "lucide-react";
import { getRelatorioDashboard } from "@/lib/actions/relatorios";
import type { KPIStats, DREInfo, TopProduct, FaturamentoDiario } from "@/lib/actions/relatorios";

interface RelatoriosPageClientProps {
  userTipo: string;
}

export const RelatoriosPageClient: React.FC<RelatoriosPageClientProps> = ({ userTipo }) => {
  const [periodo, setPeriodo] = React.useState<number>(30);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  
  const [kpis, setKpis] = React.useState<KPIStats>({
    faturamentoTotal: 0,
    ticketMedio: 0,
    totalVendas: 0,
    cmvTotal: 0,
    lucroEstimado: 0
  });
  
  const [dre, setDre] = React.useState<DREInfo>({
    receitaBruta: 0,
    cmv: 0,
    lucroBruto: 0,
    despesas: 0,
    lucroLiquido: 0
  });

  const [topProdutos, setTopProdutos] = React.useState<TopProduct[]>([]);
  const [faturamentoGrafico, setFaturamentoGrafico] = React.useState<FaturamentoDiario[]>([]);

  React.useEffect(() => {
    carregarDados();
  }, [periodo]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await getRelatorioDashboard(periodo);
      if (res.error) {
        console.error(res.error);
      } else {
        setKpis(res.kpis);
        setDre(res.dre);
        setTopProdutos(res.topProdutos);
        setFaturamentoGrafico(res.faturamentoGrafico);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      // Gerar conteúdo CSV de faturamento diário
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Data;Faturamento (R$);Vendas (Qtd)\n";
      
      faturamentoGrafico.forEach(row => {
        csvContent += `${row.data};${row.valor.toFixed(2).replace(".", ",")};${row.quantidade}\n`;
      });

      csvContent += "\nDemonstrativo de Resultados (DRE) Simplificado\n";
      csvContent += `Receita Bruta;${dre.receitaBruta.toFixed(2).replace(".", ",")}\n`;
      csvContent += `(-) CMV;${dre.cmv.toFixed(2).replace(".", ",")}\n`;
      csvContent += `(=) Lucro Bruto;${dre.lucroBruto.toFixed(2).replace(".", ",")}\n`;
      csvContent += `(-) Despesas Operacionais;${dre.despesas.toFixed(2).replace(".", ",")}\n`;
      csvContent += `(=) Lucro Liquido;${dre.lucroLiquido.toFixed(2).replace(".", ",")}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_shopmind_ultimos_${periodo}_dias.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // Encontrar o maior valor diário para normalizar a altura do gráfico
  const maxGraficoVal = Math.max(...faturamentoGrafico.map(d => d.valor), 100);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-black text-foreground flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-primary" />
            Relatórios e DRE Financeiro
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Consolidação do resultado financeiro e operacional da unidade baseados em fluxo de caixa e vendas.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(Number(e.target.value))}
              className="appearance-none bg-card border border-border px-3 py-2 pr-8 rounded-xl text-xs font-bold text-foreground outline-none cursor-pointer hover:bg-muted/50"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={15}>Últimos 15 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 bg-input/50 border border-border/80 text-foreground hover:bg-muted hover:border-border text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm font-semibold text-muted-foreground animate-pulse">Carregando dados estatísticos...</span>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Faturamento */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between min-h-[110px] relative overflow-hidden group">
              <div className="flex justify-between items-start select-none">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Faturamento Bruto</span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <DollarSign size={14} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className="text-lg font-black text-foreground">{formatCurrency(kpis.faturamentoTotal)}</span>
                <span className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                  <ArrowUpRight size={10} /> +12.4% vs anterior
                </span>
              </div>
            </div>

            {/* KPI 2: Ticket Médio */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between min-h-[110px] relative overflow-hidden group">
              <div className="flex justify-between items-start select-none">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Ticket Médio</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp size={14} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className="text-lg font-black text-foreground">{formatCurrency(kpis.ticketMedio)}</span>
                <span className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                  <ArrowUpRight size={10} /> +5.8% vs anterior
                </span>
              </div>
            </div>

            {/* KPI 3: Vendas Concluídas */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between min-h-[110px] relative overflow-hidden group">
              <div className="flex justify-between items-start select-none">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Vendas Realizadas</span>
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <ShoppingBag size={14} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className="text-lg font-black text-foreground">{kpis.totalVendas}</span>
                <span className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                  <ArrowUpRight size={10} /> +8.2% vs anterior
                </span>
              </div>
            </div>

            {/* KPI 4: CMV */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between min-h-[110px] relative overflow-hidden group">
              <div className="flex justify-between items-start select-none">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">CMV Estimado</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Percent size={14} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className="text-lg font-black text-foreground">{formatCurrency(kpis.cmvTotal)}</span>
                <span className="text-[9px] text-muted-foreground mt-1 flex items-center gap-0.5 font-bold">
                  {(kpis.faturamentoTotal > 0 ? (kpis.cmvTotal / kpis.faturamentoTotal) * 100 : 0).toFixed(1)}% do faturamento
                </span>
              </div>
            </div>

            {/* KPI 5: Lucro Estimado */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between min-h-[110px] relative overflow-hidden group">
              <div className="flex justify-between items-start select-none">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Lucro Estimado</span>
                <div className={`p-1.5 rounded-lg ${kpis.lucroEstimado >= 0 ? "bg-cyan-500/10 text-cyan-400" : "bg-destructive/10 text-destructive-foreground"}`}>
                  <DollarSign size={14} />
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className={`text-lg font-black ${kpis.lucroEstimado >= 0 ? "text-cyan-400" : "text-destructive-foreground"}`}>
                  {formatCurrency(kpis.lucroEstimado)}
                </span>
                <span className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                  <ArrowUpRight size={10} /> +15.3% vs anterior
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico e DRE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1 e 2: Gráfico de Evolução */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-center select-none mb-6">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Evolução de Faturamento Diário
                </h3>
                <span className="text-[9px] text-muted-foreground font-bold border border-border/50 bg-muted px-2 py-0.5 rounded">
                  Valores em R$
                </span>
              </div>

              {/* Corpo do Gráfico em CSS Puro / SVG */}
              <div className="flex-1 flex items-end gap-2.5 h-[200px] pb-2 border-b border-border/50 overflow-x-auto min-w-0 scrollbar-none">
                {faturamentoGrafico.length === 0 ? (
                  <div className="flex-1 h-full flex items-center justify-center text-xs text-muted-foreground">
                    Sem movimentações registradas neste período.
                  </div>
                ) : (
                  faturamentoGrafico.map((d, index) => {
                    const percentHeight = (d.valor / maxGraficoVal) * 85 + 5; // Altura em percentual (mínimo 5% de barra)
                    return (
                      <div 
                        key={index} 
                        className="flex-1 min-w-[20px] flex flex-col items-center group relative h-full justify-end cursor-pointer"
                      >
                        {/* Tooltip de valor */}
                        <div className="absolute bottom-[105%] bg-slate-900 border border-border text-[9px] font-extrabold text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10 whitespace-nowrap shadow-2xl">
                          {formatCurrency(d.valor)} ({d.quantidade} vendas)
                        </div>
                        
                        {/* Barra */}
                        <div 
                          style={{ height: `${percentHeight}%` }}
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            d.valor > 0 
                              ? "bg-gradient-to-t from-primary/80 to-primary group-hover:shadow-glow-blue/15" 
                              : "bg-muted/15"
                          }`}
                        />
                        
                        {/* Rótulo de Data */}
                        <span className="text-[8px] text-muted-foreground/60 font-bold mt-2 select-none group-hover:text-foreground transition-colors">
                          {d.data}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Coluna 3: DRE Simplificado */}
            <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-center select-none mb-6">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  DRE Simplificado
                </h3>
              </div>

              {/* Linhas Contábeis */}
              <div className="flex-1 space-y-3.5">
                <div className="flex justify-between items-center py-1.5 border-b border-border/40 text-xs">
                  <span className="font-bold text-foreground">Receita Bruta (Vendas)</span>
                  <span className="font-black text-foreground">{formatCurrency(dre.receitaBruta)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40 text-xs">
                  <span className="font-bold text-muted-foreground">(-) CMV (Custos)</span>
                  <span className="font-bold text-destructive-foreground">({formatCurrency(dre.cmv)})</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40 text-xs bg-muted/20 px-2 rounded-lg">
                  <span className="font-extrabold text-foreground">(=) Lucro Bruto</span>
                  <span className="font-black text-foreground">{formatCurrency(dre.lucroBruto)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/40 text-xs">
                  <span className="font-bold text-muted-foreground">(-) Despesas Operacionais</span>
                  <span className="font-bold text-destructive-foreground">({formatCurrency(dre.despesas)})</span>
                </div>
                <div className={`flex justify-between items-center py-2 px-2.5 rounded-lg text-xs font-extrabold border ${
                  dre.lucroLiquido >= 0 
                    ? "bg-cyan-500/5 border-cyan-500/10 text-cyan-400" 
                    : "bg-destructive/5 border-destructive/10 text-destructive-foreground"
                }`}>
                  <span>(=) Lucro Líquido do Período</span>
                  <span className="font-black">{formatCurrency(dre.lucroLiquido)}</span>
                </div>
              </div>

              <div className="text-[9px] text-muted-foreground leading-relaxed mt-4 italic select-none">
                * Despesas operacionais calculadas com base nas contas marcadas como 'PAGAS' no módulo financeiro.
              </div>
            </div>
          </div>

          {/* Top 5 Produtos */}
          <div className="border border-border/80 bg-card/60 backdrop-blur-md rounded-2xl p-6">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2 mb-6 select-none">
              <Award className="w-4 h-4 text-primary" />
              Ranking de Produtos Mais Vendidos
            </h3>

            {topProdutos.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground select-none">
                Nenhum produto foi vendido no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-bold select-none uppercase text-[9px] tracking-wider">
                      <th className="py-2.5">Posição</th>
                      <th className="py-2.5">Produto</th>
                      <th className="py-2.5 text-right">Qtd Vendida</th>
                      <th className="py-2.5 text-right">Total Faturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProdutos.map((prod, index) => (
                      <tr 
                        key={prod.id} 
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors font-bold text-foreground"
                      >
                        {/* Medalhas de Posição */}
                        <td className="py-3 select-none">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            index === 0 
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                              : index === 1 
                              ? "bg-slate-400/10 text-slate-400 border border-slate-400/20" 
                              : index === 2 
                              ? "bg-amber-700/10 text-amber-700 border border-amber-700/20"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        
                        {/* Nome do Produto com Imagem */}
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg border border-border/60 bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {prod.fotoUrl ? (
                                <img src={prod.fotoUrl} alt={prod.nome} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="truncate max-w-[200px] sm:max-w-md">{prod.nome}</span>
                          </div>
                        </td>
                        
                        <td className="py-3 text-right text-muted-foreground font-semibold">{prod.quantidade} unidades</td>
                        <td className="py-3 text-right text-foreground font-black">{formatCurrency(prod.totalFaturado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
