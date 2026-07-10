'use client';

import * as React from 'react';
import type { CRMResumo, ClienteClassificado, ClienteRisco } from '@/lib/types/clientes';
import { formatBRL, getBgClassificacao, getLabelClassificacao } from '@/lib/types/clientes';
import { getCRMResumo } from '@/lib/actions/clientes';
import { Crown, Sparkles, AlertTriangle, ArrowRight, UserPlus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

interface ClientesCRMProps {
  onViewCliente: (cliente: ClienteClassificado) => void;
  onRefresh: () => void;
}

export const ClientesCRM: React.FC<ClientesCRMProps> = ({ onViewCliente, onRefresh }) => {
  const [loading, setLoading] = React.useState(true);
  const [crmData, setCrmData] = React.useState<CRMResumo | null>(null);

  React.useEffect(() => {
    loadCRMData();
  }, []);

  const loadCRMData = async () => {
    setLoading(true);
    try {
      const data = await getCRMResumo();
      setCrmData(data);
    } catch (err) {
      toast.error('Erro ao carregar resumo do CRM');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !crmData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        <div className="h-64 bg-muted animate-pulse rounded-xl animate-delay-75" />
        <div className="h-64 bg-muted animate-pulse rounded-xl animate-delay-150" />
        <div className="h-64 bg-muted animate-pulse rounded-xl animate-delay-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          👑 Painel de Relacionamento & RFM
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Listas segmentadas baseadas em comportamento de consumo e ciclo de vida dos clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Campeões de Compras & Maior Ticket */}
        <div className="space-y-6">
          {/* VIPs / Mais Compram */}
          <div className="border border-border bg-card rounded-xl p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <Crown size={14} /> Campeões de Compras
            </h4>
            <div className="divide-y divide-border/60">
              {crmData.maisCompram.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">Sem dados suficientes.</p>
              ) : (
                crmData.maisCompram.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-2.5 hover:bg-muted/20 px-1.5 rounded cursor-pointer transition-colors"
                    onClick={() => onViewCliente(c)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{c.nome}</span>
                      <span className="text-[10px] text-muted-foreground">Média: {formatBRL(c.ticketMedio)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground">{c.total_compras} compras</span>
                      <span className="block text-[10px] text-emerald-500">{formatBRL(c.total_gasto)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Maior Ticket Médio */}
          <div className="border border-border bg-card rounded-xl p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <TrendingUp size={14} /> Maior Ticket Médio
            </h4>
            <div className="divide-y divide-border/60">
              {crmData.maiorTicket.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">Sem dados suficientes.</p>
              ) : (
                crmData.maiorTicket.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-2.5 hover:bg-muted/20 px-1.5 rounded cursor-pointer transition-colors"
                    onClick={() => onViewCliente(c)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{c.nome}</span>
                      <span className="text-[10px] text-muted-foreground">{c.total_compras} compras realizadas</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-primary">{formatBRL(c.ticketMedio)}</span>
                      <span className="block text-[10px] text-muted-foreground">Gasto: {formatBRL(c.total_gasto)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Risco & Churn */}
        <div className="space-y-6">
          {/* Clientes em Risco */}
          <div className="border border-border bg-card rounded-xl p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Em Risco de Inatividade
            </h4>
            <div className="divide-y divide-border/60">
              {crmData.emRisco.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">Nenhum cliente em risco no momento!</p>
              ) : (
                crmData.emRisco.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-2.5 hover:bg-muted/20 px-1.5 rounded cursor-pointer transition-colors"
                    onClick={() => onViewCliente(c as unknown as ClienteClassificado)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{c.nome}</span>
                      <span className="text-[10px] text-red-400/80">Risco: {c.nivel}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground">Há {c.diasSemCompra} dias</span>
                      <span className="block text-[10px] text-muted-foreground">Total: {formatBRL(c.totalGasto)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sem compras recentes (Inativos 30d+) */}
          <div className="border border-border bg-card rounded-xl p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              ⏱️ Ausentes (+30 dias)
            </h4>
            <div className="divide-y divide-border/60">
              {crmData.semComprasRecentes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">Sem clientes ausentes recentemente.</p>
              ) : (
                crmData.semComprasRecentes.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-2.5 hover:bg-muted/20 px-1.5 rounded cursor-pointer transition-colors"
                    onClick={() => onViewCliente(c)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{c.nome}</span>
                      <span className="text-[10px] text-muted-foreground">Cadastro: {new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground">Há {c.diasDesdeUltimaCompra} dias</span>
                      <span className="block text-[10px] text-muted-foreground">Compras: {c.total_compras}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Novos Cadastros & Crescimento */}
        <div className="space-y-6">
          {/* Últimos Cadastrados */}
          <div className="border border-border bg-card rounded-xl p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <UserPlus size={14} /> Recém Cadastrados
            </h4>
            <div className="divide-y divide-border/60">
              {crmData.ultimosCadastrados.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">Nenhum cadastro recente.</p>
              ) : (
                crmData.ultimosCadastrados.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-2.5 hover:bg-muted/20 px-1.5 rounded cursor-pointer transition-colors"
                    onClick={() => onViewCliente(c)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{c.nome}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground">
                        {c.total_compras === 0 ? 'Sem compras' : `${c.total_compras} compras`}
                      </span>
                      <span className="block text-[10px] text-emerald-500">{formatBRL(c.total_gasto)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick CRM Insights Card */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <h4 className="text-sm font-bold text-primary">Dica de Sucesso</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clientes VIPs e Frequentes representam até 80% do faturamento da sua loja. Fique de olho na aba de
              <strong> Prevenção de Churn </strong> e use os modelos automáticos do WhatsApp para reatar relacionamentos
              antes que eles migrem para a concorrência!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
