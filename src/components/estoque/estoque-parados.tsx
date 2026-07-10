'use client';

import * as React from 'react';
import type { ProdutoParado } from '@/lib/types/estoque';
import { getProdutosParados } from '@/lib/actions/estoque';
import { Clock, Package, AlertCircle } from 'lucide-react';

interface EstoquePaRadosProps {
  initialData: ProdutoParado[];
}

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function formatDate(iso: string | null) {
  if (!iso) return 'Nunca';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso));
}

function DiasChip({ dias }: { dias: number }) {
  const color = dias >= 90 ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : dias >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-slate-400 bg-slate-500/10 border-slate-600/30';
  const label = dias >= 999 ? '∞' : `${dias}d`;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  );
}

export function EstoqueParados({ initialData }: EstoquePaRadosProps) {
  const [data, setData] = React.useState<ProdutoParado[]>(initialData);
  const [diasFiltro, setDiasFiltro] = React.useState<30 | 60 | 90 | 120>(30);
  const [isLoading, setIsLoading] = React.useState(false);

  const load = async (dias: number) => {
    setIsLoading(true);
    try {
      const result = await getProdutosParados(dias);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = (dias: 30 | 60 | 90 | 120) => {
    setDiasFiltro(dias);
    load(dias);
  };

  const valorTotal = data.reduce((acc, p) => acc + p.valorEstoque, 0);

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Parados há mais de:</span>
        {([30, 60, 90, 120] as const).map(dias => (
          <button
            key={dias}
            onClick={() => handleFilter(dias)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              diasFiltro === dias
                ? dias >= 90 ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-transparent text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
            }`}
          >
            {dias} dias
          </button>
        ))}
      </div>

      {/* Summary */}
      {data.length > 0 && (
        <div className="flex flex-wrap gap-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
          <div>
            <div className="text-xs text-slate-500">Produtos parados</div>
            <div className="text-xl font-bold text-slate-100">{data.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Capital imobilizado</div>
            <div className="text-xl font-bold text-amber-400">{formatBRL(valorTotal)}</div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Nenhum produto parado</h3>
          <p className="text-xs text-slate-500 max-w-xs">
            Todos os produtos com estoque tiveram movimentação nos últimos {diasFiltro} dias.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Última Mov.</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Dias</th>
              </tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr key={p.produtoId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100 truncate max-w-[150px]">{p.produtoNome}</div>
                    {p.produtoSku && <div className="text-[10px] text-slate-500">#{p.produtoSku}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">
                    {p.categoria || <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-300">
                    {p.estoqueAtual} <span className="text-slate-600 text-xs font-normal">{p.unidade}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-amber-400 hidden md:table-cell">
                    {formatBRL(p.valorEstoque)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                    {formatDate(p.ultimaMovimentacao)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DiasChip dias={p.diasSemMovimento} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
