"use client";

import * as React from "react";
import { Award, Search, ArrowUpRight, TrendingUp, ShoppingCart, DollarSign, Calendar } from "lucide-react";
import { formatBRL } from "@/lib/types/produtos";
import { cn } from "@/lib/utils/cn";

interface ClienteRanking {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  total_compras: number;
  total_gasto: number;
  nivel_vip: string;
  ultima_compra: string | null;
  ticket_medio: number;
}

interface FidelidadeRankingProps {
  ranking: ClienteRanking[];
  loading: boolean;
  onExportCSV: (list: any[], name: string) => void;
  onExportExcel: (list: any[], name: string) => void;
  onExportPDF: (title: string, columns: string[], data: any[]) => void;
  sortBy: "total_gasto" | "total_compras" | "ticket_medio";
  onSortChange: (sort: "total_gasto" | "total_compras" | "ticket_medio") => void;
}

export const FidelidadeRanking: React.FC<FidelidadeRankingProps> = ({
  ranking,
  loading,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  sortBy,
  onSortChange,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredRanking = React.useMemo(() => {
    if (!searchQuery.trim()) return ranking;
    return ranking.filter((c) =>
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.telefone && c.telefone.includes(searchQuery))
    );
  }, [ranking, searchQuery]);

  // Medal / Trophy display for Top 3
  const getRankMedal = (index: number) => {
    if (index === 0) return <span className="text-xl">🥇</span>;
    if (index === 1) return <span className="text-xl">🥈</span>;
    if (index === 2) return <span className="text-xl">🥉</span>;
    return <span className="text-xs font-black text-slate-400">#{index + 1}</span>;
  };

  const getVIPStyle = (level: string) => {
    switch (level) {
      case 'VIP':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'Diamante':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'Ouro':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'Prata':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  // Export handlers
  const handleExport = (type: "csv" | "excel" | "pdf") => {
    const listName = `Ranking_Clientes_${sortBy}`;
    const title = `Ranking de Clientes ShopMind - Ordenado por ${
      sortBy === "total_gasto" ? "Gasto Total" : sortBy === "total_compras" ? "Compras" : "Ticket Médio"
    }`;

    // Format data for export
    const exportData = filteredRanking.map((c, index) => ({
      Posicao: index + 1,
      Nome: c.nome,
      Telefone: c.telefone || "Sem telefone",
      Email: c.email || "Sem e-mail",
      VIP: c.nivel_vip,
      Compras: c.total_compras,
      GastoTotal: formatBRL(c.total_gasto),
      TicketMedio: formatBRL(c.ticket_medio),
      UltimaCompra: c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('pt-BR') : "—"
    }));

    if (type === "csv") {
      onExportCSV(exportData, listName);
    } else if (type === "excel") {
      onExportExcel(exportData, listName);
    } else {
      const cols = ["Pos", "Nome", "VIP", "Compras", "Gasto Total", "Ticket Médio", "Última Compra"];
      const rows = filteredRanking.map((c, idx) => [
        `#${idx + 1}`,
        c.nome,
        c.nivel_vip,
        c.total_compras.toString(),
        formatBRL(c.total_gasto),
        formatBRL(c.ticket_medio),
        c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('pt-BR') : "—"
      ]);
      onExportPDF(title, cols, rows);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Header control with sorting buttons */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div>
          <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
            <Award className="w-4 h-4 text-primary" /> Ranking Geral de Clientes
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Visualize e ordene os clientes que mais geram valor e compras recorrentes na loja.
          </p>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto select-none">
          {[
            { id: "total_gasto", label: "Gasto Total", icon: <DollarSign className="w-3.5 h-3.5" /> },
            { id: "total_compras", label: "Qtd. Compras", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
            { id: "ticket_medio", label: "Ticket Médio", icon: <TrendingUp className="w-3.5 h-3.5" /> }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => onSortChange(btn.id as any)}
              className={cn(
                "flex items-center gap-1 px-3 py-2 border rounded-xl text-xs font-extrabold cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap",
                {
                  "bg-primary border-primary text-white shadow-sm shadow-primary/10": sortBy === btn.id,
                  "bg-white border-border text-slate-500 hover:bg-slate-50": sortBy !== btn.id
                }
              )}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search and Exports Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar ranking por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-border rounded-xl text-xs outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <span className="text-[10px] uppercase font-black text-muted-foreground hidden md:inline">Exportar ranking:</span>
          <button
            disabled={filteredRanking.length === 0}
            onClick={() => handleExport("csv")}
            className="flex-1 sm:flex-initial px-3 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            CSV
          </button>
          <button
            disabled={filteredRanking.length === 0}
            onClick={() => handleExport("excel")}
            className="flex-1 sm:flex-initial px-3 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Excel
          </button>
          <button
            disabled={filteredRanking.length === 0}
            onClick={() => handleExport("pdf")}
            className="flex-1 sm:flex-initial px-3 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Ranking List / Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-muted-foreground">Calculando ranking de clientes...</p>
          </div>
        ) : filteredRanking.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl m-4 space-y-2">
            <span className="text-3xl">👥</span>
            <p className="text-sm font-extrabold text-foreground">Nenhum cliente no ranking</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Realize vendas identificando clientes no caixa para gerar o ranking de fidelização.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-muted-foreground border-b border-border font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5 w-16 text-center">Pos</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">VIP</th>
                  <th className="px-5 py-3.5">Compras</th>
                  <th className="px-5 py-3.5">Gasto Total</th>
                  <th className="px-5 py-3.5">Ticket Médio</th>
                  <th className="px-5 py-3.5">Última Compra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold">
                {filteredRanking.map((c, idx) => (
                  <tr 
                    key={c.id} 
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors text-slate-700",
                      {
                        "bg-amber-500/3": idx === 0,
                        "bg-slate-500/2": idx === 1,
                        "bg-amber-700/2": idx === 2
                      }
                    )}
                  >
                    <td className="px-5 py-4 text-center font-black">
                      {getRankMedal(idx)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-extrabold text-foreground flex items-center gap-1.5">
                        {c.nome}
                        {idx === 0 && <span className="text-[10px] bg-amber-500/15 text-amber-700 px-2 py-0.5 rounded-full border border-amber-500/20">Top 1</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {c.email || "Sem e-mail"} | {c.telefone || "Sem celular"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border", getVIPStyle(c.nivel_vip))}>
                        {c.nivel_vip}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-foreground">
                      {c.total_compras} compras
                    </td>
                    <td className="px-5 py-4 font-black text-slate-800">
                      {formatBRL(c.total_gasto)}
                    </td>
                    <td className="px-5 py-4 font-black text-primary">
                      {formatBRL(c.ticket_medio)}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-[11px] flex items-center gap-1.5 mt-2.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('pt-BR') : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
