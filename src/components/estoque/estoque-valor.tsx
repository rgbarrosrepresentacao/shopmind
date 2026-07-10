'use client';

import * as React from 'react';
import type { ProdutoValorEstoque } from '@/lib/types/estoque';
import { DollarSign, TrendingUp, Package, ChevronDown, ChevronUp } from 'lucide-react';

interface EstoqueValorProps {
  produtos: ProdutoValorEstoque[];
}

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function MargemBar({ margem }: { margem: number }) {
  const color = margem >= 30 ? '#10b981' : margem >= 15 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, margem)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold w-8 text-right" style={{ color }}>
        {margem.toFixed(0)}%
      </span>
    </div>
  );
}

export function EstoqueValor({ produtos }: EstoqueValorProps) {
  const [sort, setSort] = React.useState<'custo' | 'venda' | 'lucro' | 'margem'>('custo');
  const [showAll, setShowAll] = React.useState(false);

  const sorted = [...produtos].sort((a, b) => {
    if (sort === 'custo') return b.valorCustoTotal - a.valorCustoTotal;
    if (sort === 'venda') return b.valorVendaTotal - a.valorVendaTotal;
    if (sort === 'lucro') return b.lucroPotencial - a.lucroPotencial;
    return b.margemPercent - a.margemPercent;
  });

  const displayed = showAll ? sorted : sorted.slice(0, 25);

  // Totals
  const totalCusto = produtos.reduce((a, p) => a + p.valorCustoTotal, 0);
  const totalVenda = produtos.reduce((a, p) => a + p.valorVendaTotal, 0);
  const totalLucro = totalVenda - totalCusto;
  const margemMedia = totalVenda > 0 ? (totalLucro / totalVenda) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-2">Capital Investido</div>
          <div className="text-xl font-bold text-slate-100">{formatBRL(totalCusto)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Custo total em estoque</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">Valor de Mercado</div>
          <div className="text-xl font-bold text-slate-100">{formatBRL(totalVenda)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Preço de venda total</div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">Lucro Potencial</div>
          <div className="text-xl font-bold text-emerald-400">{formatBRL(totalLucro)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Se vender tudo</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-2">Margem Média</div>
          <div className="text-xl font-bold text-amber-400">{margemMedia.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rentabilidade do estoque</div>
        </div>
      </div>

      {/* Sort bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Ordenar por:</span>
        {(['custo', 'venda', 'lucro', 'margem'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              sort === s
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'bg-transparent text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
            }`}
          >
            {s === 'custo' ? 'Valor Custo' : s === 'venda' ? 'Valor Venda' : s === 'lucro' ? 'Lucro' : 'Margem'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-600">{produtos.length} produtos</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Qtd</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Custo Total</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Venda Total</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Lucro</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Margem</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                    Nenhum produto com estoque
                  </td>
                </tr>
              ) : (
                displayed.map(p => (
                  <tr key={p.produtoId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100 truncate max-w-[160px]">{p.produtoNome}</div>
                      <div className="text-[10px] text-slate-500">{p.categoria || 'Sem categoria'}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-400 hidden sm:table-cell">
                      {p.estoqueAtual} {p.unidade}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-purple-400">
                      {formatBRL(p.valorCustoTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-blue-400">
                      {formatBRL(p.valorVendaTotal)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400 hidden md:table-cell">
                      {formatBRL(p.lucroPotencial)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <MargemBar margem={p.margemPercent} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sorted.length > 25 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer"
        >
          {showAll ? <><ChevronUp size={14} /> Mostrar menos</> : <><ChevronDown size={14} /> Ver todos ({sorted.length})</>}
        </button>
      )}
    </div>
  );
}
