import * as React from "react";
import type { InadimplenciaDevedor } from "@/lib/types/financeiro";
import { getCentroInadimplencia } from "@/lib/actions/financeiro";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  Users, AlertTriangle, MessageSquare, Phone, 
  XCircle, Clock, DollarSign, RefreshCw 
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export function FinanceiroInadimplencia() {
  const [loading, setLoading] = React.useState(true);
  const [devedores, setDevedores] = React.useState<InadimplenciaDevedor[]>([]);

  React.useEffect(() => {
    loadInadimplentes();
  }, []);

  const loadInadimplentes = async () => {
    setLoading(true);
    try {
      const res = await getCentroInadimplencia();
      if (res.error) {
        toast.error(res.error);
      } else {
        setDevedores(res.data || []);
      }
    } catch {
      toast.error("Erro ao carregar inadimplentes.");
    } finally {
      setLoading(false);
    }
  };

  const getAtrasoSeverityColor = (dias: number) => {
    if (dias >= 60) return "text-red-600 bg-red-50 border-red-150";
    if (dias >= 30) return "text-amber-600 bg-amber-50 border-amber-150";
    return "text-blue-600 bg-blue-50 border-blue-150";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  const totalEmAtraso = devedores.reduce((acc, d) => acc + d.total_atrasado, 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      
      {/* Executive Arrears Overview Header */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 bg-gradient-to-r from-red-50/10 to-amber-50/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">Carteira de Inadimplência Ativa</h3>
            <p className="text-[10px] text-muted-foreground">
              Monitoramento de recebimentos vencidos e controle de comunicação ativa de cobrança.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3.5 bg-white border border-border/60 p-2.5 rounded-xl self-start md:self-auto shadow-sm">
          <div>
            <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider">Total em Atraso</span>
            <span className="text-sm font-black text-red-600">{formatBRL(totalEmAtraso)}</span>
          </div>
          <div className="border-l border-border/60 pl-3.5">
            <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider">Devedores Ativos</span>
            <span className="text-sm font-black text-foreground">{devedores.length} clientes</span>
          </div>
          <button 
            onClick={loadInadimplentes}
            className="p-2 border border-border bg-white text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Atualizar Dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Devedores List */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/20">
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Relação de Clientes em Atraso</h3>
          <p className="text-[9px] text-muted-foreground mt-0.5">Listagem detalhada ordenada pelo maior valor em atraso.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-bold">Cliente</th>
                <th className="text-center px-4 py-3 font-bold w-32">Títulos Vencidos</th>
                <th className="text-center px-4 py-3 font-bold w-40">Máximo Atraso</th>
                <th className="text-right px-4 py-3 font-bold w-36">Total em Atraso</th>
                <th className="text-center px-4 py-3 font-bold w-44">Ações de Cobrança</th>
              </tr>
            </thead>
            <tbody>
              {devedores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <XCircle className="w-12 h-12 mx-auto text-emerald-500/20 mb-3" />
                    <p className="font-bold text-emerald-800">Inadimplência Zerada</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">Parabéns! Sua loja não possui nenhum recebimento atrasado no momento.</p>
                  </td>
                </tr>
              ) : (
                devedores.map((dev, idx) => {
                  const severityStyle = getAtrasoSeverityColor(dev.dias_atraso_max);
                  
                  // Mensagem de cobrança personalizada para WhatsApp
                  const whatsappMessage = encodeURIComponent(
                    `Olá, ${dev.cliente_nome}. Gostaria de conversar sobre um faturamento pendente conosco no valor de R$ ${dev.total_atrasado.toFixed(2)}. Poderia nos dar um retorno por favor para organizarmos a liquidação? Obrigado!`
                  );

                  return (
                    <tr key={idx} className="border-b border-border/50 hover:bg-slate-50/30 transition-colors">
                      
                      {/* Cliente */}
                      <td className="px-4 py-3.5 font-bold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs">{dev.cliente_nome}</p>
                          {dev.cliente_telefone && <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{dev.cliente_telefone}</p>}
                        </div>
                      </td>

                      {/* Títulos Vencidos */}
                      <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                        {dev.qtd_titulos} título(s)
                      </td>

                      {/* Máximo Atraso */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded border flex items-center gap-1 w-fit mx-auto", severityStyle)}>
                          <Clock className="w-3 h-3" />
                          {dev.dias_atraso_max} dias atrás
                        </span>
                      </td>

                      {/* Total em Atraso */}
                      <td className="px-4 py-3.5 text-right font-black text-red-600 text-xs">
                        {formatBRL(dev.total_atrasado)}
                      </td>

                      {/* Ações de Cobrança */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {dev.cliente_telefone ? (
                            <>
                              {/* WhatsApp Direct */}
                              <a
                                href={`https://wa.me/55${dev.cliente_telefone.replace(/\D/g, "")}?text=${whatsappMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all flex items-center gap-1 border border-emerald-200/50"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-500" /> WhatsApp
                              </a>

                              {/* Ligação */}
                              <a
                                href={`tel:${dev.cliente_telefone}`}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all inline-flex"
                                title="Ligar para Cliente"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic font-medium">Sem contato cadastrado</span>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
