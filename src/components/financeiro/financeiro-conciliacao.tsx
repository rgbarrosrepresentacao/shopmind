"use client";

import * as React from "react";
import { 
  getFinanceAccounts, 
  getBankStatements, 
  getBankTransactions, 
  importOFXStatement, 
  autoMatchTransactions, 
  processBankReconciliation 
} from "@/lib/actions/financeiro";
import { toast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  Upload, FileText, CheckCircle, AlertTriangle, ArrowRightLeft, 
  Search, ShieldAlert, Cpu, Sparkles, ChevronRight, HelpCircle, Loader2
} from "lucide-react";

export function FinanceiroConciliacao() {
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("");
  
  const [statements, setStatements] = React.useState<any[]>([]);
  const [selectedStatementId, setSelectedStatementId] = React.useState<string | null>(null);
  
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [matches, setMatches] = React.useState<any[]>([]);
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null);
  const [matchingLoading, setMatchingLoading] = React.useState(false);
  const [uploadLoading, setUploadLoading] = React.useState(false);

  React.useEffect(() => {
    loadInitialData();
  }, []);

  React.useEffect(() => {
    if (selectedStatementId) {
      loadStatementDetails(selectedStatementId);
    }
  }, [selectedStatementId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [resAccounts, resStatements] = await Promise.all([
        getFinanceAccounts(),
        getBankStatements()
      ]);

      if (resAccounts.error || resStatements.error) {
        toast.error(resAccounts.error || resStatements.error);
      } else {
        setAccounts(resAccounts.data || []);
        setStatements(resStatements.data || []);
        if (resAccounts.data && resAccounts.data.length > 0) {
          setSelectedAccountId(resAccounts.data[0].id);
        }
        if (resStatements.data && resStatements.data.length > 0) {
          setSelectedStatementId(resStatements.data[0].id);
        }
      }
    } catch {
      toast.error("Erro ao carregar dados de conciliação.");
    } finally {
      setLoading(false);
    }
  };

  const loadStatementDetails = async (statementId: string) => {
    setMatchingLoading(true);
    try {
      const [resTx, resMatches] = await Promise.all([
        getBankTransactions(statementId),
        autoMatchTransactions(statementId)
      ]);

      if (resTx.error || resMatches.error) {
        toast.error(resTx.error || resMatches.error);
      } else {
        setTransactions(resTx.data || []);
        setMatches(resMatches.data || []);
      }
    } catch {
      toast.error("Erro ao carregar detalhes do extrato.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) {
      toast.error("Selecione uma conta de tesouraria e um arquivo OFX.");
      return;
    }

    setUploadLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const res = await importOFXStatement(selectedAccountId, text);
        if (!res.success) {
          toast.error(res.error || "Erro ao importar arquivo OFX.");
        } else {
          toast.success("Extrato bancário OFX importado com sucesso!");
          // Recarregar listas
          const resStmts = await getBankStatements();
          setStatements(resStmts.data || []);
          if (res.data) {
            setSelectedStatementId(res.data);
          }
        }
        setUploadLoading(false);
      };
      reader.readAsText(file);
    } catch {
      toast.error("Erro no processamento do arquivo.");
      setUploadLoading(false);
    }
  };

  const handleConciliarItem = async (bankTxId: string, erpTxId: string) => {
    setReconcilingId(bankTxId);
    try {
      const res = await processBankReconciliation(selectedStatementId!, [
        {
          bankTransactionId: bankTxId,
          erpTransacaoId: erpTxId,
          status: "conciliado"
        }
      ]);

      if (!res.success) {
        toast.error(res.error || "Erro ao realizar conciliação.");
      } else {
        toast.success("Transação conciliada e saldo atualizado!");
        loadStatementDetails(selectedStatementId!);
      }
    } catch {
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setReconcilingId(null);
    }
  };

  const handleConciliarLote = async () => {
    const highMatches = matches.filter(m => m.confidence >= 85 && m.bankTransaction.status === "pendente");
    if (highMatches.length === 0) {
      toast.info("Nenhuma sugestão de alta confiança pendente para conciliar em lote.");
      return;
    }

    const confirm = window.confirm(`Deseja conciliar ${highMatches.length} lançamentos sugeridos com mais de 85% de confiança contábil?`);
    if (!confirm) return;

    setMatchingLoading(true);
    try {
      const payload = highMatches.map(m => ({
        bankTransactionId: m.bankTransaction.id,
        erpTransacaoId: m.recommendation.id,
        status: "conciliado" as const
      }));

      const res = await processBankReconciliation(selectedStatementId!, payload);
      if (!res.success) {
        toast.error(res.error || "Erro na conciliação em lote.");
      } else {
        toast.success(`${highMatches.length} lançamentos conciliados simultaneamente com sucesso!`);
        loadStatementDetails(selectedStatementId!);
      }
    } catch {
      toast.error("Erro operacional.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const selectedStatement = statements.find(s => s.id === selectedStatementId);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Upload and Statement selector Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-5">
        
        {/* Upload OFX panel */}
        <div className="md:col-span-1 border-r border-slate-200/60 pr-0 md:pr-6 space-y-3.5">
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
              <Upload className="w-4 h-4 text-primary" /> Importar Extrato Bancário
            </h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Suporta arquivos padrão OFX exportados pelo internet banking.</p>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[8px] font-bold text-muted-foreground uppercase mb-1 block">Vincular a Conta *</label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".ofx"
                onChange={handleFileUpload}
                id="ofx-upload"
                className="hidden"
                disabled={uploadLoading}
              />
              <label
                htmlFor="ofx-upload"
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-all shadow-sm",
                  { "opacity-50 pointer-events-none": uploadLoading }
                )}
              >
                {uploadLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                    <span>Importando Extrato...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Upload Arquivo OFX</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Statements list/selector */}
        <div className="md:col-span-2 space-y-3">
          <div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Histórico de Extratos Importados</h3>
            <p className="text-[9px] text-muted-foreground mt-0.5">Selecione um lote de extratos para conciliar os lançamentos.</p>
          </div>

          <div className="flex flex-wrap gap-2.5 max-h-32 overflow-y-auto">
            {statements.length === 0 ? (
              <div className="text-slate-400 text-xs font-bold py-4">Nenhum extrato importado. Faça upload acima.</div>
            ) : (
              statements.map(s => {
                const isSelected = s.id === selectedStatementId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStatementId(s.id)}
                    className={cn(
                      "px-3.5 py-2 text-[10px] font-black rounded-xl border transition-all text-left flex flex-col gap-0.5 cursor-pointer shadow-sm",
                      {
                        "bg-primary text-white border-primary": isSelected,
                        "bg-white border-border text-slate-600 hover:bg-slate-50": !isSelected,
                      }
                    )}
                  >
                    <span className="font-bold">{s.conta?.nome || "Conta Tesouraria"}</span>
                    <span className="text-[8px] opacity-80">
                      Período: {new Date(s.periodo_inicio).toLocaleDateString("pt-BR")} a {new Date(s.periodo_fim).toLocaleDateString("pt-BR")}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Reconciliation Matches Panel */}
      {selectedStatementId && selectedStatement ? (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Sugestões de Auto-matching da IA <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Cruzamento preditivo de dados bancários reais com títulos previstos do ERP.</p>
              </div>
            </div>

            <button
              onClick={handleConciliarLote}
              disabled={matchingLoading}
              className="px-4 py-2 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              {matchingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Conciliar Seleção da IA em Lote {"(>=85% Confiança)"}
            </button>
          </div>

          {/* List of Match Panels */}
          <div className="space-y-3.5">
            {matchingLoading && matches.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-xs font-bold">Rodando motor de auto-matching contábil...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                Nenhuma transação pendente encontrada neste extrato. Tudo 100% conciliado!
              </div>
            ) : (
              matches.map((m, idx) => {
                const b = m.bankTransaction;
                const e = m.recommendation;
                const isPending = b.status === "pendente";
                
                return (
                  <div 
                    key={b.id || idx} 
                    className={cn(
                      "grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 border rounded-2xl shadow-sm items-center transition-all",
                      {
                        "border-slate-200/70 hover:border-slate-300 bg-white": isPending,
                        "bg-emerald-50/20 border-emerald-100 opacity-75": !isPending,
                      }
                    )}
                  >
                    
                    {/* Left Col: Bank transaction data (Extrato) */}
                    <div className="lg:col-span-4 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">EXTRATO BANCÁRIO</span>
                        <span className={cn("text-[8px] font-black uppercase px-1.5 rounded-full border", {
                          "bg-emerald-50 text-emerald-600 border-emerald-200": b.tipo === "entrada",
                          "bg-rose-50 text-rose-600 border-rose-200": b.tipo === "saida"
                        })}>
                          {b.tipo}
                        </span>
                      </div>
                      <p className="text-xs font-black text-foreground truncate">{b.descricao}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold">
                        <span>Vcto: {new Date(b.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                        <span className="font-black text-foreground">{formatBRL(b.valor)}</span>
                      </div>
                    </div>

                    {/* Middle Col: Connection arrow */}
                    <div className="lg:col-span-1 flex justify-center text-slate-400">
                      <ChevronRight className="w-5 h-5 hidden lg:block" />
                      <div className="h-0.5 bg-slate-200 w-full block lg:hidden my-2" />
                    </div>

                    {/* Right Col: ERP Recommendation or Empty State */}
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-8 space-y-1">
                        {e ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold text-indigo-500 uppercase">ERP PREVISTO</span>
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full", {
                                "bg-emerald-100 text-emerald-800": m.confidence >= 85,
                                "bg-amber-100 text-amber-800": m.confidence < 85 && m.confidence >= 60,
                              })}>
                                {m.confidence}% Confiança contábil
                              </span>
                            </div>
                            <p className="text-xs font-black text-foreground truncate">{e.descricao}</p>
                            <p className="text-[9px] text-slate-500 font-semibold">
                              Venc: {new Date(e.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")} | Valor: {formatBRL(e.valor)}
                            </p>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-bold">Nenhuma correspondência sugerida pela IA</span>
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-4 text-right">
                        {isPending ? (
                          e ? (
                            <button
                              onClick={() => handleConciliarItem(b.id, e.id)}
                              disabled={reconcilingId === b.id}
                              className="w-full px-3.5 py-2 text-[10px] font-bold bg-primary text-white hover:bg-primary/95 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {reconcilingId === b.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Conciliar
                            </button>
                          ) : (
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded">Aguardando Lançamento</span>
                          )
                        ) : (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Conciliado
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      ) : (
        <div className="h-48 border border-dashed rounded-2xl flex flex-col items-center justify-center text-muted-foreground text-center p-4">
          <Cpu className="w-8 h-8 text-indigo-500/30 mb-2 animate-bounce" />
          <p className="text-xs font-black">Nenhum extrato selecionado</p>
          <p className="text-[9px] mt-0.5">Faça o upload de um extrato contábil OFX ou selecione um lote importado acima para executar a reconciliação bancária.</p>
        </div>
      )}

    </div>
  );
}
