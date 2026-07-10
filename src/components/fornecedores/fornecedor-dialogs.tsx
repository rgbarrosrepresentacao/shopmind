import * as React from "react";
import type { Fornecedor } from "@/lib/types/compras";
import { createFornecedorCompleto, updateFornecedorCompleto } from "@/lib/actions/fornecedores";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { X, Loader2, Lock } from "lucide-react";

interface FornecedorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fornecedor?: Fornecedor | null;
  userTipo?: string;
}

export function FornecedorDialog({
  isOpen,
  onClose,
  onSuccess,
  fornecedor,
  userTipo = "caixa",
}: FornecedorDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const isEdit = !!fornecedor;
  const isEstoquista = userTipo === "estoquista";

  const [formData, setFormData] = React.useState({
    nome: "",
    cnpj: "",
    contato: "",
    telefone: "",
    whatsapp: "",
    email: "",
    observacao: "",
  });

  React.useEffect(() => {
    if (fornecedor && isOpen) {
      setFormData({
        nome: fornecedor.nome || "",
        cnpj: fornecedor.cnpj || "",
        contato: fornecedor.contato || "",
        telefone: fornecedor.telefone || "",
        whatsapp: fornecedor.whatsapp || "",
        email: fornecedor.email || "",
        observacao: fornecedor.observacao || "",
      });
    } else if (isOpen) {
      setFormData({
        nome: "",
        cnpj: "",
        contato: "",
        telefone: "",
        whatsapp: "",
        email: "",
        observacao: "",
      });
    }
  }, [fornecedor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("O nome do fornecedor é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit && fornecedor) {
        // Preparar patch respeitando regras do estoquista
        const patch: Partial<Fornecedor> = {
          nome: formData.nome,
          contato: formData.contato,
          telefone: formData.telefone,
          whatsapp: formData.whatsapp,
          email: formData.email,
          observacao: formData.observacao,
        };
        
        // CNPJ é dado fiscal crítico, apenas dono e gerente podem alterar
        if (!isEstoquista) {
          patch.cnpj = formData.cnpj;
        }

        const res = await updateFornecedorCompleto(fornecedor.id, patch);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Fornecedor atualizado com sucesso!");
          onSuccess();
          onClose();
        }
      } else {
        // Criar fornecedor
        const res = await createFornecedorCompleto(formData);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Fornecedor cadastrado com sucesso!");
          onSuccess();
          onClose();
        }
      }
    } catch {
      toast.error("Erro ao processar a operação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border/85 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-foreground">
              {isEdit ? "Editar Fornecedor" : "Cadastrar Fornecedor"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {isEdit ? "Atualize dados de contato e informações comerciais." : "Registre um novo parceiro de suprimentos."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Nome */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                Razão Social / Nome Fantasia *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Distribuidora Ruby Rose Ltda"
                required
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* CNPJ */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider flex items-center gap-1">
                CNPJ {isEdit && isEstoquista && <Lock className="w-2.5 h-2.5 text-amber-500" />}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={e => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  disabled={isEdit && isEstoquista}
                  className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {isEdit && isEstoquista && (
                  <span className="absolute right-3.5 text-[8px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                    Bloqueado
                  </span>
                )}
              </div>
              {isEdit && isEstoquista && (
                <p className="text-[8px] text-amber-600/80 font-bold mt-1">
                  Estoquistas não podem alterar dados fiscais.
                </p>
              )}
            </div>

            {/* Contato */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                Pessoa de Contato / Vendedor
              </label>
              <input
                type="text"
                value={formData.contato}
                onChange={e => setFormData(prev => ({ ...prev, contato: e.target.value }))}
                placeholder="Ex: Carlos Souza"
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                Telefone Comercial
              </label>
              <input
                type="text"
                value={formData.telefone}
                onChange={e => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="Ex: (11) 3300-0000"
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                WhatsApp Vendas
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="Ex: (11) 99999-0000"
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* Email */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                Email Corporativo
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="vendas@fornecedor.com"
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* Observações */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                Observações e Condições Comerciais
              </label>
              <textarea
                value={formData.observacao}
                onChange={e => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                placeholder="Prazos recorrentes, políticas de frete FOB/CIF, observações de entrega..."
                rows={3}
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20 resize-none"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={loading}
              className="shadow-lg shadow-primary/20 rounded-xl font-bold px-5 py-2.5 text-xs"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              {isEdit ? "Salvar Alterações" : "Cadastrar Fornecedor"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
