import * as React from "react";
import type { DRESimplificado } from "@/lib/types/financeiro";
import { getDRESimplificado } from "@/lib/actions/financeiro";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  FileText, Calendar, TrendingUp, TrendingDown, 
  HelpCircle, Percent, DollarSign, RefreshCw 
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export function FinanceiroDRE() {
  const [loading, setLoading] = React.useState(true);
  const [dre, setDre] = React.useState<DRESimplificado | null>(null);

  const hoje = new Date();
  const [mes, setMes] = React.useState(hoje.getMonth() + 1);
  const [ano, setAno] = React.useState(hoje.getFullYear());

  React.useEffect(() => {
    loadDRE();
  }, [mes, ano]);

  const loadDRE = async () => {
    setLoading(true);
    try {
      const res = await getDRESimplificado(mes, ano);
      setDre(res);
    } catch {
      toast.error("Erro ao carregar DRE Simplificado.");
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const anos = [ano - 1, ano, ano + 1];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-muted rounded-2xl" />
        <div className="h-72 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!dre) return null;

  const isPositive = dre.lucroLiquido >= 0;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      
      {/* Date Selectors Header */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/20">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Demonstrativo de Resultado do Exercício</h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Visão de competência (receitas e custos efetivados no período selecionado).</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto">
          {/* Mes Select */}
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="flex-1 sm:flex-initial bg-white border border-border rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer shadow-sm"
          >
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Ano Select */}
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="bg-white border border-border rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer shadow-sm"
          >
            {anos.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <button 
            onClick={loadDRE}
            className="p-2.5 border border-border bg-white text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm animate-in spin-in-12 duration-200"
            title="Atualizar DRE"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cascading DRE Card */}
      <div className="bg-card border border-border/85 rounded-3xl shadow-sm overflow-hidden p-6 space-y-5">
        
        {/* Waterfall Cascade */}
        <div className="space-y-4 text-xs font-bold text-slate-700">
          
          {/* 1. Receita Bruta */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">1. Receita Bruta (Vendas + Serviços)</span>
            <span className="text-foreground font-semibold">{formatBRL(dre.receitaBruta)}</span>
          </div>

          {/* 2. Deduções e Descontos */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">2. (-) Descontos Concedidos / Deduções</span>
            <span className="text-rose-600 font-medium">- {formatBRL(dre.deducoesDescontos)}</span>
          </div>

          {/* 3. Receita Líquida (Subtotal) */}
          <div className="flex items-center justify-between py-2 bg-slate-50/60 px-3 rounded-xl border border-slate-100">
            <span className="text-foreground font-black">3. (=) Receita Líquida Operacional</span>
            <span className="text-foreground font-black text-sm">{formatBRL(dre.receitaLiquida)}</span>
          </div>

          {/* 4. CMV */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">4. (-) Custos de Mercadorias (CMV / Compras estoque)</span>
            <span className="text-rose-600 font-medium">- {formatBRL(dre.custoMercadorias)}</span>
          </div>

          {/* 5. Lucro Bruto (Subtotal) */}
          <div className="flex items-center justify-between py-2 bg-slate-50/60 px-3 rounded-xl border border-slate-100">
            <span className="text-foreground font-black">5. (=) Lucro Bruto Comercial</span>
            <span className="text-foreground font-black text-sm">{formatBRL(dre.lucroBruto)}</span>
          </div>

          {/* 6. Despesas Operacionais */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">6. (-) Despesas Operacionais (Aluguel, Folha, Impostos...)</span>
            <span className="text-rose-600 font-medium">- {formatBRL(dre.despesasOperacionais)}</span>
          </div>

          {/* 7. Lucro Líquido (FINAL) */}
          <div className={cn("flex items-center justify-between py-3 px-4 rounded-2xl border transition-all shadow-sm", {
            "bg-emerald-500/10 border-emerald-500/20 text-emerald-900": isPositive,
            "bg-rose-500/10 border-rose-500/20 text-rose-900": !isPositive
          })}>
            <span className="font-black text-sm flex items-center gap-1.5">
              {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
              Resultando Líquido do Mês
            </span>
            <span className="font-black text-base">
              {isPositive ? `+ ${formatBRL(dre.lucroLiquido)}` : `- ${formatBRL(Math.abs(dre.lucroLiquido))}`}
            </span>
          </div>

        </div>

        {/* Rentabilidade Margins Cards */}
        <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-5 mt-3 text-xs font-bold">
          
          {/* Margem Bruta */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] font-bold text-muted-foreground block uppercase tracking-wider">Margem Bruta</span>
              <span className="text-xs font-black text-foreground">{dre.margemBruta.toFixed(1)}%</span>
            </div>
          </div>

          {/* Margem Líquida */}
          <div className={cn("border rounded-2xl p-3 flex items-center gap-3.5", {
            "bg-emerald-500/5 border-emerald-500/10": isPositive,
            "bg-rose-500/5 border-rose-500/10": !isPositive
          })}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", {
              "bg-emerald-500/10 text-emerald-600": isPositive,
              "bg-rose-500/10 text-rose-600": !isPositive
            })}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] font-bold text-muted-foreground block uppercase tracking-wider">Margem Líquida</span>
              <span className={cn("text-xs font-black", isPositive ? "text-emerald-600" : "text-rose-600")}>
                {dre.margemLiquida.toFixed(1)}%
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
