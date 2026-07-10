'use client';

import * as React from 'react';
import type {
  EstoqueKPIs,
  EstoqueAlerta,
  Movimentacao,
  ProdutoGiro,
  ProdutoParado,
  ProdutoValorEstoque,
  MovimentacaoChartData,
} from '@/lib/types/estoque';
import { EstoqueKPIs as EstoqueKPIsComponent } from './estoque-kpis';
import { EstoqueAlertas } from './estoque-alertas';
import { EstoqueMovimentacoes } from './estoque-movimentacoes';
import { EstoqueGiro } from './estoque-giro';
import { EstoqueParados } from './estoque-parados';
import { EstoqueValor } from './estoque-valor';
import { EstoqueGraficos } from './estoque-graficos';
import { AjusteEstoqueDialog } from './ajuste-estoque-dialog';
import {
  LayoutDashboard, Bell, Activity, TrendingUp,
  Clock, DollarSign, BarChart3, Plus
} from 'lucide-react';

interface EstoquePageClientProps {
  kpis: EstoqueKPIs;
  alertas: EstoqueAlerta[];
  movimentacoes: Movimentacao[];
  movimentacoesCount: number;
  giro: ProdutoGiro[];
  parados: ProdutoParado[];
  valorEstoque: ProdutoValorEstoque[];
  chartData: MovimentacaoChartData[];
}

type TabId =
  | 'overview'
  | 'alertas'
  | 'movimentacoes'
  | 'giro'
  | 'parados'
  | 'valor'
  | 'graficos';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export function EstoquePageClient({
  kpis,
  alertas,
  movimentacoes,
  movimentacoesCount,
  giro,
  parados,
  valorEstoque,
  chartData,
}: EstoquePageClientProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [ajusteOpen, setAjusteOpen] = React.useState(false);
  const [ajusteProduto, setAjusteProduto] = React.useState<{
    id: string; nome: string; sku: string | null;
    estoque_atual: number; estoque_minimo: number; unidade: string;
  } | null>(null);

  const highAlerts = alertas.filter(a => a.prioridade === 'alta').length;

  const tabs: Tab[] = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'alertas', label: 'Alertas', icon: Bell, badge: highAlerts || undefined },
    { id: 'movimentacoes', label: 'Movimentações', icon: Activity },
    { id: 'giro', label: 'Giro', icon: TrendingUp },
    { id: 'parados', label: 'Parados', icon: Clock, badge: kpis.produtosParados30d || undefined },
    { id: 'valor', label: 'Valor', icon: DollarSign },
    { id: 'graficos', label: 'Gráficos', icon: BarChart3 },
  ];

  const handleAjusteFromAlerta = (alerta: EstoqueAlerta) => {
    setAjusteProduto({
      id: alerta.produtoId,
      nome: alerta.produtoNome,
      sku: alerta.produtoSku,
      estoque_atual: alerta.estoqueAtual,
      estoque_minimo: alerta.estoqueMinimo,
      unidade: alerta.unidade,
    });
    setAjusteOpen(true);
  };

  const handleAjusteSuccess = () => {
    // In a real app, refresh data from server
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Estoque Inteligente
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle operacional, alertas em tempo real e inteligência comercial.
          </p>
        </div>
        <button
          onClick={() => {
            setAjusteProduto(null);
            setAjusteOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ajuste Manual</span>
        </button>
      </div>

      {/* Critical alerts banner */}
      {highAlerts > 0 && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/15 transition-colors"
          onClick={() => setActiveTab('alertas')}
        >
          <Bell className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
          <p className="text-sm text-red-400">
            <span className="font-bold">{highAlerts} alerta{highAlerts > 1 ? 's' : ''} crítico{highAlerts > 1 ? 's' : ''}</span>
            {' '}necessitando atenção imediata.
            <span className="underline ml-1">Ver alertas →</span>
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer relative flex-shrink-0 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <EstoqueKPIsComponent kpis={kpis} />
        )}

        {activeTab === 'alertas' && (
          <EstoqueAlertas alertas={alertas} />
        )}

        {activeTab === 'movimentacoes' && (
          <EstoqueMovimentacoes
            initialData={movimentacoes}
            initialCount={movimentacoesCount}
          />
        )}

        {activeTab === 'giro' && (
          <EstoqueGiro produtos={giro} />
        )}

        {activeTab === 'parados' && (
          <EstoqueParados initialData={parados} />
        )}

        {activeTab === 'valor' && (
          <EstoqueValor produtos={valorEstoque} />
        )}

        {activeTab === 'graficos' && (
          <EstoqueGraficos chartData={chartData} />
        )}
      </div>

      {/* Ajuste Dialog */}
      <AjusteEstoqueDialog
        produto={ajusteProduto}
        isOpen={ajusteOpen}
        onClose={() => setAjusteOpen(false)}
        onSuccess={handleAjusteSuccess}
      />
    </div>
  );
}
