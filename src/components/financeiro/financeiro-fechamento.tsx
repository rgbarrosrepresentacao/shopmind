"use client";

import * as React from "react";
import { getClosingPeriods, createClosingPeriod, reopenClosingPeriod } from "@/lib/actions/financeiro";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { 
  Lock, Unlock, Calendar, UserCheck, RefreshCw, 
  HelpCircle, AlertTriangle, Scale, Loader2
} from "lucide-react";

export function FinanceiroFechamento() {
  const [loading, setLoading] = React.useState(true);
  const [periods, setPeriods] = React.useState<any[]>([]);
  const [submitLoading, setSubmitLoading] = React.useState(false);

  // Form states
  const [newPeriod, setNewPeriod] = React.useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });

  // Reabertura states
  const [reopenForm, setReopenForm] = React.useState<{
    periodId: string | null;
    ano: number;
    mes: number;
    justificativa: string;
  }>({
    periodId: null,
    ano: 0,
    mes: 0,
    justificativa: "",
  });

  React.useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const res = await getClosingPeriods();
      if (res.error) {
        toast.error(res.error);
      } else {
        setPeriods(res.data || []);
      }
    } catch {
      toast.error("Erro ao carregar períodos de fechamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleClosePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirm = window.confirm(`Tem certeza de que deseja FECHAR o período de ${newPeriod.mes}/${newPeriod.ano}? Isso bloqueará todas as receitas, despesas e estornos neste mês.`);
    if (!confirm) return;

    setSubmitLoading(true);
    try {
      const res = await createClosingPeriod(newPeriod.ano, newPeriod.mes);
      if (!res.success) {
        toast.error(res.error || "Erro ao fechar período contábil.");
      } else {
        toast.success("Período contábil fechado com sucesso! Lançamentos bloqueados.");
        loadPeriods();
      }
    } catch {
      toast.error("Erro operacional ao fechar período.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReopenPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenForm.justificativa.trim()) {
      toast.error("A justificativa de reabertura é obrigatória.");
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await reopenClosingPeriod(reopenForm.ano, reopenForm.mes, reopenForm.justificativa);
      if (!res.success) {
        toast.error(res.error || "Erro ao reabrir período.");
      } else {
        toast.success("Período contábil reaberto para modificações temporárias!");
        setReopenForm({
          periodId: null,
          ano: 0,
          mes: 0,
          justificativa: "",
        });
        loadPeriods();
      }
    } catch {
      toast.error("Erro operacional ao reabrir período.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left panel: Lock / Close Month Form */}
      <div className="lg:col-span-1 bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
        
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Bloqueio Fiscal Contábil</h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Feche o mês contábil para evitar alterações retroativas.</p>
          </div>
        </div>

        <form onSubmit={handleClosePeriod} className="space-y-4 text-xs">
          
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Mês Fiscal</label>
            <select
              value={newPeriod.mes}
              onChange={e => setNewPeriod(prev => ({ ...prev, mes: Number(e.target.value) }))}
              className="w-full bg-slate-100 border border-transparent rounded-xl px-3.5 py-2.5 outline-none font-semibold text-foreground cursor-pointer"
            >
              {meses.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">Ano Fiscal</label>
            <select
              value={newPeriod.ano}
              onChange={e => setNewPeriod(prev => ({ ...prev, ano: Number(e.target.value) }))}
              className="w-full bg-slate-100 border border-transparent rounded-xl px-3.5 py-2.5 outline-none font-semibold text-foreground cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl flex items-start gap-2 text-[10px] text-slate-600 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Atenção:</strong> Ao fechar o período contábil, nenhum usuário poderá criar, liquidar, estornar ou editar receitas/despesas deste mês. 
              Gera segurança contra fraudes após a apuração do DRE/Dossiê.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
          >
            {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            Efetivar Fechamento de Mês
          </button>
        </form>

      </div>

      {/* Right panel: Listing of periods & Reopening */}
      <div className="lg:col-span-2 space-y-4">
        
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Histórico de Fechamentos Fiscais</h4>
            <p className="text-[9px] text-muted-foreground font-semibold">Bloqueios ativos de competência.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-border/70 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2">Período Contábil</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Fechado Em / Por</th>
                  <th className="px-4 py-2">Reaberto Em / Por</th>
                  <th className="px-4 py-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-slate-100">
                      <td colSpan={5} className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                    </tr>
                  ))
                ) : periods.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      Nenhum período contábil fechado ou auditado na filial.
                    </td>
                  </tr>
                ) : (
                  periods.map(p => {
                    const isClosed = p.status === "fechado";
                    
                    return (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors">
                        <td className="px-4 py-3 font-black text-foreground">
                          {meses[p.mes - 1]} de {p.ano}
                        </td>
                        
                        <td className="px-4 py-3">
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 border rounded-full flex items-center gap-0.5 w-max", {
                            "bg-rose-50 text-rose-600 border-rose-200": isClosed,
                            "bg-emerald-50 text-emerald-600 border-emerald-200": !isClosed
                          })}>
                            {isClosed ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                            {p.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-500 font-semibold">
                          {p.fechado_em ? (
                            <>
                              <p>{new Date(p.fechado_em).toLocaleDateString("pt-BR")}</p>
                              <p className="text-[8px] text-slate-400">Por: {p.fechado_por_user?.nome || "CFO"}</p>
                            </>
                          ) : "-"}
                        </td>

                        <td className="px-4 py-3 text-slate-500 font-semibold">
                          {p.reaberto_em ? (
                            <>
                              <p>{new Date(p.reaberto_em).toLocaleDateString("pt-BR")}</p>
                              <p className="text-[8px] text-slate-400">Por: {p.reaberto_por_user?.nome || "CFO"}</p>
                            </>
                          ) : "-"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {isClosed ? (
                            <button
                              onClick={() => setReopenForm({
                                periodId: p.id,
                                ano: p.ano,
                                mes: p.mes,
                                justificativa: ""
                              })}
                              className="px-2.5 py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded transition-all cursor-pointer"
                            >
                              Reabrir
                            </button>
                          ) : (
                            <span className="text-[9px] font-black text-slate-400">Liberado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Reopening Justification Form */}
        {reopenForm.periodId && (
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-3.5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-start gap-2">
              <Scale className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-black text-indigo-950 uppercase">Justificativa de Reabertura Contábil</h5>
                <p className="text-[9px] text-indigo-800">
                  Reabrir o período de {meses[reopenForm.mes - 1]} de {reopenForm.ano} requer uma justificativa auditada que constará nos dossiês de compliance.
                </p>
              </div>
            </div>

            <form onSubmit={handleReopenPeriod} className="space-y-3">
              <textarea
                required
                rows={2}
                value={reopenForm.justificativa}
                onChange={e => setReopenForm(prev => ({ ...prev, justificativa: e.target.value }))}
                placeholder="Insira o motivo detalhado para reabertura (ex: Ajuste fiscal de CMV pendente ou correção de conciliação bancária)..."
                className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-600/30 text-indigo-950 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReopenForm({ periodId: null, ano: 0, mes: 0, justificativa: "" })}
                  className="px-3 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100/50 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-1.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md flex items-center gap-1 cursor-pointer"
                >
                  {submitLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmar Reabertura
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
