'use client';

import * as React from 'react';
import type { MovimentacaoChartData } from '@/lib/types/estoque';
import { BarChart3 } from 'lucide-react';

interface EstoqueGraficosProps {
  chartData: MovimentacaoChartData[];
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const height = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div
      className="w-full rounded-sm transition-all duration-300"
      style={{ height: `${height}%`, backgroundColor: color, minHeight: '4px' }}
      title={`${value}`}
    />
  );
}

export function EstoqueGraficos({ chartData }: EstoqueGraficosProps) {
  const maxEntradas = Math.max(...chartData.map(d => d.entradas), 1);
  const maxSaidas = Math.max(...chartData.map(d => d.saidas + d.vendas), 1);
  const maxAll = Math.max(maxEntradas, maxSaidas, 1);

  const totalEntradas = chartData.reduce((a, d) => a + d.entradas, 0);
  const totalVendas = chartData.reduce((a, d) => a + d.vendas, 0);
  const totalSaidas = chartData.reduce((a, d) => a + d.saidas, 0);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Nenhuma movimentação nos últimos 30 dias</h3>
        <p className="text-xs text-slate-500 max-w-xs">Os gráficos aparecerão assim que houver movimentações no estoque.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend + totals */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-slate-400">Entradas: <span className="font-bold text-slate-200">{totalEntradas}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-xs text-slate-400">Vendas: <span className="font-bold text-slate-200">{totalVendas}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span className="text-xs text-slate-400">Saídas: <span className="font-bold text-slate-200">{totalSaidas}</span></span>
        </div>
        <span className="ml-auto text-xs text-slate-600">Últimos 30 dias</span>
      </div>

      {/* Bar chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Movimentações Diárias
        </h4>
        <div className="flex items-end gap-0.5 h-40 w-full overflow-x-auto">
          {chartData.map((day, i) => (
            <div key={day.data} className="flex-1 min-w-[20px] flex flex-col items-center gap-0.5 h-full group">
              {/* Bars */}
              <div className="flex-1 flex items-end gap-0.5 w-full">
                {/* Entradas */}
                <div className="flex-1 flex flex-col justify-end" title={`Entradas: ${day.entradas}`}>
                  <MiniBar value={day.entradas} max={maxAll} color="#10b981" />
                </div>
                {/* Vendas */}
                <div className="flex-1 flex flex-col justify-end" title={`Vendas: ${day.vendas}`}>
                  <MiniBar value={day.vendas} max={maxAll} color="#ef4444" />
                </div>
                {/* Saídas */}
                {day.saidas > 0 && (
                  <div className="flex-1 flex flex-col justify-end" title={`Saídas: ${day.saidas}`}>
                    <MiniBar value={day.saidas} max={maxAll} color="#f97316" />
                  </div>
                )}
              </div>
              {/* Date label */}
              <div className="text-[8px] text-slate-600 group-hover:text-slate-400 transition-colors whitespace-nowrap rotate-0 hidden sm:block">
                {i % 5 === 0 ? formatDate(day.data) : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top days with most entries */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dias com Mais Entradas</h4>
          <div className="space-y-2">
            {[...chartData]
              .sort((a, b) => b.entradas - a.entradas)
              .slice(0, 5)
              .map(d => (
                <div key={d.data} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{formatDate(d.data)}</span>
                  <div className="flex items-center gap-2 flex-1 mx-3">
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(d.entradas / maxEntradas) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">{d.entradas}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Top days with most sales */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dias com Mais Vendas</h4>
          <div className="space-y-2">
            {[...chartData]
              .sort((a, b) => b.vendas - a.vendas)
              .slice(0, 5)
              .map(d => (
                <div key={d.data} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{formatDate(d.data)}</span>
                  <div className="flex items-center gap-2 flex-1 mx-3">
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${(d.vendas / Math.max(...chartData.map(d2 => d2.vendas), 1)) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-400">{d.vendas}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
