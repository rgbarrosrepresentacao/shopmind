'use client';

import * as React from 'react';
import type { ClienteAniversariante } from '@/lib/types/clientes';
import {
  formatTelefone,
  formatBRL,
  getBgClassificacao,
  getLabelClassificacao,
} from '@/lib/types/clientes';
import { getAniversariantes } from '@/lib/actions/clientes';
import { MessageCircle, Gift, Calendar, Phone, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';

export const ClientesAniversariantes: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [aniversariantes, setAniversariantes] = React.useState<ClienteAniversariante[]>([]);

  React.useEffect(() => {
    loadAniversariantes();
  }, []);

  const loadAniversariantes = async () => {
    setLoading(true);
    try {
      const data = await getAniversariantes();
      setAniversariantes(data);
    } catch (err) {
      toast.error('Erro ao carregar aniversariantes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendGreeting = (c: ClienteAniversariante) => {
    if (!c.whatsapp && !c.telefone) return;
    const tel = (c.whatsapp || c.telefone)!.replace(/\D/g, '');
    
    // Greeting template
    const text = encodeURIComponent(
      `Olá, ${c.nome}! 🎉\n\nNós da ShopMind passamos para te desejar um Feliz Aniversário! Que seu dia seja repleto de paz, saúde e conquistas. 🎂✨\n\nComo presente especial, preparamos um cupom de desconto exclusivo para você em sua próxima compra! Venha nos visitar ou fale conosco para garantir o seu benefício! 🎁🎈`
    );

    window.open(`https://wa.me/55${tel}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
        <div className="h-20 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const hoje = aniversariantes.filter((a) => a.isHoje);
  const proximos = aniversariantes.filter((a) => !a.isHoje);

  return (
    <div className="space-y-6">
      {/* Hoje */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-pink-500 flex items-center gap-1.5">
          <Gift size={16} /> Aniversariantes de Hoje
        </h3>
        
        {hoje.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center bg-card text-muted-foreground">
            <span className="text-2xl">🍰</span>
            <p className="text-sm font-semibold text-foreground mt-1">
              Nenhum aniversariante hoje
            </p>
            <p className="text-xs">Não há clientes cadastrados que fazem aniversário no dia de hoje.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hoje.map((c) => {
              const formattedTel = formatTelefone(c.whatsapp || c.telefone);
              return (
                <div
                  key={c.id}
                  className="relative overflow-hidden rounded-xl border border-pink-500/30 bg-pink-500/5 p-4 flex justify-between items-center group hover:shadow-lg hover:shadow-pink-500/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/20 text-xl animate-pulse">
                      🎉
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        {c.nome}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {formattedTel}
                      </span>
                      <div className="flex gap-1.5 mt-2">
                        <Badge className={getBgClassificacao(c.classificacao)}>
                          {getLabelClassificacao(c.classificacao)}
                        </Badge>
                        <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                          {formatBRL(c.totalGasto)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSendGreeting(c)}
                    className="bg-pink-500 hover:bg-pink-600 text-white rounded-xl shadow-md flex items-center gap-1.5 py-1 px-3"
                  >
                    <MessageCircle size={14} /> Parabéns
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Próximos 30 dias */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Calendar size={16} className="text-primary" /> Próximos Aniversariantes (Próximos 30 dias)
        </h3>

        {proximos.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center bg-card text-muted-foreground">
            <span className="text-2xl">📅</span>
            <p className="text-sm font-semibold text-foreground mt-1">
              Nenhum aniversariante previsto
            </p>
            <p className="text-xs">Não há aniversariantes previstos para os próximos 30 dias.</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left align-middle">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Segmento</th>
                    <th className="p-4">Data do Aniversário</th>
                    <th className="p-4">Dias Restantes</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {proximos.map((c) => {
                    const cleanDate = new Date(c.aniversario + 'T00:00:00');
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary">
                              {c.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{c.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTelefone(c.whatsapp || c.telefone)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getBgClassificacao(c.classificacao)}>
                            {getLabelClassificacao(c.classificacao)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-foreground">
                            {cleanDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-primary font-semibold">
                            Faltam {c.diasParaAniversario} dias
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                            onClick={() => handleSendGreeting(c)}
                          >
                            <MessageCircle size={14} className="mr-1.5" /> Adiantar Parabéns
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
    </div>
  );
};
