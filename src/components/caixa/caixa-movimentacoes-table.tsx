'use client';

import * as React from 'react';
import type { MovimentacaoCaixa } from '@/lib/types/caixa';
import { formatBRL } from '@/lib/types/caixa';
import { ArrowUpRight, ArrowDownLeft, ShoppingBag, XCircle, Clock, User } from 'lucide-react';

interface CaixaMovimentacoesTableProps {
  movimentacoes: MovimentacaoCaixa[];
  loading: boolean;
}

export const CaixaMovimentacoesTable: React.FC<CaixaMovimentacoesTableProps> = ({
  movimentacoes,
  loading,
}) => {
  if (loading) {
    return (
      <div className="space-y-3 py-6">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/80 rounded-xl bg-card/40">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Sem movimentações</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-normal">
          Ainda não há registros de vendas, sangrias ou suprimentos nesta sessão de caixa.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border/60 rounded-xl bg-card shadow-sm">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-border/80 bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <th className="py-3 px-4 w-[100px]">Horário</th>
            <th className="py-3 px-4 w-[130px]">Tipo</th>
            <th className="py-3 px-4 w-[120px]">Valor</th>
            <th className="py-3 px-4">Motivo / Justificativa</th>
            <th className="py-3 px-4 w-[150px]">Operador</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {movimentacoes.map((item) => {
            const date = new Date(item.created_at);
            const timeStr = date.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            // Layout settings by type
            let badgeColor = '';
            let typeLabel = '';
            let Icon = Clock;
            let valColor = '';
            let valSign = '';

            switch (item.tipo) {
              case 'sangria':
                badgeColor = 'bg-destructive/10 text-destructive border border-destructive/25';
                typeLabel = 'Sangria (Saída)';
                Icon = ArrowDownLeft;
                valColor = 'text-destructive font-bold';
                valSign = '-';
                break;
              case 'suprimento':
                badgeColor = 'bg-blue-500/10 text-blue-600 border border-blue-500/25';
                typeLabel = 'Suprimento (Aporte)';
                Icon = ArrowUpRight;
                valColor = 'text-blue-600 font-bold';
                valSign = '+';
                break;
              case 'venda':
                badgeColor = 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25';
                typeLabel = 'Venda';
                Icon = ShoppingBag;
                valColor = 'text-emerald-600 font-extrabold';
                valSign = '+';
                break;
              case 'cancelada':
                badgeColor = 'bg-slate-500/10 text-slate-500 border border-slate-500/25';
                typeLabel = 'Venda Cancelada';
                Icon = XCircle;
                valColor = 'text-slate-500 line-through';
                valSign = '-';
                break;
            }

            return (
              <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                <td className="py-3.5 px-4 text-muted-foreground font-mono">
                  {timeStr}
                </td>
                
                <td className="py-3.5 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                    <Icon className="w-3 h-3 flex-shrink-0" />
                    {typeLabel}
                  </span>
                </td>
                
                <td className={`py-3.5 px-4 font-mono ${valColor}`}>
                  {valSign} {formatBRL(item.valor)}
                </td>
                
                <td className="py-3.5 px-4 text-muted-foreground font-medium leading-normal max-w-sm truncate" title={item.motivo || ''}>
                  {item.motivo || '—'}
                </td>
                
                <td className="py-3.5 px-4 text-foreground/80 font-semibold flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  <span className="truncate">{item.usuario_nome}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
