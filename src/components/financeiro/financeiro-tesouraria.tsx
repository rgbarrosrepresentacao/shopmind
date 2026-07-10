"use client";

import * as React from "react";
import { getFinanceAccounts, createFinanceAccount, criarTransferenciaInterna, listFinanceiro } from "@/lib/actions/financeiro";
import { toast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/types/compras";
import { cn } from "@/lib/utils/cn";
import { 
  Landmark, CreditCard, ArrowRightLeft, Plus, 
  Search, ShieldAlert, History, Coins, Calendar, ArrowUpRight, ArrowDownRight, Loader2
} from "lucide-react";

export function FinanceiroTesouraria() {
  const [loading, setLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [extrato, setExtrato] = React.useState<any[]>([]);
  const [extratoLoading, setExtratoLoading] = React.useState(false);

  // Modais/Forms
  const [showAccountModal, setShowAccountModal] = React.useState(false);
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [submitLoading, setSubmitLoading] = React.useState(false);

  // Form Conta
  const [accountForm, setAccountForm] = React.useState({
    nome: "",
    tipo: "conta_corrente" as any,
    banco: "",
    agencia: "",
    conta: "",
    pix: "",
    limite: 0,
    saldoNegativoPermitido: false,
  });

  // Form Transferência
  const [transferForm, setTransferForm] = React.useState({
    origemId: "",
    destinoId: "",
    valor: "",
    descricao: "",
  });

  React.useEffect(() => {
    loadAccounts();
  }, []);

  React.useEffect(() => {
    if (selectedAccountId) {
      loadExtrato(selectedAccountId);
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await getFinanceAccounts();
      if (res.error) {
        toast.error(res.error);
      } else {
        setAccounts(res.data || []);
        if (res.data && res.data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(res.data[0].id);
        }
      }
    } catch {
      toast.error("Erro ao carregar contas de tesouraria.");
    } finally {
      setLoading(false);
    }
  };

  const loadExtrato = async (accountId: string) => {
    setExtratoLoading(true);
    try {
      const res = await listFinanceiro({
        accountId,
        perPage: 30,
        status: "todos"
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        setExtrato(res.data || []);
      }
    } catch {
      toast.error("Erro ao carregar extrato.");
    } finally {
      setExtratoLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.nome.trim()) {
      toast.error("O nome da conta é obrigatório.");
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await createFinanceAccount(accountForm);
      if (!res.success) {
        toast.error(res.error || "Erro ao criar conta.");
      } else {
        toast.success("Conta de tesouraria criada com sucesso!");
        setShowAccountModal(false);
        setAccountForm({
          nome: "",
          tipo: "conta_corrente",
          banco: "",
          agencia: "",
          conta: "",
          pix: "",
          limite: 0,
          saldoNegativoPermitido: false,
        });
        loadAccounts();
      }
    } catch {
      toast.error("Erro ao processar criação de conta.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = Number(transferForm.valor);
    if (!transferForm.origemId || !transferForm.destinoId) {
      toast.error("Selecione as contas de origem e destino.");
      return;
    }
    if (transferForm.origemId === transferForm.destinoId) {
      toast.error("A conta de origem e destino devem ser diferentes.");
      return;
    }
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Insira um valor de transferência válido.");
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await criarTransferenciaInterna({
        origemAccountId: transferForm.origemId,
        destinoAccountId: transferForm.destinoId,
        valor: valorNum,
        descricao: transferForm.descricao.trim() || "Transferência de Tesouraria",
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Transferência realizada e liquidada com sucesso!");
        setShowTransferModal(false);
        setTransferForm({
          origemId: "",
          destinoId: "",
          valor: "",
          descricao: "",
        });
        loadAccounts();
        if (selectedAccountId) loadExtrato(selectedAccountId);
      }
    } catch {
      toast.error("Erro ao efetuar transferência.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-100 rounded-2xl md:col-span-1" />
          <div className="h-64 bg-slate-100 rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Overview Cards & Main Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">Saldos de Caixa e Tesouraria</h3>
            <p className="text-[10px] text-muted-foreground">Gestão de saldos reais e limites de contas correntes e cofres.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-border hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir Fundos
          </button>
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer transition-all shadow-md shadow-primary/10"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Conta
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Accounts List */}
        <div className="space-y-3 lg:col-span-1">
          <h4 className="text-xs font-black text-foreground uppercase tracking-wider px-1">Contas Ativas</h4>
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {accounts.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-2xl text-muted-foreground">
                <Landmark className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold">Nenhuma conta cadastrada</p>
              </div>
            ) : (
              accounts.map(acc => {
                const isSelected = acc.id === selectedAccountId;
                const isLocked = acc.locked_until && new Date(acc.locked_until) > new Date();
                
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={cn(
                      "p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-3 shadow-sm",
                      {
                        "bg-white border-primary/40 ring-1 ring-primary/20": isSelected,
                        "bg-card border-border hover:bg-slate-50/50": !isSelected,
                      }
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-2 rounded-lg", {
                          "bg-indigo-50 text-indigo-600": acc.tipo === "banco" || acc.tipo === "conta_corrente",
                          "bg-emerald-50 text-emerald-600": acc.tipo === "caixa" || acc.tipo === "carteira",
                          "bg-amber-50 text-amber-600": acc.tipo === "conta_aplicacao",
                        })}>
                          {acc.tipo === "banco" || acc.tipo === "conta_corrente" ? (
                            <Landmark className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground">{acc.nome}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            {acc.tipo.replace("_", " ")} {acc.banco ? `(${acc.banco})` : ""}
                          </p>
                        </div>
                      </div>
                      {isLocked && (
                        <span className="text-[8px] bg-amber-50 border border-amber-200 text-amber-600 font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                          <ShieldAlert className="w-2.5 h-2.5" /> LOCK
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-100 pt-2.5">
                      <div>
                        <p className="text-[8px] text-muted-foreground font-semibold">Saldo Disponível</p>
                        <p className="text-sm font-black text-foreground">{formatBRL(acc.saldo_disponivel)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-muted-foreground font-semibold">Limite</p>
                        <p className="text-[10px] font-black text-slate-500">{formatBRL(acc.limite)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Account Details & Extrato */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAccount ? (
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
              
              {/* Account Header info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-black text-foreground">{selectedAccount.nome}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {selectedAccount.banco && (
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Banco: {selectedAccount.banco} | Ag: {selectedAccount.agencia} | Cc: {selectedAccount.conta}
                      </span>
                    )}
                    {selectedAccount.pix && (
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Chave PIX: {selectedAccount.pix}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground font-semibold">Saldo Contábil total</p>
                  <p className="text-base font-black text-primary">{formatBRL(selectedAccount.saldo_atual)}</p>
                </div>
              </div>

              {/* Extrato Listing */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-muted-foreground" /> Extrato Contábil da Conta
                  </h5>
                  <p className="text-[9px] text-muted-foreground font-semibold">Últimas 30 transações</p>
                </div>

                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-border/60 text-muted-foreground text-[9px] font-bold uppercase tracking-wider">
                          <th className="px-4 py-2">Data</th>
                          <th className="px-4 py-2">Descrição</th>
                          <th className="px-4 py-2">Categoria</th>
                          <th className="px-4 py-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extratoLoading ? (
                          [...Array(3)].map((_, idx) => (
                            <tr key={idx} className="animate-pulse border-b border-slate-100">
                              <td colSpan={4} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded w-full" /></td>
                            </tr>
                          ))
                        ) : extrato.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-10 text-muted-foreground">
                              Nenhuma movimentação registrada nesta conta de tesouraria.
                            </td>
                          </tr>
                        ) : (
                          extrato.map(t => {
                            const isIncome = t.tipo === "receita";
                            return (
                              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                                <td className="px-4 py-2.5 text-slate-500 font-semibold">
                                  {new Date(t.data_pagamento || t.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                                </td>
                                <td className="px-4 py-2.5 font-black text-foreground">
                                  {t.descricao}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500">
                                  {t.categoria}
                                </td>
                                <td className={cn("px-4 py-2.5 text-right font-black", {
                                  "text-emerald-600": isIncome,
                                  "text-rose-600": !isIncome
                                })}>
                                  {isIncome ? "+" : "-"} {formatBRL(t.valor_pago || t.valor)}
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

            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border border-dashed rounded-2xl text-muted-foreground">
              Selecione uma conta à esquerda para gerenciar.
            </div>
          )}
        </div>

      </div>

      {/* Modal Nova Conta */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-foreground">Cadastrar Conta de Tesouraria</h3>
                <p className="text-[10px] text-muted-foreground">Adicione caixas operacionais, contas correntes ou digitais.</p>
              </div>
              <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Nome da Conta *</label>
                  <input
                    type="text"
                    required
                    value={accountForm.nome}
                    onChange={e => setAccountForm(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Caixa Geral Filial"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent focus:border-primary/20 text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Tipo de Conta *</label>
                  <select
                    value={accountForm.tipo}
                    onChange={e => setAccountForm(prev => ({ ...prev, tipo: e.target.value as any }))}
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent cursor-pointer text-foreground"
                  >
                    <option value="conta_corrente">Conta Corrente</option>
                    <option value="caixa">Cofre / Caixa Físico</option>
                    <option value="banco">Banco / Poupança</option>
                    <option value="conta_digital">Conta Digital (Fintech)</option>
                    <option value="conta_aplicacao">Investimento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Código Banco (opcional)</label>
                  <input
                    type="text"
                    value={accountForm.banco}
                    onChange={e => setAccountForm(prev => ({ ...prev, banco: e.target.value }))}
                    placeholder="Ex: 341 (Itaú)"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Agência</label>
                  <input
                    type="text"
                    value={accountForm.agencia}
                    onChange={e => setAccountForm(prev => ({ ...prev, agencia: e.target.value }))}
                    placeholder="0001"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Conta com Dígito</label>
                  <input
                    type="text"
                    value={accountForm.conta}
                    onChange={e => setAccountForm(prev => ({ ...prev, conta: e.target.value }))}
                    placeholder="12345-6"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Chave PIX Comercial</label>
                  <input
                    type="text"
                    value={accountForm.pix}
                    onChange={e => setAccountForm(prev => ({ ...prev, pix: e.target.value }))}
                    placeholder="E-mail, CNPJ ou Celular"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Limite de Crédito (R$)</label>
                  <input
                    type="number"
                    value={accountForm.limite}
                    onChange={e => setAccountForm(prev => ({ ...prev, limite: Number(e.target.value) }))}
                    placeholder="0.00"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="saldoNegativo"
                    checked={accountForm.saldoNegativoPermitido}
                    onChange={e => setAccountForm(prev => ({ ...prev, saldoNegativoPermitido: e.target.checked }))}
                    className="w-4 h-4 text-primary rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="saldoNegativo" className="text-[10px] font-bold text-slate-600 cursor-pointer">Permitir Saldo Negativo</label>
                </div>

              </div>

              <div className="flex justify-end gap-2 border-t pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/95 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Cadastrar Conta
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Transferir Fundos */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-foreground">Transferência Contábil de Fundos</h3>
                <p className="text-[10px] text-muted-foreground">Mova valores liquidados de forma imediata entre contas.</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-foreground cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleTransfer} className="p-4 space-y-4 text-xs">
              <div className="space-y-3.5">
                
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Conta de Origem (Saída) *</label>
                  <select
                    required
                    value={transferForm.origemId}
                    onChange={e => setTransferForm(prev => ({ ...prev, origemId: e.target.value }))}
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent cursor-pointer text-foreground"
                  >
                    <option value="">Selecione a conta emissora</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} (Disp: {formatBRL(a.saldo_disponivel)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Conta de Destino (Entrada) *</label>
                  <select
                    required
                    value={transferForm.destinoId}
                    onChange={e => setTransferForm(prev => ({ ...prev, destinoId: e.target.value }))}
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent cursor-pointer text-foreground"
                  >
                    <option value="">Selecione a conta receptora</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} (Disp: {formatBRL(a.saldo_disponivel)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Valor da Transferência (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={transferForm.valor}
                    onChange={e => setTransferForm(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Descrição da Movimentação *</label>
                  <input
                    type="text"
                    required
                    value={transferForm.descricao}
                    onChange={e => setTransferForm(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: Sangria Operacional para Depósito Bancário"
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold border border-transparent text-foreground focus:border-primary/20"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-2 border-t pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/95 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submitLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirmar Transferência
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
