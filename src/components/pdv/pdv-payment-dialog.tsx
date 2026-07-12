"use client";

import * as React from "react";
import { formatBRL } from "@/lib/types/produtos";
import type { PDVCheckout } from "@/lib/types/pdv";
import { X, CreditCard, Wallet, Coins, RefreshCw, Gift, Sparkles, Check, Percent } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getClienteFidelidadeInfo, getRecompensasFidelidade } from "@/lib/actions/fidelidade";
import { toast } from "@/components/ui/toast";

interface PDVPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  total: number; // total original do carrinho (líquido com descontoGeral)
  clienteId: string | null;
  descontoGeral: number; // descontoGeral original do carrinho
  onConfirm: (checkoutData: PDVCheckout) => void;
  loading: boolean;
}

export const PDVPaymentDialog: React.FC<PDVPaymentDialogProps> = ({
  isOpen,
  onClose,
  total,
  clienteId,
  descontoGeral,
  onConfirm,
  loading,
}) => {
  const [method, setMethod] = React.useState<"dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "multiplo">("dinheiro");
  const inputValorRef = React.useRef<HTMLInputElement>(null);
  
  // Mixed payment values
  const [dinheiroVal, setDinheiroVal] = React.useState(0);
  const [pixVal, setPixVal] = React.useState(0);
  const [creditoVal, setCreditoVal] = React.useState(0);
  const [debitoVal, setDebitoVal] = React.useState(0);

  // Simple payment input values (string for input binding)
  const [inputValue, setInputValue] = React.useState(total.toFixed(2));

  // --- Estados de Fidelidade ---
  const [loyaltyInfo, setLoyaltyInfo] = React.useState<any>(null);
  const [recompensas, setRecompensas] = React.useState<any[]>([]);
  const [loadingLoyalty, setLoadingLoyalty] = React.useState(false);
  
  // Opções aplicadas no checkout
  const [usarCashback, setUsarCashback] = React.useState(false);
  const [cashbackUsado, setCashbackUsado] = React.useState(0);
  const [recompensaSelecionada, setRecompensaSelecionada] = React.useState<any>(null);
  const [tipoDocumento, setTipoDocumento] = React.useState<"recibo" | "pedido" | "orcamento" | "comprovante" | "venda" | "devolucao" | "cupom">("comprovante");

  // Carregar dados de fidelidade do cliente
  React.useEffect(() => {
    if (isOpen && clienteId) {
      setLoadingLoyalty(true);
      Promise.all([
        getClienteFidelidadeInfo(clienteId),
        getRecompensasFidelidade()
      ]).then(([loyaltyRes, recompRes]) => {
        if (loyaltyRes.data) {
          setLoyaltyInfo(loyaltyRes.data);
        }
        if (recompRes.data) {
          // Filtrar apenas recompensas ativas
          setRecompensas(recompRes.data.filter((r: any) => r.status === "ativo"));
        }
        setLoadingLoyalty(false);
      }).catch(err => {
        console.error("Erro ao carregar dados de fidelidade:", err);
        setLoadingLoyalty(false);
      });
    } else {
      setLoyaltyInfo(null);
      setRecompensas([]);
      setUsarCashback(false);
      setCashbackUsado(0);
      setRecompensaSelecionada(null);
    }
  }, [isOpen, clienteId]);

  // Desconto ganho pela recompensa selecionada
  const descontoRecompensa = React.useMemo(() => {
    if (!recompensaSelecionada) return 0;
    // Se for do tipo desconto ou cupom, retorna o valor
    if (recompensaSelecionada.tipo === "desconto" || recompensaSelecionada.tipo === "cupom") {
      return Number(recompensaSelecionada.valor_desconto || 0);
    }
    // Para outros tipos (brinde/produto/cashback), o desconto financeiro no carrinho é 0,
    // pois o prêmio é entregue fisicamente ou creditado depois.
    return 0;
  }, [recompensaSelecionada]);

  // Novo total a ser pago após os abatimentos da fidelidade
  const totalComFidelidade = React.useMemo(() => {
    const valor = total - descontoRecompensa - (usarCashback ? cashbackUsado : 0);
    return Math.max(0, valor);
  }, [total, descontoRecompensa, usarCashback, cashbackUsado]);

  // Atualizar inputValue quando totalComFidelidade muda
  React.useEffect(() => {
    setInputValue(totalComFidelidade.toFixed(2));
  }, [totalComFidelidade]);

  // Resetar estados ao abrir/mudar método
  React.useEffect(() => {
    if (isOpen) {
      setMethod("dinheiro");
      setDinheiroVal(0);
      setPixVal(0);
      setCreditoVal(0);
      setDebitoVal(0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && method !== "multiplo") {
      setTimeout(() => {
        inputValorRef.current?.focus();
        inputValorRef.current?.select();
      }, 50);
    }
  }, [isOpen, method]);

  // Compute total paid in cash/card
  const totalPaid = React.useMemo(() => {
    let raw = 0;
    if (method === "multiplo") {
      raw = dinheiroVal + pixVal + creditoVal + debitoVal;
    } else {
      raw = parseFloat(inputValue) || 0;
    }
    return Number(raw.toFixed(2));
  }, [method, inputValue, dinheiroVal, pixVal, creditoVal, debitoVal]);

  const remaining = React.useMemo(() => {
    return Math.max(0, Number((totalComFidelidade - totalPaid).toFixed(2)));
  }, [totalComFidelidade, totalPaid]);

  const troco = React.useMemo(() => {
    if (method === "multiplo") {
      const nonCashTotal = Number((pixVal + creditoVal + debitoVal).toFixed(2));
      const cashNeeded = Math.max(0, Number((totalComFidelidade - nonCashTotal).toFixed(2)));
      return dinheiroVal > cashNeeded ? Number((dinheiroVal - cashNeeded).toFixed(2)) : 0;
    }
    if (method !== "dinheiro") {
      return 0; // Electronic methods don't generate change
    }
    return Math.max(0, Number((totalPaid - totalComFidelidade).toFixed(2)));
  }, [method, totalComFidelidade, totalPaid, dinheiroVal, pixVal, creditoVal, debitoVal]);

  const isFinalizeEnabled = React.useMemo(() => {
    if (loading) return false;
    // O valor pago deve cobrir o total com os abatimentos, com precisão de 2 casas decimais
    return totalPaid >= Number(totalComFidelidade.toFixed(2));
  }, [totalPaid, totalComFidelidade, loading]);

  // Handler to add quick bills
  const handleAddQuickCash = (amount: number) => {
    if (method === "multiplo") {
      setDinheiroVal((prev) => prev + amount);
    } else {
      const current = parseFloat(inputValue) || 0;
      setInputValue((current + amount).toFixed(2));
    }
  };

  const handleKeypadPress = (key: string) => {
    if (method === "multiplo") return;
    
    if (key === "C") {
      setInputValue("0");
    } else if (key === ".") {
      if (!inputValue.includes(".")) {
        setInputValue((prev) => prev + ".");
      }
    } else {
      setInputValue((prev) => {
        if (prev === "0" || prev === totalComFidelidade.toFixed(2)) {
          return key;
        }
        return prev + key;
      });
    }
  };

  // Toggle usar cashback
  const handleToggleCashback = (checked: boolean) => {
    setUsarCashback(checked);
    if (checked && loyaltyInfo) {
      // Sugere usar o máximo possível
      const maxCashback = Math.min(Number(loyaltyInfo.saldo_cashback), total - descontoRecompensa);
      setCashbackUsado(Number(maxCashback.toFixed(2)));
    } else {
      setCashbackUsado(0);
    }
  };

  // Alterar valor do cashback usado manualmente
  const handleCashbackValueChange = (val: number) => {
    if (!loyaltyInfo) return;
    const max = Math.min(Number(loyaltyInfo.saldo_cashback), total - descontoRecompensa);
    if (val > max) {
      toast.error(`O limite máximo de cashback para esta compra é ${formatBRL(max)}`);
      setCashbackUsado(Number(max.toFixed(2)));
    } else {
      setCashbackUsado(Number(val.toFixed(2)));
    }
  };

  const handleSubmit = () => {
    if (!isFinalizeEnabled) return;

    let detalhePagamento: Record<string, number> | null = null;
    let pagamentosArray: Array<{ metodo: string; valor: number }> | null = null;

    if (method === "multiplo") {
      detalhePagamento = {};
      pagamentosArray = [];
      if (dinheiroVal > 0) {
        detalhePagamento.dinheiro = dinheiroVal;
        pagamentosArray.push({ metodo: "dinheiro", valor: dinheiroVal });
      }
      if (pixVal > 0) {
        detalhePagamento.pix = pixVal;
        pagamentosArray.push({ metodo: "pix", valor: pixVal });
      }
      if (creditoVal > 0) {
        detalhePagamento.cartao_credito = creditoVal;
        pagamentosArray.push({ metodo: "cartao_credito", valor: creditoVal });
      }
      if (debitoVal > 0) {
        detalhePagamento.cartao_debito = debitoVal;
        pagamentosArray.push({ metodo: "cartao_debito", valor: debitoVal });
      }
    } else {
      pagamentosArray = [
        { metodo: method, valor: totalComFidelidade }
      ];
    }

    // Passar o desconto da recompensa somado ao desconto geral para que a venda saia com o valor líquido correto
    const descontoFinalTotal = descontoGeral + descontoRecompensa;

    onConfirm({
      clienteId,
      descontoGeral: descontoFinalTotal,
      formaPagamento: method,
      detalhePagamento,
      pagamentos: pagamentosArray,
      valorPago: totalPaid,
      troco,
      recompensaId: recompensaSelecionada?.id || null,
      cashbackUsado: usarCashback ? cashbackUsado : null,
      tipoDocumento,
    });
  };

  const handleSubmitRef = React.useRef(handleSubmit);
  React.useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  React.useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "F2" || e.key === "Enter") {
        if (isFinalizeEnabled) {
          e.preventDefault();
          handleSubmitRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleModalKeyDown);
    return () => window.removeEventListener("keydown", handleModalKeyDown);
  }, [isOpen, isFinalizeEnabled]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog Body */}
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col md:flex-row max-h-[95vh]">
        
        {/* Left Section: Mode Selector & Inputs */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                💰 Checkout & Pagamento
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha o método e insira o valor recebido.
              </p>
            </div>
            <button
              onClick={(e) => { e.currentTarget.blur(); onClose(); }}
              type="button"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PANEL DE FIDELIDADE (CASHBACK & PONTOS) */}
          {clienteId && loyaltyInfo && (
            <div className="bg-gradient-to-r from-violet-600/5 to-indigo-600/5 border border-violet-600/15 rounded-2xl p-4 space-y-3.5 select-none">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-violet-700 flex items-center gap-1 uppercase tracking-wider">
                  <Gift className="w-4 h-4 text-violet-600" /> Fidelidade & Cashback ShopMind
                </span>
                <span className="text-[10px] font-black bg-violet-600/10 text-violet-600 border border-violet-600/20 px-2.5 py-0.5 rounded-full">
                  Nível: {loyaltyInfo.nivel_vip}
                </span>
              </div>

              {loadingLoyalty ? (
                <p className="text-[10px] text-muted-foreground animate-pulse">Carregando saldos...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Cashback Option */}
                  <div className="bg-white/80 border border-violet-600/10 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usarCashback}
                          onChange={(e) => handleToggleCashback(e.target.checked)}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 w-4 h-4"
                        />
                        <span>Usar Cashback</span>
                      </label>
                      <span className="text-[10px] font-black text-emerald-600">
                        Saldo: {formatBRL(loyaltyInfo.saldo_cashback)}
                      </span>
                    </div>

                    {usarCashback && (
                      <div className="relative mt-1 animate-slide-down">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cashbackUsado || ""}
                          onChange={(e) => handleCashbackValueChange(parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className="w-full pl-8 pr-3 py-1.5 bg-input text-foreground border border-border rounded-lg text-xs font-bold outline-none focus:border-violet-600"
                        />
                      </div>
                    )}
                  </div>

                  {/* Points Rewards Option */}
                  <div className="bg-white/80 border border-violet-600/10 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        Resgatar Prêmio
                      </span>
                      <span className="text-[10px] font-black text-violet-600">
                        Pontos: {loyaltyInfo.saldo_pontos} pts
                      </span>
                    </div>

                    <select
                      value={recompensaSelecionada?.id || ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        const recomp = recompensas.find(r => r.id === id);
                        if (recomp && recomp.custo_pontos > loyaltyInfo.saldo_pontos) {
                          toast.error(`Pontos insuficientes. Esse prêmio exige ${recomp.custo_pontos} pontos.`);
                          return;
                        }
                        setRecompensaSelecionada(recomp || null);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-border rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-violet-600 cursor-pointer"
                    >
                      <option value="">[Nenhum prêmio selecionado]</option>
                      {recompensas.map((r) => (
                        <option 
                          key={r.id} 
                          value={r.id} 
                          disabled={r.custo_pontos > loyaltyInfo.saldo_pontos}
                        >
                          {r.nome} ({r.custo_pontos} pts) {r.custo_pontos > loyaltyInfo.saldo_pontos ? "🔒" : ""}
                        </option>
                      ))}
                    </select>

                    {recompensaSelecionada && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 animate-slide-down">
                        <Check className="w-3 h-3" />
                        <span>Desconto de {formatBRL(descontoRecompensa)} aplicado!</span>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* SELETOR DE TIPO DE DOCUMENTO COMERCIAL */}
          <div className="space-y-2.5 select-none bg-slate-50/50 p-4 border border-border/50 rounded-2xl">
            <label className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">
              📄 Tipo de Documento Comercial / Fiscal
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "comprovante", label: "Comprovante" },
                { id: "recibo", label: "Recibo" },
                { id: "pedido", label: "Pedido" },
                { id: "orcamento", label: "Orçamento" },
              ].map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setTipoDocumento(doc.id as any)}
                  className={cn(
                    "py-2 px-3 border rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center",
                    tipoDocumento === doc.id
                      ? "bg-primary border-primary text-white shadow-md shadow-primary/10"
                      : "bg-white border-border hover:bg-slate-100 text-slate-700"
                  )}
                >
                  {doc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 select-none">
            {[
              { id: "dinheiro", label: "Dinheiro", icon: <Coins className="w-4 h-4" /> },
              { id: "pix", label: "Pix", icon: <Wallet className="w-4 h-4" /> },
              { id: "cartao_credito", label: "C. Crédito", icon: <CreditCard className="w-4 h-4" /> },
              { id: "cartao_debito", label: "C. Débito", icon: <CreditCard className="w-4 h-4" /> },
              { id: "multiplo", label: "Múltiplo", icon: <RefreshCw className="w-4 h-4" /> },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={(e) => { e.currentTarget.blur(); setMethod(m.id as any); }}
                className={cn(
                  "flex flex-col items-center justify-center py-3.5 border rounded-xl gap-2 cursor-pointer transition-all active:scale-[0.98]",
                  {
                    "bg-primary border-primary text-white shadow-md shadow-primary/10":
                      method === m.id,
                    "bg-slate-50 border-border/80 text-muted-foreground hover:bg-slate-100 hover:text-foreground":
                      method !== m.id,
                  }
                )}
              >
                {m.icon}
                <span className="text-[10px] font-extrabold">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Values Entry Panel */}
          {method !== "multiplo" ? (
            /* Simple Payment Method Panel */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Valor Pago pelo Cliente
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                    R$
                  </span>
                  <input
                    ref={inputValorRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-input text-foreground border border-border text-lg font-black rounded-xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="grid grid-cols-4 gap-2 text-xs font-bold select-none">
                {[5, 10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleAddQuickCash(val);
                    }}
                    className="py-2.5 bg-slate-100 border border-border/60 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-all active:scale-[0.97]"
                  >
                    +{val} BRL
                  </button>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setInputValue(totalComFidelidade.toFixed(2));
                  }}
                  className="col-span-3 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 rounded-lg cursor-pointer transition-all active:scale-[0.97]"
                >
                  Valor Exato
                </button>
              </div>
            </div>
          ) : (
            /* Multiple Payment Methods Panel */
            <div className="space-y-3.5 select-none bg-slate-50/40 p-4 border border-border/60 rounded-xl">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-2">
                Divisão de Valores
              </h4>

              {[
                { id: "dinheiro", label: "Dinheiro", val: dinheiroVal, setVal: setDinheiroVal },
                { id: "pix", label: "Pix / Transferência", val: pixVal, setVal: setPixVal },
                { id: "credito", label: "Cartão de Crédito", val: creditoVal, setVal: setCreditoVal },
                { id: "debito", label: "Cartão de Débito", val: debitoVal, setVal: setDebitoVal },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-3 justify-between">
                  <span className="text-xs font-bold text-slate-700 w-28">{item.label}</span>
                  <div className="relative flex-1 max-w-[150px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.val || ""}
                      onChange={(e) => item.setVal(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-input text-foreground border border-border text-xs font-bold rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      const diff = Math.max(0, totalComFidelidade - (totalPaid - item.val));
                      item.setVal(diff);
                    }}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Restante
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Section: Summary & Touch Keypad */}
        <div className="w-full md:w-[290px] bg-slate-50 dark:bg-slate-950/40 border-t md:border-t-0 md:border-l border-border p-6 flex flex-col justify-between space-y-5">
          {/* Sale Summary Stats */}
          <div className="space-y-3.5">
            <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-xl p-4 shadow-sm text-center space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Total Líquido
              </span>
              <p className="text-xl font-black text-slate-900 dark:text-slate-50">
                {formatBRL(total)}
              </p>

              {(descontoRecompensa > 0 || (usarCashback && cashbackUsado > 0)) && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 space-y-1 text-[10px] text-left text-muted-foreground font-semibold">
                  {descontoRecompensa > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Desconto Recompensa</span>
                      <span>-{formatBRL(descontoRecompensa)}</span>
                    </div>
                  )}
                  {usarCashback && cashbackUsado > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Abate Cashback</span>
                      <span>-{formatBRL(cashbackUsado)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-violet-100 dark:border-violet-950 pt-2.5 mt-1.5">
                <span className="text-[9px] uppercase font-black tracking-wider text-violet-600 dark:text-violet-400 block">
                  Valor Final a Cobrar
                </span>
                <p className="text-2xl font-black text-violet-700 dark:text-violet-300">
                  {formatBRL(totalComFidelidade)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Recebido</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatBRL(totalPaid)}</span>
              </div>

              {remaining > 0 ? (
                <div className="flex justify-between text-destructive animate-pulse">
                  <span>Falta Pagar</span>
                  <span className="font-black">{formatBRL(remaining)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-success dark:text-emerald-400">
                  <span>Troco</span>
                  <span className="font-black text-sm">{formatBRL(troco)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Virtual Touch Keypad */}
          {method !== "multiplo" && (
            <div className="hidden md:grid grid-cols-3 gap-1.5 select-none my-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "C"].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleKeypadPress(key);
                  }}
                  className="py-2.5 bg-white border border-border/60 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-black rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            disabled={!isFinalizeEnabled}
            onClick={(e) => {
              e.currentTarget.blur();
              handleSubmit();
            }}
            className="w-full py-3.5 bg-primary text-white font-extrabold text-sm rounded-xl hover:bg-primary-hover active:scale-[0.99] transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? "Processando..." : "Confirmar Venda (F2)"}
          </button>
        </div>
      </div>
    </div>
  );
};
