'use client';

import * as React from 'react';
import type { CaixaIAInsight } from '@/lib/types/caixa';
import { getCaixaIAInsights } from '@/lib/actions/caixa';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Brain, Sparkles, AlertTriangle, AlertCircle, CheckCircle2, Info, ChevronRight } from 'lucide-react';

interface CaixaIAInsightsProps {
  caixaId?: string;
  onActionTrigger?: (action: string) => void;
  refreshKey?: number;
}

export const CaixaIAInsights: React.FC<CaixaIAInsightsProps> = ({
  caixaId,
  onActionTrigger,
  refreshKey = 0,
}) => {
  const [insights, setInsights] = React.useState<CaixaIAInsight[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadInsights();
  }, [caixaId, refreshKey]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const res = await getCaixaIAInsights(caixaId);
      if (res.error) {
        toast.error(`Erro ao carregar insights da IA: ${res.error}`);
      } else {
        setInsights(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/80 rounded-xl bg-card/40">
        <div className="w-12 h-12 rounded-full bg-ia/10 flex items-center justify-center text-ia mb-3 animate-pulse-glow">
          <Brain className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Sem novos insights</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-normal">
          A IA Gerente não detectou desvios ou necessidades de intervenção nesta sessão de caixa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-ia/15 text-ia flex items-center justify-center shadow-sm shadow-ia/25 animate-pulse-glow">
          <Brain className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            IA Gerente — Recomendações & Auditoria
            <span className="text-[9px] bg-ia/20 text-ia px-1.5 py-0.5 rounded font-black border border-ia/30">
              BETA
            </span>
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Análise comportamental, prevenção de quebras e sugestões em tempo real.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight) => {
          let bgClass = '';
          let borderClass = '';
          let textClass = '';
          let Icon = Info;
          let iconColor = '';

          switch (insight.tipo) {
            case 'perigo':
              bgClass = 'bg-destructive/5 hover:bg-destructive/[0.08]';
              borderClass = 'border-destructive/30 hover:border-destructive/50 hover:shadow-destructive/5';
              textClass = 'text-destructive';
              Icon = AlertCircle;
              iconColor = 'bg-destructive/15 text-destructive';
              break;
            case 'alerta':
              bgClass = 'bg-warning/5 hover:bg-warning/[0.08]';
              borderClass = 'border-warning/30 hover:border-warning/50 hover:shadow-warning/5';
              textClass = 'text-warning-foreground';
              Icon = AlertTriangle;
              iconColor = 'bg-warning/15 text-warning';
              break;
            case 'sucesso':
              bgClass = 'bg-success/5 hover:bg-success/[0.08]';
              borderClass = 'border-success/30 hover:border-success/50 hover:shadow-success/5';
              Icon = CheckCircle2;
              iconColor = 'bg-success/15 text-success';
              break;
            case 'info':
            default:
              bgClass = 'bg-primary/5 hover:bg-primary/[0.08]';
              borderClass = 'border-primary/20 hover:border-primary/40 hover:shadow-primary/5';
              Icon = Info;
              iconColor = 'bg-primary/10 text-primary';
              break;
          }

          return (
            <div
              key={insight.id}
              className={`relative overflow-hidden border rounded-xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between ${bgClass} ${borderClass}`}
            >
              {/* Radial gradient background aura for AI feel */}
              <div className="absolute inset-0 bg-radial-gradient from-ia/3 to-transparent opacity-40 pointer-events-none" />

              <div className="space-y-2 flex-1">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground tracking-tight leading-none mt-0.5">
                      {insight.titulo}
                    </span>
                  </div>
                  
                  <Sparkles className="w-3.5 h-3.5 text-ia/50 animate-pulse" />
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed pr-2">
                  {insight.descricao}
                </p>
              </div>

              {/* Action Button */}
              {insight.acao && onActionTrigger && (
                <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
                  <Button
                    variant="ai"
                    size="sm"
                    className="text-[10px] font-bold h-7 py-1 px-3 shadow-none border border-ia/20 hover:border-ia/40"
                    onClick={() => onActionTrigger(insight.acao!)}
                  >
                    {insight.acaoLabel || 'Executar Ação'}
                    <ChevronRight size={12} className="ml-1" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
