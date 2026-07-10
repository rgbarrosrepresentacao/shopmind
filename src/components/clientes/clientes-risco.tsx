'use client';

import * as React from 'react';
import type { ClienteRisco } from '@/lib/types/clientes';
import {
  formatTelefone,
  formatBRL,
  getBgClassificacao,
  getLabelClassificacao,
} from '@/lib/types/clientes';
import { getClientesEmRisco } from '@/lib/actions/clientes';
import { MessageCircle, AlertTriangle, AlertOctagon, RefreshCw, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';

export const ClientesRisco: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [clientesRisco, setClientesRisco] = React.useState<ClienteRisco[]>([]);

  React.useEffect(() => {
    loadClientesRisco();
  }, []);

  const loadClientesRisco = async () => {
    setLoading(true);
    try {
      const data = await getClientesEmRisco();
      setClientesRisco(data);
    } catch (err) {
      toast.error('Erro ao carregar análise de risco');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContactRecovery = (c: ClienteRisco) => {
    if (!c.whatsapp && !c.telefone) return;
    const tel = (c.whatsapp || c.telefone)!.replace(/\D/g, '');

    let text = '';
    if (c.classificacao === 'vip') {
      text = `Olá, ${c.nome}! 🎉\n\nSentimos a sua falta por aqui! Como você é um de nossos clientes VIP mais especiais, preparamos um benefício exclusivo para sua próxima visita. ⭐️\n\nQue tal dar uma olhada nas novidades desta semana? Fale conosco para receber fotos das novidades ou agendar um horário exclusivo! 🎁`;
    } else if (c.classificacao === 'frequente') {
      text = `Olá, ${c.nome}! Tudo bem? 😊\n\nSentimos falta de ver você por aqui! Acabamos de receber novidades incríveis na loja que combinam muito com seu estilo. ✨\n\nPara te receber de volta com carinho, preparamos um cupom com condições especiais na sua próxima compra. Deseja conferir os modelos disponíveis? 🛍️`;
    } else {
      text = `Olá, ${c.nome}! Passando para saber se está tudo bem por aí e te contar que temos novos produtos na loja. 🌟\n\nFaz algum tempo que não nos vemos. Gostaria de receber nosso catálogo atualizado pelo WhatsApp? 📲`;
    }

    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getNivelBadge = (nivel: ClienteRisco['nivel']) => {
    switch (nivel) {
      case 'perdido':
        return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30">Totalmente Inativo</Badge>;
      case 'critico':
        return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Crítico (&gt;90d)</Badge>;
      case 'moderado':
        return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">Moderado (60-90d)</Badge>;
      case 'leve':
        return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Alerta Leve (30-60d)</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <ShieldAlert size={16} className="text-destructive animate-pulse" /> Prevenção de Churn
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clientes que realizaram compras no passado, mas não compram há mais de 30 dias.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadClientesRisco}>
          <RefreshCw size={14} className="mr-1.5" /> Atualizar Análise
        </Button>
      </div>

      {clientesRisco.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card text-muted-foreground">
          <span className="text-3xl">🛡️</span>
          <p className="font-semibold text-foreground mt-1">Todos os clientes ativos!</p>
          <p className="text-xs">Não foram detectados clientes com risco de inatividade no momento.</p>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left align-middle">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Segmento RFM</th>
                  <th className="p-4">Nível de Risco</th>
                  <th className="p-4">Dias Inativo</th>
                  <th className="p-4">Histórico</th>
                  <th className="p-4 text-right">Recuperação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {clientesRisco.map((c) => {
                  const formattedTel = formatTelefone(c.whatsapp || c.telefone);
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary">
                            {c.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{c.nome}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone size={10} /> {formattedTel}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getBgClassificacao(c.classificacao)}>
                          {getLabelClassificacao(c.classificacao)}
                        </Badge>
                      </td>
                      <td className="p-4">{getNivelBadge(c.nivel)}</td>
                      <td className="p-4 text-foreground font-medium">
                        {c.diasSemCompra} dias inativo
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          Última compra: {c.ultimaCompra ? new Date(c.ultimaCompra).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">
                            {c.totalCompras} compras
                          </span>
                          <span className="text-muted-foreground">
                            Gasto: <span className="text-emerald-500 font-semibold">{formatBRL(c.totalGasto)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                          onClick={() => handleContactRecovery(c)}
                        >
                          <MessageCircle size={14} className="mr-1.5" /> Reatar Contato
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
