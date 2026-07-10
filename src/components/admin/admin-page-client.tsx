"use client";

import * as React from "react";
import type { GlobalAdminData } from "@/lib/actions/admin";
import { getGlobalAdminData } from "@/lib/actions/admin";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { 
  ShieldCheck, Landmark, Brain, Coins, Clock, 
  Database, RefreshCw, AlertTriangle, Users, 
  Search, ShieldAlert, BadgePercent, TrendingUp,
  CreditCard
} from "lucide-react";

export default function AdminPageClient() {
  const [loading, setLoading] = React.useState(true);
  const [adminData, setAdminData] = React.useState<GlobalAdminData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    loadAdminData();
  }, [refreshTrigger]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const res = await getGlobalAdminData();
      if (res.error) {
        toast.error(res.error);
      } else {
        setAdminData(res.data);
      }
    } catch {
      toast.error("Erro ao carregar dados administrativos globais.");
    } finally {
      setLoading(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  if (loading && !adminData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-muted rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-4 max-w-md mx-auto mt-10">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto animate-bounce" />
        <h3 className="text-sm font-black text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-muted-foreground">
          Você não possui permissões necessárias para visualizar o painel de monitoramento interno do ShopMind.
        </p>
      </div>
    );
  }

  const { global_kpis, stores_usage, recent_logs, recent_purchases } = adminData;

  // Filtragem dos logs de auditoria globais
  const filteredLogs = recent_logs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      log.nome_loja.toLowerCase().includes(q) ||
      (log.usuario_nome && log.usuario_nome.toLowerCase().includes(q)) ||
      log.pergunta.toLowerCase().includes(q) ||
      log.resposta.toLowerCase().includes(q)
    );
  });

  const cacheHitRate = global_kpis.total_queries > 0 
    ? ((global_kpis.total_cached / global_kpis.total_queries) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 animate-pulse-glow" /> Painel de Controle Global ShopMind
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoramento administrativo interno de consumo de IA, faturamento e créditos de todos os lojistas.
          </p>
        </div>
        
        <button
          onClick={() => setRefreshTrigger(p => p + 1)}
          className="p-2.5 bg-white border border-border hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          title="Atualizar Dados"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Global Executive KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Consultas Globais</span>
          <span className="text-lg font-black text-slate-800 block mt-1">{global_kpis.total_queries}</span>
          <span className="text-[8px] text-muted-foreground block mt-0.5">
            {global_kpis.total_success} concluídas | {global_kpis.total_blocked} bloqueadas
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Taxa de Cache Hit</span>
          <span className="text-lg font-black text-emerald-600 block mt-1">{cacheHitRate.toFixed(1)}%</span>
          <span className="text-[8px] text-emerald-600 font-semibold block mt-0.5">
            {global_kpis.total_cached} chamadas gratuitas
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Lojistas Ativos (IA)</span>
          <span className="text-lg font-black text-slate-800 block mt-1">{stores_usage.length}</span>
          <span className="text-[8px] text-muted-foreground block mt-0.5">lojas com créditos no mês</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-[9px] font-bold text-muted-foreground uppercase block">Tokens Consumidos</span>
          <span className="text-lg font-black text-slate-800 block mt-1">
            {new Intl.NumberFormat().format(global_kpis.total_tokens)}
          </span>
          <span className="text-[8px] text-muted-foreground block mt-0.5">acumulados na OpenAI</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm bg-gradient-to-br from-indigo-50/20 to-purple-50/10">
          <span className="text-[9px] font-bold text-indigo-700 uppercase block">Custo Total OpenAI</span>
          <span className="text-lg font-black text-indigo-600 block mt-1">
            ${global_kpis.total_cost_usd.toFixed(4)}
          </span>
          <span className="text-[8px] text-muted-foreground block mt-0.5">em dólares americanos</span>
        </div>

      </div>

      {/* Main Administrative Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* 1. Lojas & Consumo de Crédito (Left Table) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/20">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Lojas e Consumo Contábil de Créditos</h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Relatório geral de créditos utilizados, limites e custos por tenant.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 text-muted-foreground text-left">
                    <th className="px-4 py-3 font-bold">Lojista / Loja</th>
                    <th className="px-4 py-3 font-bold text-center">Período</th>
                    <th className="px-4 py-3 font-bold text-center">Consultas Usadas</th>
                    <th className="px-4 py-3 font-bold text-center">Limite Diário</th>
                    <th className="px-4 py-3 font-bold text-right">Tokens Consumidos</th>
                    <th className="px-4 py-3 font-bold text-right">Custo Estimado (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {stores_usage.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground italic">
                        Nenhum registro de consumo de créditos encontrado.
                      </td>
                    </tr>
                  ) : (
                    stores_usage.map((store, idx) => {
                      const isLimitReached = store.consultas_utilizadas >= store.consultas_totais;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-800">
                            <p className="text-xs">{store.nome_loja}</p>
                            <span className="text-[9px] text-muted-foreground font-mono">/{store.slug}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-600">
                            {String(store.mes).padStart(2, "0")}/{store.ano}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={cn("text-xs font-black px-2 py-0.5 rounded-lg border", {
                              "bg-rose-50 border-rose-200 text-rose-600": isLimitReached,
                              "bg-indigo-50 border-indigo-100 text-indigo-600": !isLimitReached,
                            })}>
                              {store.consultas_utilizadas} / {store.consultas_totais}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-700 font-bold">
                            {store.limite_diario} queries
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-600 font-medium">
                            {new Intl.NumberFormat().format(store.tokens_total)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-indigo-600 font-black">
                            ${Number(store.custo_estimado).toFixed(4)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 2. Recargas e Compras de Crédito (Right Table) */}
        <div className="space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border bg-slate-50/20">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-4 h-4 text-slate-400" /> Histórico de Recargas Globais
              </h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Livro comercial de pacotes de IA comprados por lojistas.</p>
            </div>
            
            <div className="divide-y divide-border/40 overflow-y-auto max-h-[420px] flex-1">
              {recent_purchases.length === 0 ? (
                <div className="p-8 text-center text-[10px] text-muted-foreground italic">
                  Nenhuma transação comercial registrada.
                </div>
              ) : (
                recent_purchases.map((purchase) => {
                  const isConfirmed = purchase.status === "confirmado";
                  return (
                    <div key={purchase.id} className="p-4 hover:bg-slate-50/30 transition-colors">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-black text-slate-800 truncate">
                          {purchase.nome_loja}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-semibold">
                          {new Date(purchase.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 block">
                            📦 {purchase.pacote_nome || `+${purchase.quantidade} consultas`}
                          </span>
                          <span className="text-[9px] text-indigo-600 font-bold mt-0.5 block">
                            {formatBRL(Number(purchase.valor))}
                          </span>
                        </div>

                        <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded border leading-none", {
                          "bg-emerald-50 border-emerald-200 text-emerald-600": isConfirmed,
                          "bg-amber-50 border-amber-200 text-amber-600": !isConfirmed,
                        })}>
                          {purchase.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Global Logs / Auditoria (Full Width bottom table) */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Logs header and search */}
        <div className="p-4 border-b border-border bg-slate-50/20 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-400" /> Registro Geral de Consultas (Auditoria)
            </h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Auditoria unificada e monitoramento de perguntas, respostas e cache hits em tempo real.</p>
          </div>

          <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-1.5 shadow-inner">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por loja, usuário, pergunta..."
              className="text-[10px] bg-transparent text-slate-700 placeholder:text-muted-foreground outline-none w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 text-muted-foreground text-left">
                <th className="px-4 py-3 font-bold w-44">Loja / Usuário</th>
                <th className="px-4 py-3 font-bold w-24 text-center">Tipo</th>
                <th className="px-4 py-3 font-bold w-80">Pergunta / Resposta</th>
                <th className="px-4 py-3 font-bold w-32 text-center">Modelo</th>
                <th className="px-4 py-3 font-bold w-20 text-center">Tokens</th>
                <th className="px-4 py-3 font-bold w-24 text-right">Custo (USD)</th>
                <th className="px-4 py-3 font-bold w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground italic">
                    Nenhum log de auditoria encontrado correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.status === "concluida";
                  const isBlocked = log.status === "bloqueada";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors align-top">
                      
                      {/* Loja / Usuário */}
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        <p className="font-bold text-slate-800">{log.nome_loja}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{log.usuario_nome || "Sistema"}</p>
                        <span className="text-[8px] text-slate-400 block mt-1">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-[9px] font-bold uppercase bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          {log.tipo || "geral"}
                        </span>
                      </td>

                      {/* Pergunta / Resposta */}
                      <td className="px-4 py-3.5 max-w-xs space-y-1">
                        <p className="font-bold text-slate-800 line-clamp-2">Q: {log.pergunta}</p>
                        <p className="text-[10px] text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/50 p-1.5 rounded border border-slate-100">
                          A: {log.resposta}
                        </p>
                      </td>

                      {/* Modelo */}
                      <td className="px-4 py-3.5 text-center font-mono text-[9px] text-slate-600">
                        {log.modelo || "-"}
                      </td>

                      {/* Tokens */}
                      <td className="px-4 py-3.5 text-center text-slate-700 font-bold">
                        {log.is_cached ? 0 : new Intl.NumberFormat().format(log.tokens_total)}
                      </td>

                      {/* Custo */}
                      <td className="px-4 py-3.5 text-right text-indigo-600 font-black">
                        {log.is_cached ? "$0.0000" : `$${Number(log.custo_estimado).toFixed(4)}`}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border leading-none", {
                            "bg-emerald-50 border-emerald-200 text-emerald-600": isSuccess,
                            "bg-rose-50 border-rose-200 text-rose-600": isBlocked || !isSuccess,
                          })}>
                            {log.status}
                          </span>
                          
                          {log.is_cached && (
                            <span className="text-[7px] font-black uppercase bg-teal-50 border border-teal-150 text-teal-600 px-1 rounded flex items-center gap-0.5">
                              <Database size={8} /> CACHE
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
