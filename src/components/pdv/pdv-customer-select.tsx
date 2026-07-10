"use client";

import * as React from "react";
import type { Cliente } from "@/lib/types/clientes";
import { formatBRL } from "@/lib/types/produtos";
import { Users, X, Sparkles, Gift, Brain, ChevronDown, Check, Coins } from "lucide-react";
import { listClientes } from "@/lib/actions/clientes";
import { cn } from "@/lib/utils/cn";
import { getClienteFidelidadeInfo } from "@/lib/actions/fidelidade";

interface PDVCustomerSelectProps {
  selectedCustomer: Cliente | null;
  onSelectCustomer: (customer: Cliente | null) => void;
}

export const PDVCustomerSelect: React.FC<PDVCustomerSelectProps> = ({
  selectedCustomer,
  onSelectCustomer,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [customers, setCustomers] = React.useState<Cliente[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = React.useState<any>(null);
  const [loadingLoyalty, setLoadingLoyalty] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch loyalty info when customer is selected
  React.useEffect(() => {
    if (selectedCustomer) {
      setLoadingLoyalty(true);
      getClienteFidelidadeInfo(selectedCustomer.id).then((res) => {
        if (res.data) {
          setLoyaltyInfo(res.data);
        }
        setLoadingLoyalty(false);
      });
    } else {
      setLoyaltyInfo(null);
    }
  }, [selectedCustomer]);

  // Fetch customers from server when search term changes
  React.useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await listClientes({
          search: search.trim(),
          status: "ativo",
          page: 1,
          perPage: 6,
        });
        if (res.data) {
          setCustomers(res.data);
        }
      } catch (err) {
        console.error("Erro ao buscar clientes:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      if (isOpen) {
        fetchCustomers();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [search, isOpen]);

  // Compute RFM and recommendation insights based on real loyalty data
  const customerInsight = React.useMemo(() => {
    if (!selectedCustomer) return null;

    // Check birthday
    let isBirthday = false;
    if (selectedCustomer.aniversario) {
      const today = new Date();
      const birth = new Date(selectedCustomer.aniversario);
      isBirthday =
        today.getDate() === birth.getDate() + 1 && // date timezone offset adjustment helper
        today.getMonth() === birth.getMonth();
    }

    const vipLevel = loyaltyInfo?.nivel_vip || "Bronze";
    const points = loyaltyInfo?.saldo_pontos || 0;
    const cashback = loyaltyInfo?.saldo_cashback || 0;

    let classification = `VIP ${vipLevel}`;
    let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
    let recommendation = "Apresentar o programa de fidelidade ShopMind e oferecer novidades.";

    if (vipLevel === "VIP") {
      classification = "👑 VIP Master";
      badgeColor = "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse";
      recommendation = "💎 CLIENTE VIP MASTER! Oferecer atendimento prioritário, 5% de desconto extra e sugerir os produtos mais premium.";
    } else if (vipLevel === "Diamante") {
      classification = "💎 VIP Diamante";
      badgeColor = "bg-purple-500/10 text-purple-600 border-purple-500/20";
      recommendation = "✨ CLIENTE DIAMANTE! Oferecer mimos e sugerir combos exclusivos de alto valor.";
    } else if (vipLevel === "Ouro") {
      classification = "🥇 VIP Ouro";
      badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
      recommendation = "⚡ CLIENTE OURO! Sugerir novos lançamentos de alta margem e informar sobre campanhas ativas.";
    } else if (vipLevel === "Prata") {
      classification = "🥈 VIP Prata";
      badgeColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";
      recommendation = "🌱 CLIENTE PRATA! Incentivar compras adicionais para subir para a faixa Ouro.";
    } else {
      classification = "🥉 VIP Bronze";
      badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
      recommendation = "Oferecer novidades da semana e sugerir combos promocionais no caixa.";
    }

    const spent = loyaltyInfo?.total_gasto || Number(selectedCustomer.total_gasto || 0);
    const comprasCount = loyaltyInfo?.total_compras || Number(selectedCustomer.total_compras || 0);
    const ticketMedio = comprasCount > 0 ? spent / comprasCount : 0;

    return {
      classification,
      badgeColor,
      ticketMedio,
      isBirthday,
      recommendation,
      points,
      cashback,
      ranking: loyaltyInfo?.ranking || 0,
    };
  }, [selectedCustomer, loyaltyInfo]);

  return (
    <div ref={wrapperRef} className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-3 relative select-none">
      
      {/* Label and search box wrapper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-muted-foreground" />
          Identificar Cliente
        </h4>

        {selectedCustomer && (
          <button
            onClick={() => onSelectCustomer(null)}
            className="text-[10px] text-destructive hover:underline font-bold flex items-center gap-0.5 cursor-pointer self-start sm:self-center"
          >
            <X className="w-3 h-3" /> Remover Cliente
          </button>
        )}
      </div>

      {/* Select / Search Box */}
      {!selectedCustomer ? (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 border border-border rounded-xl bg-white text-xs font-medium text-slate-500 hover:border-slate-300 transition-all cursor-pointer"
          >
            <span>Pesquisar cliente (Nome, CPF, Telefone)...</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Search Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-[105%] bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden animate-slide-up flex flex-col max-h-[220px]">
              <div className="p-2 border-b border-border/60">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Digitar nome, CPF ou celular..."
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto p-1 divide-y divide-slate-50">
                {loading ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Buscando clientes...
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Nenhum cliente ativo encontrado
                  </div>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{c.nome}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.cpf ? `CPF: ${c.cpf}` : ""} {c.telefone ? `| Tel: ${c.telefone}` : ""}
                        </p>
                      </div>
                      <Check className="w-3.5 h-3.5 text-primary opacity-0 hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Selected Customer Profile Dashboard (Premium) */
        <div className="bg-slate-50/50 border border-border/60 rounded-xl p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h5 className="text-xs font-black text-foreground">{selectedCustomer.nome}</h5>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedCustomer.email || "Sem e-mail cadastrado"} | {selectedCustomer.telefone || "Sem telefone"}
              </p>
            </div>

            <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded-full border", customerInsight?.badgeColor)}>
              {customerInsight?.classification}
            </span>
          </div>

          {/* CRM metrics grid */}
          <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-slate-100 pt-2.5 my-1">
            <div>
              <p className="text-muted-foreground font-medium">Total Compras</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {selectedCustomer.total_compras || 0} compras
              </p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Ticket Médio</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {formatBRL(customerInsight?.ticketMedio || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Ranking Loja</p>
              <p className="text-xs font-bold text-primary mt-0.5">
                {customerInsight?.ranking ? `#${customerInsight.ranking}` : "---"}
              </p>
            </div>
          </div>

          {/* Real Loyalty & Cashback Info Sub-panel (Premium) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100/60 border border-slate-100 rounded-xl p-2.5 my-1 select-none">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Gift className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Pontos</p>
                <p className="text-xs font-black text-foreground">{customerInsight?.points || 0} pts</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Cashback</p>
                <p className="text-xs font-black text-emerald-600">{formatBRL(customerInsight?.cashback || 0)}</p>
              </div>
            </div>
          </div>

          {/* Birthday Alert */}
          {customerInsight?.isBirthday && (
            <div className="flex items-center gap-2 bg-pink-500/10 text-pink-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-pink-500/20">
              <Gift className="w-4 h-4 text-pink-600 animate-bounce" />
              🎉 ANIVERSARIANTE HOJE! Parabenize e ofereça um brinde!
            </div>
          )}

          {/* IA Cross-sell Insight Box */}
          <div className="bg-gradient-to-br from-violet-600/5 to-indigo-600/5 border border-violet-600/10 rounded-xl p-3 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600/10 text-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Brain className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-black text-violet-600 tracking-wider flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 fill-violet-600" /> IA Recomendações
              </span>
              <p className="text-[10px] font-semibold text-slate-700 leading-normal">
                {customerInsight?.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
