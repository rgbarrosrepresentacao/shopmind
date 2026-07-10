'use client';

import * as React from 'react';
import type { ProdutoGiro } from '@/lib/types/estoque';
import { getLabelGiro, getCorGiro } from '@/lib/types/estoque';
import { TrendingUp, TrendingDown, Minus, Archive, ChevronDown, ChevronUp } from 'lucide-react';

interface EstoqueGiroProps {
  produtos: ProdutoGiro[];
}

const GIRO_ICONS = {
  alto: TrendingUp,
  medio: TrendingUp,
  baixo: TrendingDown,
  sem_giro: Archive,
};

function GiroBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: pct > 66 ? '#10b981' : pct > 33 ? '#f59e0b' : '#ef4444' }}
      />
    </div>
  );
}

export function EstoqueGiro({ produtos }: EstoqueGiroProps) {
  const [showAll, setShowAll] = React.useState(false);
  const [filter, setFilter] = React.useState<'todos' | 'alto' | 'medio' | 'baixo' | 'sem_giro'>('todos');
  const [sort, setSort] = React.useState<'giro' | 'vendas' | 'estoque'>('vendas');

  const filtered = produtos.filter(p => filter === 'todos' || p.classificacao === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'giro') return b.giroMensal - a.giroMensal;
    if (sort === 'vendas') return b.totalVendido30d - a.totalVendido30d;
    return b.estoqueAtual - a.estoqueAtual;
  });

  const displayed = showAll ? sorted : sorted.slice(0, 20);
  const maxVendas = Math.max(...sorted.map(p => p.totalVendido30d), 1);

  const counts = {
    alto: produtos.filter(p => p.classificacao === 'alto').length,
    medio: produtos.filter(p => p.classificacao === 'medio').length,
    baixo: produtos.filter(p => p.classificacao === 'baixo').length,
    sem_giro: produtos.filter(p => p.classificacao === 'sem_giro').length,
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['alto', 'medio', 'baixo', 'sem_giro'] as const).map(cls => {
          const cor = getCorGiro(cls);
          const Icon = GIRO_ICONS[cls];
          return (
            <button
              key={cls}
              onClick={() => setFilter(filter === cls ? 'todos' : cls)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer hover:scale-[1.02] ${
                filter === cls ? 'ring-1 ring-offset-1 ring-offset-slate-900' : ''
              }`}
              style={{
                backgroundColor: `${cor}10`,
                borderColor: `${cor}30`,
                ...(filter === cls ? { ringColor: cor } : {}),
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: cor }} />
                <span className="text-xs font-bold" style={{ color: cor }}>{getLabelGiro(cls)}</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">{counts[cls]}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">produtos</div>
            </button>
          );
        })}
      </div>

      {/* Sort & filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Ordenar por:</span>
        {(['vendas', 'giro', 'estoque'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              sort === s
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'bg-transparent text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
            }`}
          >
            {s === 'vendas' ? 'Vendas 30d' : s === 'giro' ? 'Giro' : 'Estoque'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-600">
          {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Classificação</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Vend. 30d</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Vend. 90d</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Atividade</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Previsão</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500 text-sm">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              displayed.map(p => {
                const cor = getCorGiro(p.classificacao);
                const Icon = GIRO_ICONS[p.classificacao];
                return (
                  <tr key={p.produtoId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100 truncate max-w-[160px]">{p.produtoNome}</div>
                      {p.produtoSku && <div className="text-[10px] text-slate-500">#{p.produtoSku}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md"
                        style={{ backgroundColor: `${cor}15`, color: cor, border: `1px solid ${cor}25` }}>
                        <Icon className="w-3 h-3" />
                        {getLabelGiro(p.classificacao)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-300 font-semibold">
                      {p.estoqueAtual} <span className="text-slate-600 font-normal text-xs">{p.unidade}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm hidden md:table-cell">
                      <span className={p.totalVendido30d > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                        {p.totalVendido30d} {p.unidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-400 hidden lg:table-cell">
                      {p.totalVendido90d} {p.unidade}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <GiroBar value={p.totalVendido30d} max={maxVendas} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs hidden md:table-cell">
                      {p.previsaoRuptura !== null ? (
                        <span className={`font-semibold ${p.previsaoRuptura <= 7 ? 'text-red-400' : p.previsaoRuptura <= 14 ? 'text-amber-400' : 'text-slate-400'}`}>
                          ~{p.previsaoRuptura}d
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 20 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer"
        >
          {showAll ? <><ChevronUp size={14} /> Mostrar menos</> : <><ChevronDown size={14} /> Ver todos os {sorted.length} produtos</>}
        </button>
      )}
    </div>
  );
}
