"use client";

import * as React from "react";
import { getGeneralLedger, verifyLedgerIntegrity } from "@/lib/actions/financeiro";
import { toast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  ShieldCheck, ShieldAlert, Shield, Search, 
  HelpCircle, Scale, Users, Calendar, ArrowRight, Loader2
} from "lucide-react";

export function FinanceiroAuditoria() {
  const [loading, setLoading] = React.useState(true);
  const [ledger, setLedger] = React.useState<any[]>([]);
  const [auditResult, setAuditResult] = React.useState<{
    checked: boolean;
    success: boolean;
    totalVerificados: number;
    divergentes: string[];
  } | null>(null);
  const [auditLoading, setAuditLoading] = React.useState(false);

  // Filtros
  const [filters, setFilters] = React.useState({
    planoContas: "",
    centroCusto: "",
    dataInicio: "",
    dataFim: "",
  });

  React.useEffect(() => {
    loadLedger();
  }, [filters]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await getGeneralLedger(filters);
      if (res.error) {
        toast.error(res.error);
      } else {
        setLedger(res.data || []);
      }
    } catch {
      toast.error("Erro ao carregar Livro Razão.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setAuditLoading(true);
    try {
      const res = await verifyLedgerIntegrity();
      setAuditResult({
        checked: true,
        success: res.success,
        totalVerificados: res.totalVerificados,
        divergentes: res.divergentes
      });
      if (res.success) {
        toast.success("Assinaturas digitais auditadas. Integridade 100% íntegra!");
      } else {
        toast.error("Auditoria Contábil: Detectadas assinaturas divergentes ou corrompidas!");
      }
    } catch {
      toast.error("Erro ao rodar auditoria.");
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cryptographic Audit Hardening Panel */}
      <div className={cn(
        "border rounded-2xl p-5 shadow-sm transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6",
        {
          "bg-slate-50 border-slate-200/60": !auditResult,
          "bg-emerald-50/20 border-emerald-100": auditResult && auditResult.success,
          "bg-rose-50/20 border-rose-100": auditResult && !auditResult.success,
        }
      )}>
        
        <div className="flex items-start gap-4 flex-1">
          <div className={cn("p-3 rounded-xl mt-0.5", {
            "bg-slate-100 text-slate-600": !auditResult,
            "bg-emerald-100 text-emerald-600": auditResult && auditResult.success,
            "bg-rose-100 text-rose-600 animate-bounce": auditResult && !auditResult.success,
          })}>
            {auditResult ? (
              auditResult.success ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />
            ) : (
              <Shield className="w-6 h-6 text-primary" />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              Auditoria Criptográfica de Integridade Contábil
            </h3>
            <p className="text-[10px] text-muted-foreground leading-normal">
              O General Ledger (Livro Razão) assina digitalmente cada débito/crédito usando hashes SHA-256. 
              Qualquer inserção direta bypassando o Business Engine ou manipulação manual de lançamentos quebra as assinaturas, acusando fraude.
            </p>

            {auditResult && (
              <div className="pt-2 text-[10px] font-bold">
                {auditResult.success ? (
                  <p className="text-emerald-700">
                    ✓ STATUS: Razão 100% Íntegro! Total de {auditResult.totalVerificados} partidas contábeis auditadas e assinaturas criptográficas validadas com sucesso.
                  </p>
                ) : (
                  <div className="text-rose-700 space-y-1.5">
                    <p>✗ ATENÇÃO: Encontrados {auditResult.divergentes.length} desvios ou registros sem assinatura digital válida no Razão!</p>
                    <ul className="list-disc pl-4 space-y-0.5 font-semibold bg-white/60 p-2 rounded-xl border border-rose-100">
                      {auditResult.divergentes.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center">
          <button
            onClick={handleVerifyIntegrity}
            disabled={auditLoading}
            className={cn(
              "px-5 py-2.5 text-xs font-bold rounded-xl text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5 w-full md:w-auto justify-center",
              {
                "bg-primary hover:bg-primary/95": !auditResult,
                "bg-emerald-600 hover:bg-emerald-700": auditResult && auditResult.success,
                "bg-rose-600 hover:bg-rose-700": auditResult && !auditResult.success,
              }
            )}
          >
            {auditLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Shield className="w-3.5 h-3.5" />
            )}
            Rodar Auditoria Criptográfica
          </button>
        </div>

      </div>

      {/* Filter drawer for Ledger */}
      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1.5">Centro de Custo</label>
          <select
            value={filters.centroCusto}
            onChange={e => setFilters(prev => ({ ...prev, centroCusto: e.target.value }))}
            className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="Administrativo">Administrativo</option>
            <option value="Estoque">Estoque</option>
            <option value="CD">CD</option>
            <option value="Comercial">Comercial</option>
            <option value="Vendas">Vendas</option>
            <option value="Marketing">Marketing</option>
            <option value="TI">TI</option>
            <option value="RH">RH</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1.5">Plano de Contas</label>
          <input
            type="text"
            value={filters.planoContas}
            onChange={e => setFilters(prev => ({ ...prev, planoContas: e.target.value }))}
            placeholder="Ex: Aluguel"
            className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
          />
        </div>

        <div>
          <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1.5">De (Criação)</label>
          <input
            type="date"
            value={filters.dataInicio}
            onChange={e => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
            className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
          />
        </div>

        <div>
          <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1.5">Até (Criação)</label>
          <input
            type="date"
            value={filters.dataFim}
            onChange={e => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
            className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
          />
        </div>
      </div>

      {/* Double Entry ledger table list */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/10">
          <Scale className="w-4 h-4 text-slate-500" />
          <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
            Razão Contábil (Partidas Dobradas)
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-border/80 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Lançamento</th>
                <th className="px-4 py-3">Histórico / Lançamento Contábil</th>
                <th className="px-4 py-3">Conta Débito</th>
                <th className="px-4 py-3">Conta Crédito</th>
                <th className="px-4 py-3">Plano / C. Custo</th>
                <th className="px-4 py-3 text-right">Valor Partida</th>
                <th className="px-4 py-3">Assinatura Digital</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-slate-100">
                    <td colSpan={7} className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum lançamento contábil registrado no Livro Razão.
                  </td>
                </tr>
              ) : (
                ledger.map(l => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors">
                    
                    {/* Date / User */}
                    <td className="px-4 py-3.5 text-slate-500">
                      <p className="font-semibold">{new Date(l.created_at).toLocaleDateString("pt-BR")}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">{l.usuario_nome}</p>
                    </td>

                    {/* Memo */}
                    <td className="px-4 py-3.5 font-black text-foreground max-w-xs leading-normal">
                      {l.historico}
                    </td>

                    {/* Debit */}
                    <td className="px-4 py-3.5 text-emerald-600 font-bold">
                      {l.conta_debito}
                    </td>

                    {/* Credit */}
                    <td className="px-4 py-3.5 text-rose-600 font-bold">
                      {l.conta_credito}
                    </td>

                    {/* Classifications */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-600">{l.plano_contas}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{l.centro_custo || "Geral"}</p>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3.5 text-right font-black text-slate-700 text-xs">
                      {formatBRL(l.valor)}
                    </td>

                    {/* Hash Signature */}
                    <td className="px-4 py-3.5 text-[9px] text-slate-400 font-mono select-all">
                      {l.assinatura_hash ? (
                        <span className="bg-slate-50 px-2 py-1 border border-slate-200/40 rounded truncate max-w-[120px] block" title={l.assinatura_hash}>
                          {l.assinatura_hash.substring(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 border border-rose-100 rounded font-black">UNSIGNED</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
