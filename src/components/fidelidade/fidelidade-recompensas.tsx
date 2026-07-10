"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Tag, Gift, DollarSign, Award, X, Check, Eye, Coins } from "lucide-react";
import { salvarRecompensaFidelidade, excluirRecompensaFidelidade } from "@/lib/actions/fidelidade";
import { formatBRL } from "@/lib/types/produtos";
import { toast } from "@/components/ui/toast";

interface Recompensa {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "desconto" | "produto" | "brinde" | "cashback" | "cupom";
  custo_pontos: number;
  valor_desconto: number;
  status: "ativo" | "inativo";
}

interface FidelidadeRecompensasProps {
  recompensas: Recompensa[];
  loading: boolean;
  userTipo: string;
  onRefresh: () => void;
}

export const FidelidadeRecompensas: React.FC<FidelidadeRecompensasProps> = ({
  recompensas,
  loading,
  userTipo,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formLoading, setFormLoading] = React.useState(false);
  const [selectedRecomp, setSelectedRecomp] = React.useState<Recompensa | null>(null);

  // Form State
  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [tipo, setTipo] = React.useState<Recompensa["tipo"]>("desconto");
  const [custoPontos, setCustoPontos] = React.useState(100);
  const [valorDesconto, setValorDesconto] = React.useState(10);
  const [status, setStatus] = React.useState<Recompensa["status"]>("ativo");

  const isReadOnly = userTipo === "estoquista";

  // Open modal for new reward
  const handleOpenNew = () => {
    if (isReadOnly) return;
    setSelectedRecomp(null);
    setNome("");
    setDescricao("");
    setTipo("desconto");
    setCustoPontos(100);
    setValorDesconto(10);
    setStatus("ativo");
    setIsOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (recomp: Recompensa) => {
    setSelectedRecomp(recomp);
    setNome(recomp.nome);
    setDescricao(recomp.descricao || "");
    setTipo(recomp.tipo);
    setCustoPontos(recomp.custo_pontos);
    setValorDesconto(recomp.valor_desconto);
    setStatus(recomp.status);
    setIsOpen(true);
  };

  // Save reward
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!nome.trim() || custoPontos <= 0) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        id: selectedRecomp?.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        tipo,
        custo_pontos: custoPontos,
        valor_desconto: tipo === "desconto" || tipo === "cupom" || tipo === "cashback" ? valorDesconto : 0,
        status,
      };

      const res = await salvarRecompensaFidelidade(payload);
      if (res.success) {
        toast.success(selectedRecomp ? "Recompensa atualizada!" : "Recompensa adicionada com sucesso!");
        setIsOpen(false);
        onRefresh();
      } else {
        toast.error(`Erro ao salvar: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete reward
  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("Deseja mesmo excluir esta recompensa? Esta ação é irreversível.")) return;

    try {
      const res = await excluirRecompensaFidelidade(id);
      if (res.success) {
        toast.success("Recompensa excluída!");
        onRefresh();
      } else {
        toast.error(`Erro ao excluir: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Type translation icon
  const getTipoIcon = (t: Recompensa["tipo"]) => {
    switch (t) {
      case "desconto":
        return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case "cupom":
        return <Tag className="w-5 h-5 text-indigo-600" />;
      case "brinde":
        return <Gift className="w-5 h-5 text-pink-600" />;
      case "cashback":
        return <Coins className="w-5 h-5 text-amber-600" />;
      default:
        return <Award className="w-5 h-5 text-violet-600" />;
    }
  };

  const getTipoLabel = (t: Recompensa["tipo"]) => {
    switch (t) {
      case "desconto":
        return "Abate de Desconto";
      case "cupom":
        return "Cupom de Desconto";
      case "brinde":
        return "Brinde Físico";
      case "cashback":
        return "Crédito Cashback";
      default:
        return "Produto Específico";
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Header section with add button */}
      <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div>
          <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
            Catálogo de Prêmios & Recompensas
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Cadastre os prêmios que os clientes podem resgatar utilizando seus pontos no caixa.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-md shadow-primary/15 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Adicionar Recompensa
          </button>
        )}
      </div>

      {/* Rewards Catalog Grid */}
      {loading ? (
        <div className="text-center py-12 space-y-3 bg-card border border-border rounded-2xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground">Carregando catálogo...</p>
        </div>
      ) : recompensas.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl space-y-2">
          <span className="text-3xl">🎁</span>
          <p className="text-sm font-extrabold text-foreground">Catálogo de prêmios vazio</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Clique no botão acima para adicionar seu primeiro prêmio (ex: Desconto de R$ 10 por 100 pontos).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {recompensas.map((recomp) => (
            <div
              key={recomp.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className={cn(
                    "text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border",
                    recomp.status === "ativo" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {recomp.status}
                  </span>
                  <span className="text-[10px] font-extrabold text-violet-600 bg-violet-600/10 border border-violet-600/20 px-2.5 py-0.5 rounded-full">
                    {recomp.custo_pontos} pontos
                  </span>
                </div>

                <div className="flex gap-3 items-start pt-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-border/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {getTipoIcon(recomp.tipo)}
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-sm font-black text-foreground group-hover:text-primary transition-colors leading-tight">
                      {recomp.nome}
                    </h5>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      Tipo: {getTipoLabel(recomp.tipo)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-normal font-medium pl-13">
                  {recomp.descricao || "Sem descrição cadastrada."}
                </p>

                {(recomp.tipo === "desconto" || recomp.tipo === "cupom" || recomp.tipo === "cashback") && (
                  <div className="pl-13 pt-1">
                    <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      Valor: {formatBRL(recomp.valor_desconto)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions row */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5 mt-4">
                {isReadOnly ? (
                  <button
                    onClick={() => handleOpenEdit(recomp)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenEdit(recomp)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(recomp.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-border/80 rounded-lg text-[11px] font-bold text-destructive hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DIALOG MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <form
            onSubmit={handleSave}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-slate-50 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                  <Gift className="w-4 h-4 text-primary" />
                  {isReadOnly ? "Visualizar Recompensa" : selectedRecomp ? "Editar Recompensa" : "Nova Recompensa"}
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Configure os custos e prêmios do resgate.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-left">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Nome do Prêmio *</label>
                <input
                  type="text"
                  required
                  disabled={isReadOnly}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: R$ 20 de Desconto em Compras"
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-60"
                />
              </div>

              {/* Descricao */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</label>
                <textarea
                  value={descricao}
                  disabled={isReadOnly}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Instruções de resgate (Ex: Válido para compras acima de R$ 50)..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-60"
                />
              </div>

              {/* Tipo e Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Prêmio</label>
                  <select
                    value={tipo}
                    disabled={isReadOnly}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer disabled:opacity-60"
                  >
                    <option value="desconto">Abate de Desconto</option>
                    <option value="cupom">Cupom Promocional</option>
                    <option value="brinde">Brinde Físico</option>
                    <option value="produto">Produto Específico</option>
                    <option value="cashback">Crédito Cashback</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Status</label>
                  <select
                    value={status}
                    disabled={isReadOnly}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer disabled:opacity-60"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Custo em Pontos e Valor de Desconto Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Custo em Pontos *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={isReadOnly}
                    value={custoPontos}
                    onChange={(e) => setCustoPontos(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                  />
                </div>

                {(tipo === "desconto" || tipo === "cupom" || tipo === "cashback") && (
                  <div className="space-y-1 animate-slide-down">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Valor em Dinheiro (BRL)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isReadOnly}
                        value={valorDesconto}
                        onChange={(e) => setValorDesconto(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {isReadOnly ? "Fechar" : "Cancelar"}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-primary/10 active:scale-[0.98] transition-all flex items-center gap-1"
                >
                  {formLoading ? "Salvando..." : <><Check className="w-4 h-4" /> Salvar Recompensa</>}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// Helper for joining classNames
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
