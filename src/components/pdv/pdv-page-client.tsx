"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Product, Category } from "@/lib/types/produtos";
import type { Cliente } from "@/lib/types/clientes";
import type { CartItem, SuspendedSale, PDVCheckout } from "@/lib/types/pdv";
import type { Caixa } from "@/lib/types/caixa";
import { getCurrentCaixa, abrirCaixa, getCaixaShellData } from "@/lib/actions/caixa";
import { criarVendaCompleta, logAuditoriaPDV } from "@/lib/actions/pdv";
import { PDVCatalog } from "./pdv-catalog";
import { PDVCart } from "./pdv-cart";
import { PDVCustomerSelect } from "./pdv-customer-select";
import { PDVPaymentDialog } from "./pdv-payment-dialog";
import { PDVReceiptDialog } from "./pdv-receipt-dialog";
import { PDVSuspendedDialog } from "./pdv-suspended-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Lock, Unlock, HelpCircle, Monitor, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/types/caixa";

interface PDVPageClientProps {
  initialProducts: Product[];
  initialCategories: Category[];
}

export default function PDVPageClient({
  initialProducts,
  initialCategories,
}: PDVPageClientProps) {
  const router = useRouter();
  // Authentication & Caixa states
  const [caixa, setCaixa] = React.useState<Caixa | null>(null);
  const [loadingCaixa, setLoadingCaixa] = React.useState(true);
  const [userRole, setUserRole] = React.useState("caixa");
  const [userName, setUserName] = React.useState("Operador");
  const [aberturaValor, setAberturaValor] = React.useState("100.00");
  const [aberturaObs, setAberturaObs] = React.useState("");

  // PDV Core states
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Cliente | null>(null);
  const [descontoGeral, setDescontoGeral] = React.useState(0);
  const [suspendedSales, setSuspendedSales] = React.useState<SuspendedSale[]>([]);

  // Modal / Overlays states
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [isSuspendedOpen, setIsSuspendedOpen] = React.useState(false);
  
  // Checkout transactional state
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [lastCompletedVenda, setLastCompletedVenda] = React.useState<{
    vendaId: string;
    numero: number;
    created_at: string;
    formaPagamento: string;
    troco: number;
    documentoFiscalId?: string | null;
    documentoFiscalNumero?: string | null;
    documentoFiscalTipo?: string | null;
  } | null>(null);

  // Load active caixa & profile
  React.useEffect(() => {
    checkCaixaStatus();
    loadProfileShell();
    // Load suspended sales from localstorage
    const local = localStorage.getItem("shopmind_pdv_suspended");
    if (local) {
      try {
        setSuspendedSales(JSON.parse(local));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const checkCaixaStatus = async () => {
    setLoadingCaixa(true);
    try {
      const res = await getCurrentCaixa();
      if (res.data) {
        setCaixa(res.data);
      } else {
        setCaixa(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCaixa(false);
    }
  };

  const loadProfileShell = async () => {
    try {
      const res = await getCaixaShellData();
      if (res.data) {
        setUserRole(res.data.profile.tipo);
        setUserName(res.data.profile.nome);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Open Caixa directly in PDV
  const handleQuickOpenCaixa = async () => {
    const val = parseFloat(aberturaValor) || 0;
    if (val < 0) {
      toast.error("O valor de abertura não pode ser negativo.");
      return;
    }

    try {
      const res = await abrirCaixa(val, aberturaObs || "Abertura rápida pelo terminal PDV");
      if (res.error) {
        toast.error(`Erro ao abrir caixa: ${res.error}`);
      } else if (res.data) {
        setCaixa(res.data);
        toast.success("Caixa aberto com sucesso!");
      }
    } catch (e) {
      toast.error("Falha ao abrir caixa. Tente novamente.");
    }
  };

  // Cart operations
  const handleAddProduct = (product: Product) => {
    const estoqueDisponivel = Number(product.estoque_atual) - Number((product as any).estoque_reservado || 0);

    setCart((prev) => {
      const index = prev.findIndex((item) => item.produto.id === product.id);
      if (index > -1) {
        const item = prev[index];
        const newQty = item.quantidade + 1;
        
        if (newQty > estoqueDisponivel) {
          toast.error(`Quantidade limite atingida! O estoque disponível é de ${estoqueDisponivel} un. (o restante está reservado para transferências filiais).`);
          return prev;
        }

        const total = (product.preco_venda * newQty) - item.desconto;
        const updated = [...prev];
        updated[index] = { ...item, quantidade: newQty, total };
        return updated;
      }

      if (1 > estoqueDisponivel) {
        toast.error(`Produto indisponível! Todo o estoque físico desta filial está reservado para transferências filiais.`);
        return prev;
      }

      return [...prev, { produto: product, quantidade: 1, desconto: 0, total: product.preco_venda }];
    });
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.produto.id !== productId) return item;

        const estoqueDisponivel = Number(item.produto.estoque_atual) - Number((item.produto as any).estoque_reservado || 0);
        if (qty > estoqueDisponivel) {
          toast.error(`Quantidade não disponível! Limite máximo para venda é de ${estoqueDisponivel} un. (devido a reservas corporativas).`);
          return item;
        }

        const total = (item.produto.preco_venda * qty) - item.desconto;
        return { ...item, quantidade: qty, total };
      })
    );
  };

  const handleUpdateDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.produto.id !== productId) return item;
        const total = (item.produto.preco_venda * item.quantidade) - discount;
        return { ...item, desconto: discount, total };
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.produto.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setSelectedCustomer(null);
    setDescontoGeral(0);
    toast.success("Carrinho limpo!");
    logAuditoriaPDV("limpar_carrinho", "Operador limpou o carrinho ativo contendo itens.");
  };

  // Suspend Sale
  const handleSuspendSale = () => {
    if (cart.length === 0) return;

    const identifier = window.prompt("Identificador para esta venda (Ex: Mesa 5, Cliente João):", `Comanda #${suspendedSales.length + 1}`);
    if (identifier === null) return; // user cancelled prompt

    const newSuspended: SuspendedSale = {
      id: Math.random().toString(36).substring(2, 9),
      items: [...cart],
      cliente: selectedCustomer,
      descontoGeral,
      created_at: new Date().toISOString(),
      identificador: identifier || `Comanda #${suspendedSales.length + 1}`,
    };

    const updated = [...suspendedSales, newSuspended];
    setSuspendedSales(updated);
    localStorage.setItem("shopmind_pdv_suspended", JSON.stringify(updated));

    // Clear active sale
    setCart([]);
    setSelectedCustomer(null);
    setDescontoGeral(0);
    toast.success("Venda suspensa com sucesso!");
    logAuditoriaPDV("suspender_venda", `Venda suspensa com identificador: ${identifier}`);
  };

  // Resume Sale
  const handleResumeSale = (sale: SuspendedSale) => {
    setCart(sale.items);
    setSelectedCustomer(sale.cliente);
    setDescontoGeral(sale.descontoGeral);
    
    // Remove from suspended
    const updated = suspendedSales.filter((s) => s.id !== sale.id);
    setSuspendedSales(updated);
    localStorage.setItem("shopmind_pdv_suspended", JSON.stringify(updated));
    toast.success(`Venda "${sale.identificador}" retomada!`);
  };

  // Discard Suspended
  const handleDiscardSale = (saleId: string) => {
    if (!window.confirm("Deseja mesmo descartar esta venda suspensa?")) return;
    const updated = suspendedSales.filter((s) => s.id !== saleId);
    setSuspendedSales(updated);
    localStorage.setItem("shopmind_pdv_suspended", JSON.stringify(updated));
    toast.success("Venda suspensa descartada.");
  };

  // Checkout and Confirm Sale
  const handleCheckoutConfirm = async (checkoutData: PDVCheckout) => {
    if (checkoutLoading) return; // Strict double-click guard (idempotency)
    
    setCheckoutLoading(true);
    
    // Temporary client-side faturamento log for audit and verification
    console.log("PDV Checkout LOG (Client):", {
      usuario_id: caixa?.usuario_id,
      loja_id: caixa?.loja_id,
      caixa_id: caixa?.id,
      status_caixa: caixa?.status,
      metodo_pagamento: checkoutData.formaPagamento,
      pagamentos: checkoutData.pagamentos
    });

    try {
      const res = await criarVendaCompleta(checkoutData, cart);
      
      if (res.error) {
        toast.error(`Erro ao finalizar venda: ${res.error}`);
      } else if (res.data) {
        // Success
        setLastCompletedVenda({
          vendaId: res.data.vendaId,
          numero: res.data.numero,
          created_at: res.data.created_at,
          formaPagamento: checkoutData.formaPagamento,
          troco: checkoutData.troco,
          documentoFiscalId: res.data.documentoFiscalId,
          documentoFiscalNumero: res.data.documentoFiscalNumero,
          documentoFiscalTipo: res.data.documentoFiscalTipo,
        });
        setIsPaymentOpen(false);
        setIsReceiptOpen(true);
        toast.success("Venda finalizada com sucesso!");
      }
    } catch (e: any) {
      toast.error(`Falha no checkout: ${e.message}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleStartNewSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDescontoGeral(0);
    setLastCompletedVenda(null);
    setIsReceiptOpen(false);
    
    // Refresh catalog and stock levels on start of a new sale
    router.refresh();
  };

  // Keyboard Shortcuts Listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing in search or textareas, unless using explicit control combinations
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";

      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0 && !isReceiptOpen) {
          setIsPaymentOpen(true);
        }
      } else if (e.key === "F4") {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === "F7") {
        e.preventDefault();
        handleSuspendSale();
      } else if (e.key === "F8") {
        e.preventDefault();
        setIsSuspendedOpen(true);
      } else if (e.key === "Escape") {
        setIsPaymentOpen(false);
        setIsSuspendedOpen(false);
      }

      // Ctrl + Enter shortcut to trigger payment dialog (or submit inside it)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (isPaymentOpen) {
          // Trigger click on submit button inside modal if it exists
          const confirmBtn = document.querySelector("button[disabled='false']") as HTMLButtonElement;
          confirmBtn?.click();
        } else if (cart.length > 0 && !isReceiptOpen) {
          setIsPaymentOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isPaymentOpen, isReceiptOpen, suspendedSales, selectedCustomer, descontoGeral]);

  // Loader if status check is in progress
  if (loadingCaixa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Buscando sessão do terminal...</p>
      </div>
    );
  }

  // SCREEN 1: BLOCKED PDV IF CAIXA IS CLOSED
  if (!caixa) {
    return (
      <div className="space-y-6">
        {/* Header Title */}
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            🖥️ Terminal PDV Premium
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            O terminal PDV exige um caixa operacional aberto para registrar transações.
          </p>
        </div>

        {/* Closed box block card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card text-card-foreground border border-border/80 rounded-2xl p-8 shadow-md flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden min-h-[350px]">
            <div className="absolute inset-0 bg-radial-gradient from-primary/3 to-transparent pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-lg shadow-destructive/5 animate-pulse-glow">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                Acesso Bloqueado
              </span>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight mt-2">
                Nenhum caixa aberto para este terminal
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm leading-normal">
                Insira o saldo em dinheiro disponível na gaveta física (fundo de troco) para abrir o caixa e liberar o PDV.
              </p>
            </div>

            {/* Quick Open Form inline */}
            <div className="w-full max-w-sm bg-slate-50 border border-border rounded-xl p-4 space-y-3">
              <div className="text-left space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Fundo de Troco Inicial
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={aberturaValor}
                    onChange={(e) => setAberturaValor(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-border text-xs font-bold text-foreground rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Troco inicial padrão da gaveta 1"
                  value={aberturaObs}
                  onChange={(e) => setAberturaObs(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-border text-xs text-foreground rounded-lg outline-none"
                />
              </div>

              <Button
                onClick={handleQuickOpenCaixa}
                className="w-full py-2 shadow-lg shadow-primary/10 font-bold"
              >
                <Unlock className="w-4 h-4 mr-2" /> Abrir Caixa & Liberar PDV
              </Button>
            </div>
          </div>

          {/* Quick instructions and warnings */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                💡 Por que isso acontece?
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O ShopMind opera em conformidade com as regras de auditoria e conformidade de varejo real. Todas as vendas devem estar associadas a uma sessão financeira operada por um caixa específico.
              </p>
              <div className="border-t border-slate-100 pt-3 text-[10px] font-bold text-slate-500 space-y-1">
                <p>• RLS/RBAC ativo: Apenas seu operador auditará este caixa.</p>
                <p>• Transação garantida: Vendas dão baixa imediata no estoque.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: ACTIVE IMMERSIVE PDV
  const subtotal = cart.reduce((acc, item) => acc + (item.produto.preco_venda * item.quantidade), 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + item.desconto, 0);
  const totalDiscount = totalItemDiscounts + descontoGeral;
  const netTotal = Math.max(0, subtotal - totalDiscount);

  return (
    <div className="flex flex-col h-full lg:h-[calc(100vh-125px)] lg:max-h-[calc(100vh-125px)] gap-4 select-none lg:overflow-hidden pb-1">
      
      {/* Keyboard hints header line */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-bold tracking-wide gap-2">
        <span className="flex items-center gap-1">
          <Monitor className="w-3.5 h-3.5 text-primary" />
          Terminal PDV Ativo | Caixa: #{caixa.id.substring(0, 5)} | Operador: {userName}
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <span><kbd className="bg-slate-800 border border-slate-700 px-1 rounded text-white mr-1">F2</kbd> Concluir</span>
          <span><kbd className="bg-slate-800 border border-slate-700 px-1 rounded text-white mr-1">F3</kbd> Buscar</span>
          <span><kbd className="bg-slate-800 border border-slate-700 px-1 rounded text-white mr-1">F4</kbd> Limpar</span>
          <span><kbd className="bg-slate-800 border border-slate-700 px-1 rounded text-white mr-1">F7</kbd> Suspender</span>
          <span><kbd className="bg-slate-800 border border-slate-700 px-1 rounded text-white mr-1">F8</kbd> Salvas ({suspendedSales.length})</span>
          <span><kbd className="bg-slate-800 border border-slate-700 px-1 rounded text-white mr-1">CTRL+↵</kbd> Confirmar</span>
        </div>
      </div>

      {/* Main split dashboard (Left: Catalog | Right: Cart/Customer) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-0 lg:overflow-hidden">
        
        {/* Left Area (Catalog): Col-span 7 */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-[500px] lg:min-h-0 lg:overflow-hidden">
          <PDVCatalog
            products={initialProducts}
            categories={initialCategories}
            onAddProduct={handleAddProduct}
          />
        </div>

        {/* Right Area (Cart & Customer details): Col-span 5 */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 h-full min-h-[500px] lg:min-h-0 lg:overflow-hidden">
          {/* Top customer selection widget */}
          <PDVCustomerSelect
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />

          {/* Bottom active cart */}
          <div className="flex-1 min-h-0 lg:overflow-hidden">
            <PDVCart
              items={cart}
              userRole={userRole}
              descontoGeral={descontoGeral}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateDiscount={handleUpdateDiscount}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onSuspendSale={handleSuspendSale}
              onCheckout={() => setIsPaymentOpen(true)}
              onUpdateDescontoGeral={setDescontoGeral}
            />
          </div>
        </div>
      </div>

      {/* OVERLAYS & MODALS */}

      {/* Checkout and payments modal */}
      <PDVPaymentDialog
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={netTotal}
        clienteId={selectedCustomer?.id || null}
        descontoGeral={descontoGeral}
        onConfirm={handleCheckoutConfirm}
        loading={checkoutLoading}
      />

      {/* Thermal emulation receipt printer view */}
      <PDVReceiptDialog
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        vendaInfo={lastCompletedVenda}
        items={cart}
        clienteNome={selectedCustomer?.nome || null}
        descontoGeral={descontoGeral}
        total={netTotal}
        troco={lastCompletedVenda?.troco || 0}
        formaPagamento={lastCompletedVenda?.formaPagamento || ""}
        operadorNome={userName}
        onStartNewSale={handleStartNewSale}
      />

      {/* Suspended/Saved Sales Modal list */}
      <PDVSuspendedDialog
        isOpen={isSuspendedOpen}
        onClose={() => setIsSuspendedOpen(false)}
        suspendedSales={suspendedSales}
        onResumeSale={handleResumeSale}
        onDiscardSale={handleDiscardSale}
      />
    </div>
  );
}
