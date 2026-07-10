'use client';

import * as React from 'react';
import type { InsightCliente } from '@/lib/types/clientes';
import { getClienteInsights } from '@/lib/actions/clientes';
import { Sparkles, MessageCircle, Eye, RefreshCw, BadgeAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';

interface ClientesInsightsProps {
  onViewCliente: (id: string) => void;
}

export const ClientesInsights: React.FC<ClientesInsightsProps> = ({ onViewCliente }) => {
  const [loading, setLoading] = React.useState(true);
  const [insights, setInsights] = React.useState<InsightCliente[]>([]);

  React.useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await getClienteInsights();
      setInsights(data);
    } catch (err) {
      toast.error('Erro ao carregar insights de clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = (c: InsightCliente) => {
    toast.info(`Iniciando contato com ${c.clienteNome}...`);
    // Contact trigger (goes to wa.me if we have phone in some other way, but we can also view client profile)
    onViewCliente(c.clienteId);
  };

  const getPriorityStyle = (priority: InsightCliente['prioridade']) => {
    switch (priority) {
      case 'alta':
        return 'border-red-500/25 bg-red-500/5 text-red-400';
      case 'media':
        return 'border-amber-500/25 bg-amber-500/5 text-amber-400';
      case 'baixa':
        return 'border-blue-500/25 bg-blue-500/5 text-blue-400';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
        <div className="h-28 bg-muted animate-pulse rounded-xl" />
        <div className="h-28 bg-muted animate-pulse rounded-xl" />
        <div className="h-28 bg-muted animate-pulse rounded-xl" />
        <div className="h-28 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-500 animate-pulse" /> Sugestões Inteligentes CRM
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oportunidades de venda e alertas automáticos gerados com base em histórico de compras.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadInsights}>
          <RefreshCw size={14} className="mr-1.5" /> Atualizar Insights
        </Button>
      </div>

      {insights.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card text-muted-foreground">
          <span className="text-3xl">✨</span>
          <p className="font-semibold text-foreground mt-1">Nenhuma sugestão no momento</p>
          <p className="text-xs">
            Continue vendendo para que o sistema identifique padrões de comportamento dos clientes!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl border p-4 flex flex-col justify-between gap-4 transition-all hover:shadow-md bg-card/65 ${getPriorityStyle(
                ins.prioridade
              )}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{ins.icone}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-foreground text-sm">{ins.titulo}</h4>
                    <Badge
                      className={
                        ins.prioridade === 'alta'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : ins.prioridade === 'media'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }
                    >
                      Prioridade {ins.prioridade}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {ins.mensagem}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs hover:bg-muted/80 text-muted-foreground"
                  onClick={() => onViewCliente(ins.clienteId)}
                >
                  <Eye size={12} className="mr-1" /> Perfil
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                  onClick={() => handleContact(ins)}
                >
                  <MessageCircle size={12} className="mr-1" /> Ação CRM
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
