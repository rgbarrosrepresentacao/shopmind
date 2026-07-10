'use client';

import * as React from 'react';
import type { EstoqueKPIs } from '@/lib/types/estoque';
import {
  Archive, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Package, RotateCcw, AlertCircle,
  ShoppingCart, Activity, Timer
} from 'lucide-react';

interface EstoqueKPIsProps {
  kpis: EstoqueKPIs;
}

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function KPICard({
  icon: Icon, label, value, color, sub, trend, size = 'normal',
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'normal' | 'large';
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    slate: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };
  const cls = colorMap[color] || colorMap.slate;
  const [iconCls, bgCls] = cls.split(' ');

  return (
    <div className={`relative rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] bg-slate-900/60 ${size === 'large' ? 'sm:col-span-2' : ''}`}
      style={{ borderColor: `rgba(${color === 'green' ? '16,185,129' : color === 'red' ? '239,68,68' : color === 'amber' ? '245,158,11' : color === 'purple' ? '139,92,246' : color === 'blue' ? '59,130,246' : '100,116,139'}, 0.2)` }}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${bgCls}`}>
          <Icon className={`w-4 h-4 ${iconCls}`} />
        </div>
        {trend && (
          <span className={`text-xs font-bold ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'}`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
          </span>
        )}
      </div>
      <div>
        <div className={`font-bold leading-none ${size === 'large' ? 'text-2xl' : 'text-xl'} text-slate-100`}>
          {value}
        </div>
        <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function EstoqueKPIs({ kpis }: EstoqueKPIsProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: Main financials */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KPICard
          icon={Package}
          label="Total de Produtos"
          value={kpis.totalProdutos}
          color="blue"
          sub={`${kpis.itensEmEstoque} com estoque`}
        />
        <KPICard
          icon={DollarSign}
          label="Valor em Custo"
          value={formatBRL(kpis.valorTotalEstoque)}
          color="purple"
          sub="Capital investido"
          size="large"
        />
        <KPICard
          icon={TrendingUp}
          label="Valor de Venda"
          value={formatBRL(kpis.valorTotalVenda)}
          color="green"
          sub="Se vender tudo"
        />
        <KPICard
          icon={Activity}
          label="Lucro Potencial"
          value={formatBRL(kpis.lucroPotencial)}
          color="green"
          sub="Margem em estoque"
          trend="up"
        />
      </div>

      {/* Row 2: Alerts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          icon={AlertCircle}
          label="Sem Estoque"
          value={kpis.semEstoque}
          color={kpis.semEstoque > 0 ? 'red' : 'slate'}
          trend={kpis.semEstoque > 0 ? 'down' : 'neutral'}
        />
        <KPICard
          icon={AlertTriangle}
          label="Estoque Baixo"
          value={kpis.estoqueBaixo}
          color={kpis.estoqueBaixo > 0 ? 'amber' : 'slate'}
          sub="Abaixo do mínimo"
        />
        <KPICard
          icon={ShoppingCart}
          label="Reposição"
          value={kpis.reposicaoNecessaria}
          color={kpis.reposicaoNecessaria > 0 ? 'amber' : 'slate'}
          sub="Precisam recompra"
        />
        <KPICard
          icon={Timer}
          label="Parados 30d"
          value={kpis.produtosParados30d}
          color={kpis.produtosParados30d > 5 ? 'red' : 'amber'}
          sub="Sem movimentação"
        />
        <KPICard
          icon={RotateCcw}
          label="Parados 90d"
          value={kpis.produtosParados90d}
          color={kpis.produtosParados90d > 0 ? 'red' : 'slate'}
          sub="Capital parado"
          trend={kpis.produtosParados90d > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Row 3: Giro */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-4 text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Giro de Estoque — Últimos 30 dias
        </div>
        <KPICard
          icon={TrendingUp}
          label="Alto Giro"
          value={kpis.giroAlto}
          color="green"
          sub="Vendas ≥ estoque"
          trend="up"
        />
        <KPICard
          icon={Activity}
          label="Médio Giro"
          value={kpis.giroMedio}
          color="blue"
          sub="30-100% do estoque"
        />
        <KPICard
          icon={TrendingDown}
          label="Baixo Giro"
          value={kpis.giroBaixo}
          color="amber"
          sub="< 30% do estoque"
          trend="down"
        />
        <KPICard
          icon={Archive}
          label="Sem Giro"
          value={kpis.semGiro}
          color={kpis.semGiro > 0 ? 'red' : 'slate'}
          sub="Sem venda alguma"
          trend={kpis.semGiro > 0 ? 'down' : 'neutral'}
        />
      </div>
    </div>
  );
}
