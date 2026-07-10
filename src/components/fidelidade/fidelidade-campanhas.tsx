"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Calendar, AlertCircle, Sparkles, X, Check, Eye } from "lucide-react";
import { salvarCampanhaFidelidade, excluirCampanhaFidelidade } from "@/lib/actions/fidelidade";
import { toast } from "@/components/ui/toast";

interface Campanha {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "dobro_pontos" | "cashback_extra" | "cliente_aniversario" | "cliente_vip" | "cliente_inativo" | "produto_especifico" | "categoria_especifica";
  inicio: string;
  fim: string;
  status: "ativo" | "inativo" | "rascunho";
  regras: {
    multiplicador?: number;
    cashback_adicional?: number;
    produtos_ids?: string[];
    categorias_ids?: string[];
  };
}

interface FidelidadeCampanhasProps {
  campanhas: Campanha[];
  loading: boolean;
  userTipo: string;
  onRefresh: () => void;
}

export const FidelidadeCampanhas: React.FC<FidelidadeCampanhasProps> = ({
  campanhas,
  loading,
  userTipo,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formLoading, setFormLoading] = React.useState(false);
  const [selectedCamp, setSelectedCamp] = React.useState<Campanha | null>(null);

  // Form State
  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [tipo, setTipo] = React.useState<Campanha["tipo"]>("dobro_pontos");
  const [inicio, setInicio] = React.useState("");
  const [fim, setFim] = React.useState("");
  const [status, setStatus] = React.useState<Campanha["status"]>("rascunho");
  
  // Regras
  const [multiplicador, setMultiplicador] = React.useState(2);
  const [cashbackAdicional, setCashbackAdicional] = React.useState(5);

  const isReadOnly = userTipo === "estoquista";

  // Open modal for new campaign
  const handleOpenNew = () => {
    if (isReadOnly) return;
    setSelectedCamp(null);
    setNome("");
    setDescricao("");
    setTipo("dobro_pontos");
    
    // Set default dates (today to +30 days)
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextMonthStr = nextMonth.toISOString().split("T")[0];

    setInicio(today);
    setFim(nextMonthStr);
    setStatus("rascunho");
    setMultiplicador(2);
    setCashbackAdicional(5);
    setIsOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (camp: Campanha) => {
    setSelectedCamp(camp);
    setNome(camp.nome);
    setDescricao(camp.descricao || "");
    setTipo(camp.tipo);
    setInicio(camp.inicio);
    setFim(camp.fim);
    setStatus(camp.status);
    setMultiplicador(camp.regras?.multiplicador || 2);
    setCashbackAdicional(camp.regras?.cashback_adicional || 5);
    setIsOpen(true);
  };

  // Save campaign
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!nome.trim() || !inicio || !fim) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (new Date(inicio) > new Date(fim)) {
      toast.error("A data de início não pode ser posterior à data de término.");
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        id: selectedCamp?.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        tipo,
        inicio,
        fim,
        status,
        regras: {
          ...(tipo === "dobro_pontos" ? { multiplicador } : {}),
          ...(tipo === "cashback_extra" ? { cashback_adicional: cashbackAdicional } : {}),
        }
      };

      const res = await salvarCampanhaFidelidade(payload);
      if (res.success) {
        toast.success(selectedCamp ? "Campanha atualizada!" : "Campanha criada com sucesso!");
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

  // Delete campaign
  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("Deseja mesmo excluir esta campanha? Esta ação é irreversível.")) return;

    try {
      const res = await excluirCampanhaFidelidade(id);
      if (res.success) {
        toast.success("Campanha excluída!");
        onRefresh();
      } else {
        toast.error(`Erro ao excluir: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Status mapping badge style
  const getStatusBadge = (s: Campanha["status"]) => {
    switch (s) {
      case "ativo":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "inativo":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
  };

  // Type translation helper
  const getTipoLabel = (t: Campanha["tipo"]) => {
    switch (t) {
      case "dobro_pontos":
        return "⚡ Pontos em Dobro";
      case "cashback_extra":
        return "💰 Cashback Extra";
      case "cliente_aniversario":
        return "🎂 Aniversariantes";
      case "cliente_vip":
        return "💎 Faixa VIP Especial";
      case "cliente_inativo":
        return "🔄 Reativação de Inativos";
      default:
        return "🏷️ Promoção Específica";
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Header section with add button */}
      <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div>
          <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
            Campanhas de Fidelização
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Gerencie campanhas promocionais de acúmulo de pontos ou cashback especial.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-md shadow-primary/15 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Nova Campanha
          </button>
        )}
      </div>

      {/* Campaigns Listing Grid */}
      {loading ? (
        <div className="text-center py-12 space-y-3 bg-card border border-border rounded-2xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground">Carregando campanhas...</p>
        </div>
      ) : campanhas.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl space-y-2">
          <span className="text-3xl">🎟️</span>
          <p className="text-sm font-extrabold text-foreground">Nenhuma campanha cadastrada</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Clique no botão acima para criar sua primeira campanha promocional de fidelidade na loja.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campanhas.map((camp) => (
            <div
              key={camp.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className={cn("text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border", getStatusBadge(camp.status))}>
                    {camp.status}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500">
                    {getTipoLabel(camp.tipo)}
                  </span>
                </div>

                <div className="space-y-1">
                  <h5 className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                    {camp.nome}
                  </h5>
                  <p className="text-xs text-muted-foreground leading-normal font-medium">
                    {camp.descricao || "Sem descrição informada."}
                  </p>
                </div>

                {/* Details / Rules summary */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 text-[10px] font-semibold text-slate-600 space-y-1 leading-normal">
                  <div className="flex justify-between">
                    <span>Período:</span>
                    <span className="text-foreground font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date(camp.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(camp.fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {camp.tipo === "dobro_pontos" && (
                    <div className="flex justify-between text-violet-700">
                      <span>Regra de Pontos:</span>
                      <span className="font-black">Multiplicador {camp.regras?.multiplicador || 2}x</span>
                    </div>
                  )}
                  {camp.tipo === "cashback_extra" && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Regra de Cashback:</span>
                      <span className="font-black">+{camp.regras?.cashback_adicional || 5}% Extra</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5 mt-4">
                {isReadOnly ? (
                  <button
                    onClick={() => handleOpenEdit(camp)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenEdit(camp)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(camp.id)}
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
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {isReadOnly ? "Visualizar Campanha" : selectedCamp ? "Editar Campanha" : "Nova Campanha"}
                </h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Defina as datas e regras de incentivo.</p>
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
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Nome da Campanha *</label>
                <input
                  type="text"
                  required
                  disabled={isReadOnly}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Natal com Dobro de Pontos"
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
                  placeholder="Explique a campanha de forma amigável..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-60"
                />
              </div>

              {/* Tipo e Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Campanha</label>
                  <select
                    value={tipo}
                    disabled={isReadOnly}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-all cursor-pointer disabled:opacity-60"
                  >
                    <option value="dobro_pontos">Pontos em Dobro</option>
                    <option value="cashback_extra">Cashback Extra</option>
                    <option value="cliente_aniversario">Aniversário do Cliente</option>
                    <option value="cliente_vip">Faixa VIP Especial</option>
                    <option value="cliente_inativo">Reativação de Inativos</option>
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
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Regras Dinâmicas baseadas no Tipo */}
              {tipo === "dobro_pontos" && (
                <div className="bg-violet-600/5 border border-violet-600/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-black text-violet-700 block tracking-wide">Multiplicador de Pontos</span>
                  <p className="text-[10px] text-muted-foreground leading-normal font-semibold mb-2">Quantas vezes os pontos serão multiplicados nesta compra.</p>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setMultiplicador(val)}
                        className={cn(
                          "px-4 py-2 border rounded-lg text-xs font-black cursor-pointer active:scale-[0.97] transition-all",
                          {
                            "bg-violet-600 border-violet-600 text-white shadow-sm": multiplicador === val,
                            "bg-white border-border text-slate-600 hover:bg-slate-50": multiplicador !== val
                          }
                        )}
                      >
                        {val}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tipo === "cashback_extra" && (
                <div className="bg-emerald-600/5 border border-emerald-600/10 rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-black text-emerald-700 block tracking-wide">Cashback Adicional</span>
                  <p className="text-[10px] text-muted-foreground leading-normal font-semibold mb-2">Adicionar percentual extra de cashback além da taxa padrão da loja.</p>
                  <div className="relative max-w-[120px]">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled={isReadOnly}
                      value={cashbackAdicional}
                      onChange={(e) => setCashbackAdicional(parseFloat(e.target.value) || 0)}
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {/* Periodo de Vigência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-4 mt-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Data de Início *</label>
                  <input
                    type="date"
                    required
                    disabled={isReadOnly}
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Data de Término *</label>
                  <input
                    type="date"
                    required
                    disabled={isReadOnly}
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-60"
                  />
                </div>
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
                  {formLoading ? "Salvando..." : <><Check className="w-4 h-4" /> Salvar Campanha</>}
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
