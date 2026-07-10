'use client';

import * as React from 'react';
import type { EstoqueAlerta, AlertaTipo } from '@/lib/types/estoque';
import { getLabelAlertaTipo } from '@/lib/types/estoque';
import {
  AlertCircle, Clock, TrendingDown, Package,
  Award, ShoppingCart, AlertTriangle, Brain
} from 'lucide-react';

interface EstoqueAlertasProps {
  alertas: EstoqueAlerta[];
}

const ALERTA_CONFIG: Record<AlertaTipo, {
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  border: string;
}> = {
  critico: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  proximo_minimo: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  sem_movimento: {
    icon: Clock,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
  excesso: {
    icon: Package,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  campea_vendas: {
    icon: Award,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  reposicao: {
    icon: ShoppingCart,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  perda_detectada: {
    icon: TrendingDown,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
};

const PRIORIDADE_LABEL: Record<string, { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  media: { label: 'Média', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  baixa: { label: 'Baixa', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

function AlertaCard({ alerta }: { alerta: EstoqueAlerta }) {
  const config = ALERTA_CONFIG[alerta.tipo];
  const Icon = config.icon;
  const prio = PRIORIDADE_LABEL[alerta.prioridade];

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.border} ${config.bg} transition-all duration-200 hover:scale-[1.01]`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg} border ${config.border}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
              {getLabelAlertaTipo(alerta.tipo)}
            </span>
            <h4 className="text-sm font-semibold text-slate-100 truncate leading-tight mt-0.5">
              {alerta.produtoNome}
              {alerta.produtoSku && (
                <span className="text-slate-500 font-normal ml-1">#{alerta.produtoSku}</span>
              )}
            </h4>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${prio.color}`}>
            {prio.label}
          </span>
        </div>

        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          🧠 {alerta.mensagem}
        </p>

        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
            Estoque: <span className="text-slate-300 font-semibold">{alerta.estoqueAtual} {alerta.unidade}</span>
          </span>
          {alerta.estoqueMinimo > 0 && (
            <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
              Mínimo: <span className="text-slate-300 font-semibold">{alerta.estoqueMinimo} {alerta.unidade}</span>
            </span>
          )}
          {alerta.quantidadeVendida30d !== undefined && alerta.quantidadeVendida30d > 0 && (
            <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
              Vendas 30d: <span className="text-slate-300 font-semibold">{alerta.quantidadeVendida30d} {alerta.unidade}</span>
            </span>
          )}
          {alerta.previsaoDias !== undefined && alerta.previsaoDias !== null && (
            <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded">
              Previsão: <span className={`font-semibold ${alerta.previsaoDias <= 3 ? 'text-red-400' : alerta.previsaoDias <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                ~{alerta.previsaoDias} dias
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function EstoqueAlertas({ alertas }: EstoqueAlertasProps) {
  const [filter, setFilter] = React.useState<'todos' | 'alta' | 'media' | 'baixa'>('todos');

  const filtered = filter === 'todos' ? alertas : alertas.filter(a => a.prioridade === filter);

  const countByPrio = {
    alta: alertas.filter(a => a.prioridade === 'alta').length,
    media: alertas.filter(a => a.prioridade === 'media').length,
    baixa: alertas.filter(a => a.prioridade === 'baixa').length,
  };

  if (alertas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Brain className="w-7 h-7 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">Nenhum alerta no momento</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Seu estoque está saudável. A IA irá te notificar quando detectar situações que precisam de atenção.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Central de Alertas
            <span className="ml-2 text-xs font-normal text-slate-500">
              {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
            </span>
          </h3>
        </div>

        {/* Priority filters */}
        <div className="flex gap-1">
          {(['todos', 'alta', 'media', 'baixa'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                filter === f
                  ? f === 'alta' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : f === 'media' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : f === 'baixa' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-slate-700 text-slate-200 border-slate-600'
                  : 'bg-transparent text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
              }`}
            >
              {f === 'todos' ? `Todos (${alertas.length})` : f === 'alta' ? `Alta (${countByPrio.alta})` : f === 'media' ? `Média (${countByPrio.media})` : `Baixa (${countByPrio.baixa})`}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((alerta, idx) => (
          <AlertaCard key={`${alerta.produtoId}-${alerta.tipo}-${idx}`} alerta={alerta} />
        ))}
      </div>
    </div>
  );
}
