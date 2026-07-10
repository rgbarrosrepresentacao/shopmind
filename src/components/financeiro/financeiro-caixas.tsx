"use client";

import * as React from "react";
import { 
  getActiveCashSession, 
  openCashSession, 
  closeCashSession, 
  performCashInflow, 
  performCashOutflow, 
  reconcileCashSession,
  getFinanceAccounts
} from "@/lib/actions/financeiro";
import { toast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  Lock, Unlock, ArrowRightLeft, Coins, Play, StopCircle, 
  Plus, Minus, RefreshCw, AlertTriangle, ShieldCheck, Loader2
} from "lucide-react";

export function FinanceiroCaixas() {
  const [loading, setLoading] = React.useState(true);
  const [activeSession, setActiveSession] = React.useState<any | null>(null);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  
  // Actions Loading
  const [actionLoading, setActionLoading] = React.useState(false);

  // Forms Modais
  const [showOpenModal, setShowOpenModal] = React.useState(false);
  const [showInflowModal, setShowInflowModal] = React.useState(false);
  const [showOutflowModal, setShowOutflowModal] = React.useState(false);
  const [showReconcileModal, setShowReconcileModal] = React.useState(false);

  // Form Open
  const [openForm, setOpenForm] = React.useState({
    valorAbertura: "",
    accountId: ""
  });

  // Form Inflow / Outflow
  const [flowForm, setFlowForm] = React.useState({
    valor: "",
    motivo: ""
  });

  // Form Reconcile
  const [reconcileForm, setReconcileForm] = React.useState({
    valorContado: "",
    justificativa: ""
  });

  React.useEffect(() => {
    loadCashSession();
    loadAccounts();
  }, []);

  const loadCashSession = async () => {
    setLoading(true);
    try {
      const res = await getActiveCashSession();
      if (res.error) {
        toast.error(res.error);
      } else {
        setActiveSession(res.data);
      }
    } catch {
      toast.error("Erro ao carregar sessão de caixa.");
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await getFinanceAccounts();
      if (!res.error) {
        const caixasOnly = (res.data || []).filter(a => a.tipo === "caixa" || a.tipo === "carteira");
        setAccounts(caixasOnly);
        if (caixasOnly.length > 0) {
          setOpenForm(prev => ({ ...prev, accountId: caixasOnly[0].id }));
        }
      }
    } catch {
      console.error("Erro ao carregar contas de caixa.");
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(openForm.valorAbertura);
    if (isNaN(val) || val < 0) {
      toast.error("O valor de abertura deve ser positivo.");
      return;
    }
    if (!openForm.accountId) {
      toast.error("Selecione uma conta de caixa correspondente.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await openCashSession(val, openForm.accountId);
      if (!res.success) {
        toast.error(res.error || "Erro ao abrir sessão de caixa.");
      } else {
        toast.success("Sessão de caixa aberta com sucesso!");
        setShowOpenModal(false);
        setOpenForm({ valorAbertura: "", accountId: accounts[0]?.id || "" });
        loadCashSession();
      }
    } catch {
      toast.error("Erro ao abrir caixa.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(flowForm.valor);
    if (isNaN(val) || val <= 0) {
      toast.error("O valor de suprimento deve ser maior que zero.");
      return;
    }
    if (!flowForm.motivo.trim()) {
      toast.error("O motivo do suprimento é obrigatório.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await performCashInflow(activeSession.id, val, flowForm.motivo);
      if (!res.success) {
        toast.error(res.error || "Erro ao efetuar suprimento.");
      } else {
        toast.success("Suprimento de troco registrado com sucesso!");
        setShowInflowModal(false);
        setFlowForm({ valor: "", motivo: "" });
        loadCashSession();
      }
    } catch {
      toast.error("Erro operacional.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOutflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(flowForm.valor);
    if (isNaN(val) || val <= 0) {
      toast.error("O valor de sangria deve ser maior que zero.");
      return;
    }
    if (!flowForm.motivo.trim()) {
      toast.error("O motivo da sangria é obrigatório.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await performCashOutflow(activeSession.id, val, flowForm.motivo);
      if (!res.success) {
        toast.error(res.error || "Erro ao efetuar sangria.");
      } else {
        toast.success("Sangria de dinheiro registrada com sucesso!");
        setShowOutflowModal(false);
        setFlowForm({ valor: "", motivo: "" });
        loadCashSession();
      }
    } catch {
      toast.error("Erro operacional.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(reconcileForm.valorContado);
    if (isNaN(val) || val < 0) {
      toast.error("O valor contado deve ser positivo.");
      return;
    }

    setActionLoading(true);
    try {
      // 1. Reconciliar
      const resRec = await reconcileCashSession(activeSession.id, val, reconcileForm.justificativa);
      if (!resRec.success) {
        toast.error(resRec.error || "Erro na reconciliação contábil.");
        setActionLoading(false);
        return;
      }

      // 2. Fechar caixa
      const resClose = await closeCashSession(activeSession.id, val);
      if (!resClose.success) {
        toast.error(resClose.error || "Erro ao fechar caixa.");
      } else {
        toast.success("Sessão de caixa conciliada e fechada com sucesso!");
        setShowReconcileModal(false);
        setReconcileForm({ valorContado: "", justificativa: "" });
        loadCashSession();
      }
    } catch {
      toast.error("Erro operacional.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 bg-slate-50 border border-slate-200/50 rounded-2xl animate-pulse flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  // Projetar saldo teórico: abertura + vendas_dinheiro + suprimentos - sangrias
  const saldoProjetadoTeorico = activeSession ? (
    Number(activeSession.valor_abertura) + 
    Number(activeSession.total_dinheiro || 0) + 
    Number(activeSession.total_suprimentos || 0) - 
    Number(activeSession.total_sangrias || 0)
  ) : 0;

  return (
    <div className="space-y-6">
      
      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Active cashier KPIs & Details */}
          <div className="lg:col-span-1 bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Meu Caixa Ativo</h3>
                  <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Sessão em andamento</p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100/50">
                <span className="text-muted-foreground font-semibold">Abertura</span>
                <span className="font-black text-foreground">{formatBRL(activeSession.valor_abertura)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100/50">
                <span className="text-muted-foreground font-semibold">Vendas em Dinheiro</span>
                <span className="font-black text-emerald-600">+{formatBRL(activeSession.total_dinheiro || 0)}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100/50">
                <span className="text-muted-foreground font-semibold">Suprimentos (+)</span>
                <span className="font-black text-emerald-600">+{formatBRL(activeSession.total_suprimentos || 0)}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100/50">
                <span className="text-muted-foreground font-semibold">Sangrias (-)</span>
                <span className="font-black text-rose-600">-{formatBRL(activeSession.total_sangrias || 0)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 font-bold bg-slate-50 px-2 rounded-lg">
                <span className="text-foreground">Saldo Teórico (Gaveta)</span>
                <span className="font-black text-primary text-sm">{formatBRL(saldoProjetadoTeorico)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowReconcileModal(true)}
              className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer mt-2"
            >
              <StopCircle className="w-3.5 h-3.5" /> Conciliar & Fechar Caixa
            </button>
          </div>

          {/* Right panel: Operations (Sangrias and Suprimentos) */}
          <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Operações de Caixa e Trocos
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Entradas de suprimento de troco e sangrias de cofre.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card Suprimento */}
              <div className="border border-border/75 rounded-2xl p-4 flex flex-col justify-between gap-4 bg-emerald-50/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-foreground">Registrar Suprimento</h5>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Adicione dinheiro à gaveta para fins de troco inicial.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInflowModal(true)}
                  className="w-full py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all shadow cursor-pointer"
                >
                  Entrada de Troco
                </button>
              </div>

              {/* Card Sangria */}
              <div className="border border-border/75 rounded-2xl p-4 flex flex-col justify-between gap-4 bg-rose-50/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Minus className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-foreground">Registrar Sangria</h5>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Retire excesso de dinheiro físico para depósito em cofre.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOutflowModal(true)}
                  className="w-full py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-xl transition-all shadow cursor-pointer"
                >
                  Retirada de Dinheiro
                </button>
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="h-64 border border-dashed rounded-2xl flex flex-col items-center justify-center text-muted-foreground text-center p-6">
          <Coins className="w-10 h-10 text-slate-300 mb-2 animate-bounce" />
          <p className="text-xs font-black">Nenhuma sessão de caixa ativa</p>
          <p className="text-[9px] mt-0.5 mb-4">Você precisa iniciar o seu caixa operacional antes de processar recebimentos fiscais ou vendas.</p>
          
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/95 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
          >
            <Play className="w-3.5 h-3.5" /> Abrir Sessão de Caixa
          </button>
        </div>
      )}

      {/* Modal Abertura de Caixa */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-foreground">Abrir Sessão de Caixa Operacional</h3>
                <p className="text-[10px] text-muted-foreground">Estabeleça o troco de abertura da gaveta física.</p>
              </div>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleOpenSession} className="p-4 space-y-4 text-xs">
              <div className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Conta Tesouraria Correspondente *</label>
                  <select
                    required
                    value={openForm.accountId}
                    onChange={e => setOpenForm(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent cursor-pointer text-foreground"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} (Saldo: {formatBRL(a.saldo_disponivel)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Fundo de Troco Inicial (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openForm.valorAbertura}
                    onChange={e => setOpenForm(prev => ({ ...prev, valorAbertura: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/95 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suprimento */}
      {showInflowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-foreground">Registrar Suprimento (Gaveta)</h3>
                <p className="text-[10px] text-muted-foreground">Insira valores adicionais para suprir demandas de troco físico.</p>
              </div>
              <button onClick={() => setShowInflowModal(false)} className="text-slate-400 hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleInflow} className="p-4 space-y-4 text-xs">
              <div className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Valor Adicional (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={flowForm.valor}
                    onChange={e => setFlowForm(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Motivo do Suprimento *</label>
                  <input
                    type="text"
                    required
                    value={flowForm.motivo}
                    onChange={e => setFlowForm(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Ex: Troco inicial moedas e cédulas menores"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowInflowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sangria */}
      {showOutflowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-foreground">Registrar Sangria Contábil</h3>
                <p className="text-[10px] text-muted-foreground">Retire dinheiro físico excedente para depositar em cofre.</p>
              </div>
              <button onClick={() => setShowOutflowModal(false)} className="text-slate-400 hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleOutflow} className="p-4 space-y-4 text-xs">
              <div className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Valor de Retirada (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={flowForm.valor}
                    onChange={e => setFlowForm(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Motivo da Sangria / Destino *</label>
                  <input
                    type="text"
                    required
                    value={flowForm.motivo}
                    onChange={e => setFlowForm(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Ex: Depósito Cofre Central - Excesso Cédulas R$ 100"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowOutflowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmar Retirada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reconciliar & Fechar */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-foreground">Reconciliar & Fechar Caixa</h3>
                <p className="text-[10px] text-muted-foreground">Efetue a contagem física do dinheiro gaveta para apurar diferenças.</p>
              </div>
              <button onClick={() => setShowReconcileModal(false)} className="text-slate-400 hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleReconcile} className="p-4 space-y-4 text-xs">
              <div className="space-y-3.5">
                
                <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1.5 text-[10px] leading-relaxed text-slate-600">
                  <p className="font-bold text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-primary" /> Balanço Teórico Contábil
                  </p>
                  <p>O sistema apurou que deveriam constar fisicamente na gaveta do operador o saldo total de:</p>
                  <p className="text-xs font-black text-primary">{formatBRL(saldoProjetadoTeorico)}</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Valor Físico Contado (Gaveta) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={reconcileForm.valorContado}
                    onChange={e => setReconcileForm(prev => ({ ...prev, valorContado: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>

                {reconcileForm.valorContado !== "" && (
                  <div className={cn("p-3 border rounded-xl font-bold flex items-start gap-2 text-[10px]", {
                    "bg-emerald-50 border-emerald-200 text-emerald-700": (Number(reconcileForm.valorContado) - saldoProjetadoTeorico) >= 0,
                    "bg-rose-50 border-rose-200 text-rose-700": (Number(reconcileForm.valorContado) - saldoProjetadoTeorico) < 0,
                  })}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      {Number(reconcileForm.valorContado) - saldoProjetadoTeorico === 0 ? (
                        <p>✓ Caixa Perfeito! Nenhuma divergência operacional detectada.</p>
                      ) : Number(reconcileForm.valorContado) - saldoProjetadoTeorico > 0 ? (
                        <p>▲ Sobra de Caixa Contada: +{formatBRL(Number(reconcileForm.valorContado) - saldoProjetadoTeorico)} de excesso físico.</p>
                      ) : (
                        <p>▼ Quebra de Caixa Apurada: {formatBRL(Number(reconcileForm.valorContado) - saldoProjetadoTeorico)} de déficit físico.</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Justificativa da Diferença (opcional)</label>
                  <textarea
                    rows={2}
                    value={reconcileForm.justificativa}
                    onChange={e => setReconcileForm(prev => ({ ...prev, justificativa: e.target.value }))}
                    placeholder="Se houver sobras ou quebras, justifique o motivo aqui..."
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20 resize-none"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-2 border-t pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmar Conciliação & Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
