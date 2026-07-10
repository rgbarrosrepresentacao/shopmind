"use client";

import * as React from "react";
import { listFinanceiro, receberOuPagarTitulo } from "@/lib/actions/financeiro";
import { toast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  Calendar, ChevronLeft, ChevronRight, CheckCircle, 
  TrendingUp, TrendingDown, HelpCircle, ArrowUpRight, ArrowDownRight, Clock
} from "lucide-react";

export function FinanceiroCalendario() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [loading, setLoading] = React.useState(true);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

  React.useEffect(() => {
    loadMonthTransactions();
  }, [currentDate]);

  const loadMonthTransactions = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startStr = new Date(year, month, 1).toISOString().split("T")[0];
      const endStr = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const res = await listFinanceiro({
        dataInicio: startStr,
        dataFim: endStr,
        perPage: 300, // Load all for the month
        status: "todos"
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        setTransactions(res.data || []);
      }
    } catch {
      toast.error("Erro ao carregar lançamentos do calendário.");
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() + offset);
    setCurrentDate(next);
    setSelectedDay(null);
  };

  // Helper para construir os dias do mês no calendário
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Preencher dias vazios do mês anterior
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Preencher dias do mês atual
    for (let i = 1; i <= numDays; i++) {
      days.push(i);
    }

    return days;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth();
  const monthLabel = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Agrupar lançamentos por dia do mês
  const dailySummary = React.useMemo(() => {
    const summary: Record<number, { entradas: number; saidas: number; itens: any[] }> = {};
    
    transactions.forEach(t => {
      const tDate = new Date(t.data_vencimento + "T12:00:00");
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const day = tDate.getDate();
        if (!summary[day]) {
          summary[day] = { entradas: 0, saidas: 0, itens: [] };
        }
        
        const valor = Number(t.valor) - Number(t.valor_pago || 0);
        if (t.tipo === "receita") {
          summary[day].entradas += valor;
        } else {
          summary[day].saidas += valor;
        }
        summary[day].itens.push(t);
      }
    });

    return summary;
  }, [transactions, year, month]);

  const handleBaixarTitulo = async (id: string) => {
    const confirm = window.confirm("Confirmar baixa contábil deste lançamento?");
    if (!confirm) return;

    try {
      const res = await receberOuPagarTitulo(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Baixa realizada com sucesso!");
        loadMonthTransactions();
      }
    } catch {
      toast.error("Erro ao processar pagamento.");
    }
  };

  const selectedDayData = selectedDay ? dailySummary[selectedDay] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Calendar Grid Box */}
      <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Calendário de Vencimentos</h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Fluxo de vencimento diário do faturamento e compras.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-slate-100 border border-border rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-foreground uppercase tracking-wider px-2 min-w-[120px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-slate-100 border border-border rounded-xl transition-all cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2.5 text-center text-xs">
          {/* Weekday Labels */}
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w, idx) => (
            <span key={idx} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">
              {w}
            </span>
          ))}

          {/* Days */}
          {loading ? (
            [...Array(35)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-50/60 rounded-xl border border-slate-100 animate-pulse" />
            ))
          ) : (
            days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-20 bg-slate-50/10" />;
              }

              const data = dailySummary[day];
              const balance = (data?.entradas || 0) - (data?.saidas || 0);
              const isSelected = selectedDay === day;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "h-20 border rounded-xl p-1.5 flex flex-col justify-between cursor-pointer transition-all hover:border-primary/40",
                    {
                      "bg-white border-primary/40 ring-1 ring-primary/20 shadow-sm": isSelected,
                      "bg-card border-border/65": !isSelected,
                    }
                  )}
                >
                  {/* Day Number */}
                  <div className="flex justify-between items-center">
                    <span className={cn("text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full", {
                      "bg-primary text-white": isSelected,
                      "text-foreground": !isSelected,
                    })}>
                      {day}
                    </span>
                    {data?.itens.length > 0 && (
                      <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1 rounded">
                        {data.itens.length}
                      </span>
                    )}
                  </div>

                  {/* Daily Balances */}
                  <div className="space-y-0.5 text-[8px] text-right font-black">
                    {data?.entradas > 0 && (
                      <p className="text-emerald-600">+{data.entradas.toFixed(0)}</p>
                    )}
                    {data?.saidas > 0 && (
                      <p className="text-rose-600">-{data.saidas.toFixed(0)}</p>
                    )}
                    {data?.itens.length > 0 && (
                      <p className={cn("border-t border-slate-100 mt-0.5 pt-0.5", {
                        "text-emerald-600": balance >= 0,
                        "text-rose-600": balance < 0
                      })}>
                        {balance >= 0 ? "+" : ""}{balance.toFixed(0)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Right Side: Day details drawer */}
      <div className="lg:col-span-1">
        {selectedDay && selectedDayData ? (
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col max-h-[60vh] overflow-y-auto">
            
            {/* Header info */}
            <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Vencimentos de Dia {selectedDay}
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Lançamentos agendados para este dia.</p>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-foreground"
              >
                Fechar
              </button>
            </div>

            {/* Daily balance brief */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-center">
              <div>
                <p className="text-[8px] font-bold text-emerald-600 uppercase">Receitas Previstas</p>
                <p className="text-xs font-black text-emerald-700">+{formatBRL(selectedDayData.entradas)}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-rose-600 uppercase">Despesas Previstas</p>
                <p className="text-xs font-black text-rose-700">-{formatBRL(selectedDayData.saidas)}</p>
              </div>
            </div>

            {/* Titles List */}
            <div className="space-y-2.5">
              {selectedDayData.itens.map(t => {
                const isIncome = t.tipo === "receita";
                const isPending = t.status === "pendente" || t.status === "atrasado";

                return (
                  <div key={t.id} className="p-3.5 border border-border/60 hover:bg-slate-50/40 rounded-xl transition-all space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", {
                          "bg-emerald-50 text-emerald-600": isIncome,
                          "bg-rose-50 text-rose-600": !isIncome,
                        })}>
                          {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-foreground line-clamp-1">{t.descricao}</p>
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wide">
                            {t.categoria} | Parcela {t.numero_parcela}/{t.total_parcelas}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-[8px] uppercase font-black px-1.5 py-0.5 rounded border", {
                        "bg-emerald-50 text-emerald-600 border-emerald-150": t.status === "pago",
                        "bg-amber-50 text-amber-600 border-amber-150": t.status === "pendente",
                        "bg-rose-50 text-rose-600 border-rose-150": t.status === "atrasado",
                      })}>
                        {t.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-xs font-black text-foreground">{formatBRL(t.valor)}</span>
                      {isPending && (
                        <button
                          onClick={() => handleBaixarTitulo(t.id)}
                          className="px-2.5 py-1 text-[9px] font-bold text-white bg-primary hover:bg-primary/95 rounded-lg transition-all shadow cursor-pointer flex items-center gap-0.5"
                        >
                          <CheckCircle className="w-3 h-3" /> Baixar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed rounded-2xl text-muted-foreground text-center p-4">
            <Clock className="w-8 h-8 text-muted-foreground/30 mb-2 animate-bounce" />
            <p className="text-xs font-black">Nenhum dia selecionado</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Selecione um dia com lançamentos no calendário para ver os detalhes.</p>
          </div>
        )}
      </div>

    </div>
  );
}
