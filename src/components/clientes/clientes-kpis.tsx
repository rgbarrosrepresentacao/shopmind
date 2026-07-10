'use client';

import * as React from 'react';
import type { ClienteKPIs } from '@/lib/types/clientes';
import { formatBRL } from '@/lib/types/clientes';
import {
  Users, UserCheck, UserPlus, UserX, DollarSign,
  ShoppingCart, Crown, AlertTriangle, Cake, TrendingUp, Ghost
} from 'lucide-react';

interface ClientesKPIsProps {
  kpis: ClienteKPIs;
}

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
  bgClass: string;
  subtitle?: string;
}

function KPICard({ label, value, icon: Icon, color, bgClass, subtitle }: KPICardProps) {
  return (
    <div className={`relative p-4 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.02] ${bgClass}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`text-xl font-black ${color}`}>{value}</p>
          {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-xl ${bgClass}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
    </div>
  );
}

export function ClientesKPIs({ kpis }: ClientesKPIsProps) {
  const cards: KPICardProps[] = [
    {
      label: 'Total de Clientes',
      value: kpis.totalClientes,
      icon: Users,
      color: 'text-blue-400',
      bgClass: 'bg-blue-500/5 border-blue-500/20',
    },
    {
      label: 'Clientes Ativos',
      value: kpis.clientesAtivos,
      icon: UserCheck,
      color: 'text-emerald-400',
      bgClass: 'bg-emerald-500/5 border-emerald-500/20',
      subtitle: kpis.totalClientes > 0 ? `${((kpis.clientesAtivos / kpis.totalClientes) * 100).toFixed(0)}% da base` : undefined,
    },
    {
      label: 'Clientes Novos',
      value: kpis.clientesNovos30d,
      icon: UserPlus,
      color: 'text-sky-400',
      bgClass: 'bg-sky-500/5 border-sky-500/20',
      subtitle: 'Últimos 30 dias',
    },
    {
      label: 'Clientes VIP',
      value: kpis.clientesVIP,
      icon: Crown,
      color: 'text-amber-400',
      bgClass: 'bg-amber-500/5 border-amber-500/20',
    },
    {
      label: 'Ticket Médio',
      value: formatBRL(kpis.ticketMedioGeral),
      icon: ShoppingCart,
      color: 'text-violet-400',
      bgClass: 'bg-violet-500/5 border-violet-500/20',
    },
    {
      label: 'Total Comprado',
      value: formatBRL(kpis.valorTotalComprado),
      icon: DollarSign,
      color: 'text-emerald-400',
      bgClass: 'bg-emerald-500/5 border-emerald-500/20',
    },
    {
      label: 'Clientes Frequentes',
      value: kpis.clientesFrequentes,
      icon: TrendingUp,
      color: 'text-violet-400',
      bgClass: 'bg-violet-500/5 border-violet-500/20',
    },
    {
      label: 'Em Risco',
      value: kpis.clientesEmRisco,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgClass: 'bg-red-500/5 border-red-500/20',
      subtitle: kpis.clientesPerdidos > 0 ? `+ ${kpis.clientesPerdidos} perdidos` : undefined,
    },
    {
      label: 'Aniversariantes',
      value: kpis.aniversariantesMes,
      icon: Cake,
      color: 'text-pink-400',
      bgClass: 'bg-pink-500/5 border-pink-500/20',
      subtitle: 'Este mês',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {cards.map(card => (
        <KPICard key={card.label} {...card} />
      ))}
    </div>
  );
}
