import * as React from "react";
import type { FinanceiroTransacao } from "@/lib/types/financeiro";
import { formatBRL } from "@/lib/types/compras";
import { listFinanceiro, receberOuPagarTitulo, excluirLancamentoLogico } from "@/lib/actions/financeiro";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { 
  Search, Filter, Plus, Calendar, CheckCircle, 
  XCircle, Edit, Trash2, ChevronLeft, ChevronRight,
  Landmark, CreditCard
} from "lucide-react";

interface FinanceiroPagarProps {
  onEditClick: (t: FinanceiroTransacao) => void;
  onNewClick: () => void;
  refreshTrigger: number;
  onRefreshNeeded: () => void;
}

const CATEGORIAS_DESPESA = [
  "Fornecedores",
  "Aluguel",
  "Energia",
  "Internet",
  "Marketing",
  "Funcionários",
  "Impostos",
  "Investimentos",
  "Outros"
];

export function FinanceiroPagar({
  onEditClick,
  onNewClick,
  refreshTrigger,
  onRefreshNeeded,
}: FinanceiroPagarProps) {
  const [loading, setLoading] = React.useState(true);
  const [transacoes, setTransacoes] = React.useState<FinanceiroTransacao[]>([]);
  const [total, setTotal] = React.useState(0);
  const [showFiltersDrawer, setShowFiltersDrawer] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Filtros
  const [filters, setFilters] = React.useState({
    search: "",
    categoria: "todas",
    status: "todos" as "todos" | "pendente" | "pago" | "atrasado" | "cancelado",
    dataInicio: "",
    dataFim: "",
    page: 1,
    perPage: 15,
  });

  React.useEffect(() => {
    loadDespesas();
  }, [filters, refreshTrigger]);

  const loadDespesas = async () => {
    setLoading(true);
    try {
      const res = await listFinanceiro({
        ...filters,
        tipo: "despesa",
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        setTransacoes(res.data || []);
        setTotal(res.count || 0);
      }
    } catch {
      toast.error("Erro ao carregar contas a pagar.");
    } finally {
      setLoading(false);
    }
  };

  const handleBaixarTitulo = async (id: string) => {
    const confirm = window.confirm("Confirmar pagamento deste título?");
    if (!confirm) return;

    setActionLoadingId(id);
    try {
      const res = await receberOuPagarTitulo(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Pagamento registrado com sucesso!");
        loadDespesas();
        onRefreshNeeded();
      }
    } catch {
      toast.error("Erro ao registrar pagamento.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelarTitulo = async (id: string) => {
    const confirm = window.confirm("Deseja realmente cancelar este lançamento? O histórico contábil será preservado como cancelado.");
    if (!confirm) return;

    setActionLoadingId(id);
    try {
      const res = await excluirLancamentoLogico(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Lançamento financeiro cancelado.");
        loadDespesas();
        onRefreshNeeded();
      }
    } catch {
      toast.error("Erro ao cancelar lançamento.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(total / filters.perPage);

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Header & Controls */}
      <div className="p-4 border-b border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-slate-50/20">
        
        {/* Search */}
        <div className="flex-1 max-w-md relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria ou origem..."
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full text-xs bg-slate-100/80 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
            className={cn("px-4 py-2.5 text-xs font-bold rounded-xl border flex items-center gap-2 cursor-pointer transition-all", {
              "bg-primary text-white border-primary shadow-sm": showFiltersDrawer,
              "bg-white border-border text-slate-600 hover:bg-slate-50": !showFiltersDrawer,
            })}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </button>
          
          <button
            onClick={onNewClick}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/10 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Despesa Manual
          </button>
        </div>

      </div>

      {/* Filter Drawer */}
      {showFiltersDrawer && (
        <div className="p-4 border-b border-border bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top duration-200">
          
          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value as any, page: 1 }))}
              className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
            >
              <option value="todos">Todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Categoria</label>
            <select
              value={filters.categoria}
              onChange={e => setFilters(prev => ({ ...prev, categoria: e.target.value, page: 1 }))}
              className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
            >
              <option value="todas">Todas</option>
              {CATEGORIAS_DESPESA.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Data Inicio */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">De (Vencimento)</label>
            <input
              type="date"
              value={filters.dataInicio}
              onChange={e => setFilters(prev => ({ ...prev, dataInicio: e.target.value, page: 1 }))}
              className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Até (Vencimento)</label>
            <input
              type="date"
              value={filters.dataFim}
              onChange={e => setFilters(prev => ({ ...prev, dataFim: e.target.value, page: 1 }))}
              className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
            />
          </div>

        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
              <th className="text-left px-4 py-3 font-bold">Descrição</th>
              <th className="text-left px-4 py-3 font-bold">Fornecedor</th>
              <th className="text-left px-4 py-3 font-bold w-24">Vencimento</th>
              <th className="text-left px-4 py-3 font-bold w-24">Pagamento</th>
              <th className="text-left px-4 py-3 font-bold w-28">Categoria</th>
              <th className="text-center px-4 py-3 font-bold w-20">Status</th>
              <th className="text-center px-4 py-3 font-bold w-20">Origem</th>
              <th className="text-right px-4 py-3 font-bold w-28">Valor</th>
              <th className="text-center px-4 py-3 font-bold w-28">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border/40 animate-pulse">
                  <td colSpan={9} className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                </tr>
              ))
            ) : transacoes.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-muted-foreground">
                  <XCircle className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="font-bold">Nenhum título a pagar encontrado</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">Sem compromissos de pagamentos pendentes no filtro atual.</p>
                </td>
              </tr>
            ) : (
              transacoes.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-slate-50/30 transition-colors">
                  
                  {/* Descrição + Parcela */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-foreground text-xs leading-normal">{t.descricao}</span>
                      {t.total_parcelas > 1 && (
                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded">
                          {t.numero_parcela}/{t.total_parcelas}
                        </span>
                      )}
                    </div>
                    {t.observacao && <p className="text-[9px] text-muted-foreground/85 mt-0.5 truncate max-w-xs">{t.observacao}</p>}
                  </td>

                  {/* Fornecedor */}
                  <td className="px-4 py-3.5 text-slate-700 font-medium">
                    {t.fornecedor_nome || "-"}
                  </td>

                  {/* Vencimento */}
                  <td className="px-4 py-3.5 text-muted-foreground font-semibold">
                    {new Date(t.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </td>

                  {/* Pagamento */}
                  <td className="px-4 py-3.5 text-slate-600 font-medium">
                    {t.data_pagamento ? new Date(t.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                  </td>

                  {/* Categoria Badge */}
                  <td className="px-4 py-3.5">
                    <span className="text-[9px] font-black text-slate-600 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-full">
                      {t.categoria}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn("text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border", {
                      "bg-emerald-50 text-emerald-600 border-emerald-200": t.status === "pago",
                      "bg-amber-50 text-amber-600 border-amber-200 animate-pulse": t.status === "pendente",
                      "bg-rose-50 text-rose-600 border-rose-200": t.status === "atrasado",
                      "bg-slate-50 text-slate-400 border-slate-200": t.status === "cancelado",
                    })}>
                      {t.status === "pago" ? "Pago" : 
                       t.status === "pendente" ? "Pendente" : 
                       t.status === "atrasado" ? "Atrasado" : "Cancelado"}
                    </span>
                  </td>

                  {/* Origem */}
                  <td className="px-4 py-3.5 text-center font-bold text-[9px] text-slate-500 uppercase tracking-wide">
                    {t.origem}
                  </td>

                  {/* Valor */}
                  <td className="px-4 py-3.5 text-right font-black text-rose-600 text-xs">
                    {formatBRL(t.valor)}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      
                      {/* Confirmar Pagamento */}
                      {t.status !== "pago" && t.status !== "cancelado" && (
                        <button
                          onClick={() => handleBaixarTitulo(t.id)}
                          disabled={actionLoadingId === t.id}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Confirmar Pagamento"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Editar (Apenas lançamentos manuais não pagos/cancelados) */}
                      {t.origem === "manual" && t.status !== "pago" && t.status !== "cancelado" && (
                        <button
                          onClick={() => onEditClick(t)}
                          disabled={actionLoadingId === t.id}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Cancelar / Excluir */}
                      {t.status !== "cancelado" && (
                        <button
                          onClick={() => handleCancelarTitulo(t.id)}
                          disabled={actionLoadingId === t.id}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar Lançamento"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between bg-slate-50/10 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground font-bold">{total} contas a pagar no total</p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="p-1.5 border border-border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700">
              {filters.page} / {totalPages}
            </span>
            <button
              disabled={filters.page === totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="p-1.5 border border-border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
