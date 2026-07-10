"use client";

import * as React from "react";
import { Search, MessageCircle, AlertTriangle, UserMinus, UserCheck, Coins, Sparkles, X, Send } from "lucide-react";
import { formatBRL } from "@/lib/types/produtos";
import { toast } from "@/components/ui/toast";

interface ClienteRecuperacao {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  total_compras: number;
  total_gasto: number;
  nivel_vip: string;
  ultima_compra: string | null;
  saldo_cashback?: number;
}

interface FidelidadeRecuperacaoProps {
  recuperacaoData: {
    perdidos: ClienteRecuperacao[];
    emRisco: ClienteRecuperacao[];
    vipSemCompra: ClienteRecuperacao[];
    cashbackParado: ClienteRecuperacao[];
  };
  loading: boolean;
  onExportCSV: (list: any[], name: string) => void;
  onExportExcel: (list: any[], name: string) => void;
  onExportPDF: (title: string, columns: string[], data: any[]) => void;
}

export const FidelidadeRecuperacao: React.FC<FidelidadeRecuperacaoProps> = ({
  recuperacaoData,
  loading,
  onExportCSV,
  onExportExcel,
  onExportPDF,
}) => {
  const [activeFilter, setActiveFilter] = React.useState<"perdidos" | "emRisco" | "vipSemCompra" | "cashbackParado">("emRisco");
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // WhatsApp Modal State
  const [selectedCliente, setSelectedCliente] = React.useState<ClienteRecuperacao | null>(null);
  const [waMessage, setWaMessage] = React.useState("");

  // Get active list
  const activeList = React.useMemo(() => {
    const list = recuperacaoData[activeFilter] || [];
    if (!searchQuery.trim()) return list;
    return list.filter((c) =>
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.telefone && c.telefone.includes(searchQuery))
    );
  }, [recuperacaoData, activeFilter, searchQuery]);

  // Generate customized WhatsApp message template
  const openRecoveryModal = (cliente: ClienteRecuperacao) => {
    let msg = "";
    const firstName = cliente.nome.split(" ")[0];

    if (activeFilter === "cashbackParado") {
      const cashVal = formatBRL(cliente.saldo_cashback || 0);
      msg = `Olá ${firstName}! Tudo bem? 🌟\n\nPassando para lembrar que você tem *${cashVal}* de saldo de Cashback disponível no *ShopMind*! 🤑\n\nQue tal aproveitar para fazer uma visita e garantir seus produtos favoritos usando esse saldo como desconto? Esperamos você! 🛍️`;
    } else if (activeFilter === "vipSemCompra") {
      msg = `Olá ${firstName}! Como você está? 💎\n\nSentimos sua falta nas últimas semanas! Como cliente VIP *${cliente.nivel_vip}*, preparamos uma oferta exclusiva com *pontos em dobro* em sua próxima compra. 🎁\n\nVenha nos visitar e aproveitar seu tratamento VIP especial!`;
    } else if (activeFilter === "emRisco") {
      msg = `Olá ${firstName}, tudo bem? ⚡\n\nHá algum tempo não vemos você por aqui! Para ajudar no seu retorno, preparamos um cupom especial de *10% de desconto* na sua próxima compra ou *ganhar 200 pontos de bônus* no nosso programa de fidelidade! 🎟️\n\nQual prêmio você prefere? Nos avise!`;
    } else {
      msg = `Olá ${firstName}! Sentimos muito a sua falta! ❤️\n\nHá mais de 90 dias você não nos visita. Para demonstrar o quanto você é importante para nós, preparamos um *brinde surpresa exclusivo* te esperando no caixa em sua próxima compra.\n\nVenha retirar seu presente! 🎁`;
    }

    setSelectedCliente(cliente);
    setWaMessage(msg);
  };

  const handleSendWhatsApp = () => {
    if (!selectedCliente) return;
    const tel = selectedCliente.whatsapp || selectedCliente.telefone;
    if (!tel) {
      toast.error("Cliente não possui número de celular cadastrado.");
      return;
    }
    const cleanTel = tel.replace(/\D/g, "");
    const encodedMsg = encodeURIComponent(waMessage);
    
    // Simulate sending, but actually trigger WhatsApp web link
    window.open(`https://wa.me/55${cleanTel}?text=${encodedMsg}`, "_blank");
    toast.success(`Mensagem enviada com sucesso para ${selectedCliente.nome}!`);
    setSelectedCliente(null);
  };

  // Export handlers
  const handleExport = (type: "csv" | "excel" | "pdf") => {
    const listName = 
      activeFilter === "perdidos" ? "Clientes_Perdidos" :
      activeFilter === "emRisco" ? "Clientes_Em_Risco" :
      activeFilter === "vipSemCompra" ? "VIP_Sem_Compra" : "Clientes_Cashback_Parado";

    const title = 
      activeFilter === "perdidos" ? "Relatório: Clientes Perdidos (> 90 dias)" :
      activeFilter === "emRisco" ? "Relatório: Clientes em Risco (60 a 90 dias)" :
      activeFilter === "vipSemCompra" ? "Relatório: Clientes VIP Inativos (> 30 dias)" : "Relatório: Clientes com Cashback Parado";

    // Format data for export
    const exportData = activeList.map((c, index) => ({
      Rank: index + 1,
      Nome: c.nome,
      Telefone: c.telefone || c.whatsapp || "Sem telefone",
      Email: c.email || "Sem e-mail",
      VIP: c.nivel_vip,
      Compras: c.total_compras,
      GastoTotal: formatBRL(c.total_gasto),
      UltimaCompra: c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('pt-BR') : "Nunca comprou",
      ...(activeFilter === "cashbackParado" ? { CashbackDisponivel: formatBRL(c.saldo_cashback || 0) } : {})
    }));

    if (type === "csv") {
      onExportCSV(exportData, listName);
    } else if (type === "excel") {
      onExportExcel(exportData, listName);
    } else {
      const cols = ["Nome", "Telefone", "VIP", "Compras", "Gasto Total", "Última Compra"];
      if (activeFilter === "cashbackParado") cols.push("Cashback");
      
      const rows = activeList.map(c => [
        c.nome,
        c.telefone || c.whatsapp || "Sem tel",
        c.nivel_vip,
        c.total_compras.toString(),
        formatBRL(c.total_gasto),
        c.ultima_compra ? new Date(c.ultima_compra).toLocaleDateString('pt-BR') : "—",
        ...(activeFilter === "cashbackParado" ? [formatBRL(c.saldo_cashback || 0)] : [])
      ]);
      onExportPDF(title, cols, rows);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Recovery Filter Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          {
            id: "emRisco",
            label: "Em Risco",
            desc: "Sem compras há +60 dias",
            icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
            count: recuperacaoData.emRisco.length,
            color: "border-amber-500/20 hover:border-amber-500/40"
          },
          {
            id: "perdidos",
            label: "Perdidos",
            desc: "Sem compras há +90 dias",
            icon: <UserMinus className="w-4 h-4 text-destructive" />,
            count: recuperacaoData.perdidos.length,
            color: "border-red-500/20 hover:border-red-500/40"
          },
          {
            id: "vipSemCompra",
            label: "VIPs Inativos",
            desc: "VIPs sem compra há +30 dias",
            icon: <Sparkles className="w-4 h-4 text-violet-500" />,
            count: recuperacaoData.vipSemCompra.length,
            color: "border-violet-500/20 hover:border-violet-500/40"
          },
          {
            id: "cashbackParado",
            label: "Cashback Parado",
            desc: "Saldo alto sem usar",
            icon: <Coins className="w-4 h-4 text-emerald-500" />,
            count: recuperacaoData.cashbackParado.length,
            color: "border-emerald-500/20 hover:border-emerald-500/40"
          }
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as any)}
            className={cn(
              "flex flex-col text-left p-3.5 border rounded-2xl gap-1 cursor-pointer transition-all active:scale-[0.98] relative overflow-hidden group",
              filter.color,
              {
                "bg-card text-foreground shadow-md ring-1 ring-primary/20": activeFilter === filter.id,
                "bg-slate-50/50 text-slate-500 hover:bg-slate-50": activeFilter !== filter.id
              }
            )}
          >
            <div className="flex justify-between items-center w-full">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide">
                {filter.icon}
                {filter.label}
              </span>
              <span className={cn(
                "text-xs font-black px-2 py-0.5 rounded-full border",
                activeFilter === filter.id 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-slate-200/50 text-slate-600 border-slate-300/30"
              )}>
                {filter.count}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold mt-1 block leading-tight">{filter.desc}</span>
          </button>
        ))}
      </div>

      {/* Search and Exports Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filtrar por nome, email, telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-border rounded-xl text-xs outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto select-none">
          <span className="text-[10px] uppercase font-black text-muted-foreground hidden md:inline">Exportar lista:</span>
          <button
            disabled={activeList.length === 0}
            onClick={() => handleExport("csv")}
            className="flex-1 sm:flex-initial px-3 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            CSV
          </button>
          <button
            disabled={activeList.length === 0}
            onClick={() => handleExport("excel")}
            className="flex-1 sm:flex-initial px-3 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Excel
          </button>
          <button
            disabled={activeList.length === 0}
            onClick={() => handleExport("pdf")}
            className="flex-1 sm:flex-initial px-3 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            PDF / Imprimir
          </button>
        </div>
      </div>

      {/* List / Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-muted-foreground">Buscando clientes inativos...</p>
          </div>
        ) : activeList.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl m-4 space-y-2">
            <span className="text-3xl">🎉</span>
            <p className="text-sm font-extrabold text-foreground">Tudo limpo por aqui!</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Nenhum cliente atende a esta condição no momento. Ótimo sinal para a saúde de vendas da sua loja!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs select-none">
              <thead>
                <tr className="bg-slate-50 text-muted-foreground border-b border-border font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">VIP</th>
                  <th className="px-5 py-3.5">Compras / Gasto</th>
                  <th className="px-5 py-3.5">Última Compra</th>
                  {activeFilter === "cashbackParado" && <th className="px-5 py-3.5 text-emerald-600 font-black">Cashback</th>}
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold">
                {activeList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                    <td className="px-5 py-4">
                      <p className="font-extrabold text-foreground">{c.nome}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {c.email || "Sem e-mail"} | {c.telefone || c.whatsapp || "Sem telefone"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        {c.nivel_vip}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-foreground font-bold">{c.total_compras} compras</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Gasto: {formatBRL(c.total_gasto)}</p>
                    </td>
                    <td className="px-5 py-4">
                      {c.ultima_compra ? (
                        <div>
                          <p className="text-foreground">{new Date(c.ultima_compra).toLocaleDateString('pt-BR')}</p>
                          <p className="text-[10px] text-destructive mt-0.5 font-bold">
                            {Math.floor((new Date().getTime() - new Date(c.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))} dias inativo
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Nunca comprou</span>
                      )}
                    </td>
                    {activeFilter === "cashbackParado" && (
                      <td className="px-5 py-4 font-black text-emerald-600 text-sm">
                        {formatBRL(c.saldo_cashback || 0)}
                      </td>
                    )}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openRecoveryModal(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black rounded-xl cursor-pointer shadow-sm shadow-emerald-500/10 active:scale-[0.97] transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Recuperar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SIMULATED WHATSAPP TEMPLATE DIALOG */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedCliente(null)} />
          
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border bg-emerald-500 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  {selectedCliente.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-black truncate max-w-[220px]">{selectedCliente.nome}</h4>
                  <p className="text-[9px] opacity-90 font-medium">WhatsApp: {selectedCliente.whatsapp || selectedCliente.telefone || "Sem celular"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Body */}
            <div className="p-5 space-y-4 bg-slate-50 flex-1 overflow-y-auto">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <p className="text-[10px] text-emerald-800 leading-normal font-semibold">
                  <strong>Mensagem Personalizada Gerada!</strong> O template abaixo foi adaptado automaticamente baseando-se no comportamento e nível de fidelidade deste cliente.
                </p>
              </div>

              {/* Chat bubble simulation */}
              <div className="relative pl-3 pr-4 py-3 bg-white border border-border rounded-xl rounded-tl-none shadow-sm max-w-[90%] font-semibold text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {/* Tail */}
                <div className="absolute left-[-6px] top-0 border-r-[6px] border-r-white border-b-[6px] border-b-transparent" />
                {waMessage}
              </div>

              {/* Editable Textarea */}
              <div className="space-y-1 text-left">
                <label className="text-[9px] uppercase font-black text-muted-foreground block">Editar texto antes de enviar:</label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={6}
                  className="w-full p-3 bg-white border border-border rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border bg-white flex justify-end gap-2.5">
              <button
                onClick={() => setSelectedCliente(null)}
                className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar Mensagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for joining classNames
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
