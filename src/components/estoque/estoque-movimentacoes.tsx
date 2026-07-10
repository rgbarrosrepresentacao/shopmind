'use client';

import * as React from 'react';
import type { Movimentacao, MovimentacaoFilter, TipoMovimentacao } from '@/lib/types/estoque';
import { getLabelTipoMovimentacao, getCorTipoMovimentacao } from '@/lib/types/estoque';
import { listMovimentacoes } from '@/lib/actions/estoque';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Search, Filter, X } from 'lucide-react';

interface EstoqueMovimentacoesProps {
  initialData: Movimentacao[];
  initialCount: number;
}

const TIPOS_MOV: { value: TipoMovimentacao | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos os Tipos' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'saida', label: 'Saída' },
  { value: 'venda', label: 'Venda' },
  { value: 'compra', label: 'Compra' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'perda', label: 'Perda' },
  { value: 'troca', label: 'Troca' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'inventario', label: 'Inventário' },
];

const ENTRADAS = new Set(['entrada', 'compra', 'devolucao', 'estoque_inicial']);

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function EstoqueMovimentacoes({ initialData, initialCount }: EstoqueMovimentacoesProps) {
  const [movs, setMovs] = React.useState<Movimentacao[]>(initialData);
  const [totalCount, setTotalCount] = React.useState(initialCount);
  const [isLoading, setIsLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [tipo, setTipo] = React.useState<TipoMovimentacao | 'todos'>('todos');
  const [page, setPage] = React.useState(1);
  const perPage = 20;

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: MovimentacaoFilter = { search, tipo, page, perPage };
      const result = await listMovimentacoes(filters);
      if (!result.error) {
        setMovs(result.data);
        setTotalCount(result.count);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, tipo, page]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar produto ou motivo..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>

        <select
          value={tipo}
          onChange={e => { setTipo(e.target.value as any); setPage(1); }}
          className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 cursor-pointer"
        >
          {TIPOS_MOV.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <button
          onClick={load}
          className="p-2 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Count info */}
      <div className="text-xs text-slate-500">
        {totalCount} movimentação{totalCount !== 1 ? 'ões' : ''} encontrada{totalCount !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Motivo</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-800 rounded animate-pulse w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : movs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                    Nenhuma movimentação encontrada
                  </td>
                </tr>
              ) : (
                movs.map(mov => {
                  const isEntrada = ENTRADAS.has(mov.tipo);
                  const cor = getCorTipoMovimentacao(mov.tipo);
                  return (
                    <tr key={mov.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(mov.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100 text-sm truncate max-w-[160px]">
                          {mov.produto?.nome || '—'}
                        </div>
                        {mov.produto?.sku && (
                          <div className="text-[10px] text-slate-500">#{mov.produto.sku}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md"
                          style={{ backgroundColor: `${cor}20`, color: cor, border: `1px solid ${cor}30` }}>
                          {isEntrada
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />}
                          {getLabelTipoMovimentacao(mov.tipo)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-sm ${isEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isEntrada ? '+' : '-'}{mov.quantidade} {mov.produto?.unidade || ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell max-w-[150px] truncate">
                        {mov.motivo || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                        {mov.usuario?.nome || 'Sistema'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
