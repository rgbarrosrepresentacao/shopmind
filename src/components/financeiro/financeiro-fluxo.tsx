import * as React from "react";
import type { FluxoCaixaProjecao } from "@/lib/types/financeiro";
import { getFluxoCaixaProjetado } from "@/lib/actions/financeiro";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  Calendar, Clock, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, Landmark, RefreshCw, BarChart3 
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export function FinanceiroFluxo() {
  const [loading, setLoading] = React.useState(true);
  const [projecao, setProjecao] = React.useState<FluxoCaixaProjecao | null>(null);
  const [periodo, setPeriodo] = React.useState<7 | 15 | 30 | 60 | 90>(30);
  const [tipoAgrupamento, setTipoAgrupamento] = React.useState<"diario" | "semanal" | "mensal">("diario");

  React.useEffect(() => {
    loadFluxo();
  }, [periodo]);

  const loadFluxo = async () => {
    setLoading(true);
    try {
      const res = await getFluxoCaixaProjetado(periodo);
      setProjecao(res);
    } catch {
      toast.error("Erro ao projetar fluxo de caixa.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  // Obter dados ativos baseados no agrupamento selecionado
  const activeData = tipoAgrupamento === "diario" 
    ? (projecao?.diario || []).map(d => ({ label: new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR"), ...d }))
    : tipoAgrupamento === "semanal"
    ? (projecao?.semanal || []).map(w => ({ label: w.semana, ...w }))
    : (projecao?.mensal || []).map(m => ({ label: m.mes, ...m }));

  // Verificar se haverá problemas de saldo negativo no período
  const diasNegativos = projecao?.diario.filter(d => d.saldoProjetado < 0) || [];
  const temRisco = diasNegativos.length > 0;

  return (
    <div className="space-y-5">
      
      {/* Risk Alert Header */}
      {temRisco && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm animate-in fade-in slide-in-from-top duration-150">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-black text-rose-800">Alerta de Liquidez: Risco de Saldo Negativo</h4>
            <p className="font-medium mt-0.5 leading-relaxed text-rose-700">
              Detectamos que o seu saldo projetado acumulado ficará negativo a partir de{" "}
              <span className="font-black">{new Date(diasNegativos[0].data + "T12:00:00").toLocaleDateString("pt-BR")}</span>. 
              Considere antecipar recebimentos de clientes ou prorrogar despesas não críticas.
            </p>
          </div>
        </div>
      )}

      {/* Projections Config Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/20">
        
        {/* Agrupamento */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: "diario", label: "Diário" },
            { id: "semanal", label: "Semanal" },
            { id: "mensal", label: "Mensal" }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setTipoAgrupamento(opt.id as any)}
              className={cn("px-4 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer", {
                "bg-white text-foreground shadow-sm": tipoAgrupamento === opt.id,
                "text-muted-foreground hover:text-foreground hover:bg-white/40": tipoAgrupamento !== opt.id,
              })}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Período de Projeção */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período de Projeção:</span>
          <select
            value={periodo}
            onChange={e => setPeriodo(Number(e.target.value) as any)}
            className="bg-white border border-border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer shadow-sm"
          >
            <option value={7}>Próximos 7 dias</option>
            <option value={15}>Próximos 15 dias</option>
            <option value={30}>Próximos 30 dias</option>
            <option value={60}>Próximos 60 dias</option>
            <option value={90}>Próximos 90 dias</option>
          </select>
          <button 
            onClick={loadFluxo}
            className="p-2 border border-border bg-white text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Atualizar Projeção"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Main Timeline Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/20 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary" /> 
              Projeção Linear de Caixa ({tipoAgrupamento === "diario" ? "Dias" : tipoAgrupamento === "semanal" ? "Semanas" : "Meses"})
            </h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Evolução do saldo de caixa somando entradas e subtraindo saídas projetadas.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-bold">Período ({tipoAgrupamento === "diario" ? "Data" : "Nome"})</th>
                <th className="text-right px-4 py-3 font-bold w-32">Entradas Previstas</th>
                <th className="text-right px-4 py-3 font-bold w-32">Saídas Previstas</th>
                <th className="text-right px-4 py-3 font-bold w-32">Saldo Líquido</th>
                <th className="text-right px-4 py-3 font-bold w-40">Saldo Acumulado Projetado</th>
              </tr>
            </thead>
            <tbody>
              {activeData.map((row, idx) => {
                const net = row.entradas - row.saidas;
                const isNegativeBalance = row.saldoProjetado < 0;

                return (
                  <tr 
                    key={idx} 
                    className={cn("border-b border-border/50 hover:bg-slate-50/30 transition-colors", {
                      "bg-rose-500/5 hover:bg-rose-500/10": isNegativeBalance
                    })}
                  >
                    
                    {/* Período */}
                    <td className="px-4 py-3 font-bold text-slate-700 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {row.label}
                    </td>

                    {/* Entradas */}
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                      {row.entradas > 0 ? `+ ${formatBRL(row.entradas)}` : "-"}
                    </td>

                    {/* Saídas */}
                    <td className="px-4 py-3 text-right text-rose-600 font-semibold">
                      {row.saidas > 0 ? `- ${formatBRL(row.saidas)}` : "-"}
                    </td>

                    {/* Líquido */}
                    <td className={cn("px-4 py-3 text-right font-black", {
                      "text-emerald-600": net > 0,
                      "text-rose-600": net < 0,
                      "text-slate-400": net === 0
                    })}>
                      {net > 0 ? `+ ${formatBRL(net)}` : net < 0 ? `- ${formatBRL(Math.abs(net))}` : formatBRL(0)}
                    </td>

                    {/* Acumulado Projetado */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 font-black text-sm">
                        <Landmark className={cn("w-3.5 h-3.5", isNegativeBalance ? "text-rose-600 animate-pulse" : "text-indigo-600")} />
                        <span className={isNegativeBalance ? "text-rose-600 font-black" : "text-foreground"}>
                          {formatBRL(row.saldoProjetado)}
                        </span>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
