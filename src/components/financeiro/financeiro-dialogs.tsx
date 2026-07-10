import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { X, Loader2, Calendar, HelpCircle, ArrowRightLeft, Landmark, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { listClientes } from "@/lib/actions/clientes";
import { listFornecedores } from "@/lib/actions/fornecedores";
import { createLancamentoManual, updateLancamento, criarTransferenciaInterna } from "@/lib/actions/financeiro";
import type { FinanceiroTransacao } from "@/lib/types/financeiro";

// Helper para cálculo inteligente de vencimento de meses curtos e dia 31 no simulador
function calcularDataVencimentoRecorrente(baseDateStr: string, index: number): string {
  const baseDate = new Date(baseDateStr + "T12:00:00");
  const expectedDay = baseDate.getDate();
  
  // Verificar se a data base é o último dia do mês base
  const tempLastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const isLastDay = baseDate.getDate() === tempLastDay.getDate();

  const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + index, 1, 12, 0, 0);
  const targetLastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + index + 1, 0);

  if (isLastDay) {
    // Se era o último dia, vai ser sempre o último dia do mês alvo
    return targetLastDay.toISOString().split("T")[0];
  } else {
    // Tentar manter o mesmo dia, senão ajustar para o limite do mês
    const targetDay = Math.min(expectedDay, targetLastDay.getDate());
    const finalDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDay, 12, 0, 0);
    return finalDate.toISOString().split("T")[0];
  }
}

interface FinanceiroDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transacao?: FinanceiroTransacao | null; // se presente, é modo edição
}

const CATEGORIAS_PADRAO = [
  "Fornecedores",
  "Aluguel",
  "Energia",
  "Internet",
  "Marketing",
  "Funcionários",
  "Impostos",
  "Investimentos",
  "Outros",
];

export function FinanceiroDialog({
  isOpen,
  onClose,
  onSuccess,
  transacao,
}: FinanceiroDialogProps) {
  const isEdit = !!transacao;
  const [loading, setLoading] = React.useState(false);
  const [activeFormType, setActiveFormType] = React.useState<"receita" | "despesa" | "transferencia">("receita");

  // Listas para seleção
  const [clientes, setClientes] = React.useState<{ id: string; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = React.useState<{ id: string; nome: string }[]>([]);

  // Dados do formulário
  const [formData, setFormData] = React.useState({
    descricao: "",
    valor: "",
    categoria: CATEGORIAS_PADRAO[0],
    categoriaPersonalizada: "",
    isPersonalizada: false,
    data_vencimento: new Date().toISOString().split("T")[0],
    status: "pendente" as "pendente" | "pago",
    cliente_id: "",
    fornecedor_id: "",
    observacao: "",
    total_parcelas: 1,
    recorrente: false,
  });

  const [idempotencyKey, setIdempotencyKey] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      loadSelectOptions();
      setIdempotencyKey(crypto.randomUUID()); // Gera nova idempotencyKey contra duplo clique
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (transacao && isOpen) {
      setActiveFormType(transacao.tipo === "receita" ? "receita" : "despesa");
      const isCustomCat = !CATEGORIAS_PADRAO.includes(transacao.categoria);
      
      setFormData({
        descricao: transacao.descricao || "",
        valor: String(transacao.valor || ""),
        categoria: isCustomCat ? "Outra" : transacao.categoria,
        categoriaPersonalizada: isCustomCat ? transacao.categoria : "",
        isPersonalizada: isCustomCat,
        data_vencimento: transacao.data_vencimento || "",
        status: transacao.status === "pago" ? "pago" : "pendente",
        cliente_id: transacao.cliente_id || "",
        fornecedor_id: transacao.fornecedor_id || "",
        observacao: transacao.observacao || "",
        total_parcelas: 1, // Não editável no modo edição
        recorrente: false,
      });
    } else if (isOpen) {
      setFormData({
        descricao: "",
        valor: "",
        categoria: CATEGORIAS_PADRAO[0],
        categoriaPersonalizada: "",
        isPersonalizada: false,
        data_vencimento: new Date().toISOString().split("T")[0],
        status: "pendente",
        cliente_id: "",
        fornecedor_id: "",
        observacao: "",
        total_parcelas: 1,
        recorrente: false,
      });
    }
  }, [transacao, isOpen]);

  const loadSelectOptions = async () => {
    try {
      const [resClientes, resFornecedores] = await Promise.all([
        listClientes({ perPage: 100, status: "ativo" }),
        listFornecedores(),
      ]);
      setClientes(resClientes.data || []);
      setFornecedores(resFornecedores.data || []);
    } catch (err) {
      console.error("Erro ao carregar opções para o formulário financeiro:", err);
    }
  };

  // Gerador dinâmico de simulação de parcelas
  const parcelasSimuladas = React.useMemo(() => {
    const total = Number(formData.valor) || 0;
    const numParcelas = formData.recorrente ? 12 : formData.total_parcelas;
    if (total <= 0 || numParcelas <= 1 || activeFormType === "transferencia" || isEdit) return [];

    const valorParcela = formData.recorrente ? total : Number((total / numParcelas).toFixed(2));
    const diferencaCentavos = formData.recorrente ? 0 : Number((total - (valorParcela * numParcelas)).toFixed(2));

    const list = [];
    const mesesCurto = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 1; i <= numParcelas; i++) {
      const vencimentoParcelaStr = calcularDataVencimentoRecorrente(formData.data_vencimento, i - 1);
      const dateObj = new Date(vencimentoParcelaStr + "T12:00:00");

      const valorFinal = i === 1 ? valorParcela + diferencaCentavos : valorParcela;
      const descParcela = formData.recorrente
        ? `Recorrente (${mesesCurto[dateObj.getMonth()]}/${dateObj.getFullYear()})`
        : `${i}/${numParcelas}`;

      list.push({
        numero: descParcela,
        vencimento: dateObj.toLocaleDateString("pt-BR"),
        valor: valorFinal,
      });
    }
    return list;
  }, [formData.valor, formData.total_parcelas, formData.data_vencimento, formData.recorrente, activeFormType, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim()) {
      toast.error("A descrição do lançamento é obrigatória.");
      return;
    }
    const valNumeric = Number(formData.valor);
    if (isNaN(valNumeric) || valNumeric <= 0) {
      toast.error("Insira um valor maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const finalCategoria = formData.isPersonalizada 
        ? (formData.categoriaPersonalizada.trim() || "Outros")
        : formData.categoria;

      if (activeFormType === "transferencia") {
        // Fluxo de Transferência Interna
        const res = await criarTransferenciaInterna({
          descricao: formData.descricao,
          valor: valNumeric,
          data_vencimento: formData.data_vencimento,
          status: formData.status,
          observacao: formData.observacao,
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Transferência interna registrada com sucesso!");
          onSuccess();
          onClose();
        }
      } else if (isEdit && transacao) {
        // Fluxo de Edição
        const patch: Partial<FinanceiroTransacao> = {
          descricao: formData.descricao.trim(),
          valor: valNumeric,
          categoria: finalCategoria,
          data_vencimento: formData.data_vencimento,
          cliente_id: activeFormType === "receita" ? (formData.cliente_id || null) : null,
          fornecedor_id: activeFormType === "despesa" ? (formData.fornecedor_id || null) : null,
          observacao: formData.observacao.trim() || null,
        };

        const res = await updateLancamento(transacao.id, patch);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Lançamento financeiro atualizado!");
          onSuccess();
          onClose();
        }
      } else {
        // Fluxo de Criação
        const res = await createLancamentoManual({
          tipo: activeFormType,
          descricao: formData.descricao.trim(),
          valor: valNumeric,
          categoria: finalCategoria,
          data_vencimento: formData.data_vencimento,
          status: formData.status,
          cliente_id: activeFormType === "receita" ? (formData.cliente_id || null) : null,
          fornecedor_id: activeFormType === "despesa" ? (formData.fornecedor_id || null) : null,
          observacao: formData.observacao.trim() || null,
          total_parcelas: formData.recorrente ? 12 : formData.total_parcelas,
          recorrente: formData.recorrente,
          recorrenciaMeses: 12,
          recorrenciaTipo: "mensal_fixa",
          idempotencyKey: idempotencyKey,
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          const totalCriado = res.data?.length || 1;
          toast.success(
            formData.recorrente
              ? `Série recorrente de 12 lançamentos financeiros criada com sucesso!`
              : totalCriado > 1 
                ? `${totalCriado} parcelas financeiras criadas com sucesso!`
                : "Lançamento financeiro registrado!"
          );
          onSuccess();
          onClose();
        }
      }
    } catch {
      toast.error("Erro ao registrar lançamento financeiro.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border/85 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50 flex-shrink-0">
          <div>
            <h3 className="text-sm font-black text-foreground">
              {isEdit ? "Editar Transação" : "Novo Lançamento Financeiro"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {isEdit ? "Atualize as informações contábeis e de conciliação." : "Registre receitas, despesas ou movimentações internas."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Type Selector (Only on Creation Mode) */}
        {!isEdit && (
          <div className="px-4 pt-3.5 flex-shrink-0">
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { type: "receita", label: "📈 Receita", icon: ArrowUpRight },
                { type: "despesa", label: "📉 Despesa", icon: ArrowDownRight },
                { type: "transferencia", label: "🔄 Transferência", icon: ArrowRightLeft },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setActiveFormType(opt.type as any)}
                    className={cn(
                      "py-2 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer",
                      {
                        "bg-white text-foreground shadow-sm": activeFormType === opt.type,
                        "text-muted-foreground hover:text-foreground hover:bg-white/40": activeFormType !== opt.type,
                      }
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Descrição */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                {activeFormType === "transferencia" ? "Identificador / Descrição da Transferência *" : "Descrição do Lançamento *"}
              </label>
              <input
                type="text"
                value={formData.descricao}
                onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder={
                  activeFormType === "receita" ? "Ex: Mensalidade Contrato Serviços ABC" :
                  activeFormType === "despesa" ? "Ex: Compra de Material de Escritório" :
                  "Ex: Retirada de Caixa para Cofre Central"
                }
                required
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.valor}
                onChange={e => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="0.00"
                required
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {activeFormType === "transferencia" ? "Data da Transferência *" : "Vencimento Inicial *"}
              </label>
              <input
                type="date"
                value={formData.data_vencimento}
                onChange={e => setFormData(prev => ({ ...prev, data_vencimento: e.target.value }))}
                required
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
              />
            </div>

            {/* Categoria (Hidden for Transferência) */}
            {activeFormType !== "transferencia" && (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                    Categoria Financeira
                  </label>
                  <select
                    value={formData.isPersonalizada ? "Outra" : formData.categoria}
                    onChange={e => {
                      const isOther = e.target.value === "Outra";
                      setFormData(prev => ({
                        ...prev,
                        categoria: isOther ? "Outra" : e.target.value,
                        isPersonalizada: isOther,
                      }));
                    }}
                    className="w-full bg-slate-100 border border-transparent rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground cursor-pointer"
                  >
                    {CATEGORIAS_PADRAO.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Outra">Outra (Personalizada)...</option>
                  </select>
                </div>

                {formData.isPersonalizada && (
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                      Nome da Nova Categoria *
                    </label>
                    <input
                      type="text"
                      value={formData.categoriaPersonalizada}
                      onChange={e => setFormData(prev => ({ ...prev, categoriaPersonalizada: e.target.value }))}
                      placeholder="Ex: Assinaturas Cloud"
                      required={formData.isPersonalizada}
                      className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Vínculo de Cliente (Apenas Receitas) */}
            {activeFormType === "receita" && (
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Cliente Associado (Opcional)
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={e => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))}
                  className="w-full bg-slate-100 border border-transparent rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground cursor-pointer"
                >
                  <option value="">Nenhum cliente associado</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Vínculo de Fornecedor (Apenas Despesas) */}
            {activeFormType === "despesa" && (
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-slate-500" />
                  Fornecedor Associado (Opcional)
                </label>
                <select
                  value={formData.fornecedor_id}
                  onChange={e => setFormData(prev => ({ ...prev, fornecedor_id: e.target.value }))}
                  className="w-full bg-slate-100 border border-transparent rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground cursor-pointer"
                >
                  <option value="">Nenhum fornecedor associado</option>
                  {fornecedores.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Parcelamento (Hidden on Edit and Transferência) */}
            {!isEdit && activeFormType !== "transferencia" && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                  Parcelamento / Repetição
                </label>
                <select
                  value={formData.recorrente ? "recorrente" : String(formData.total_parcelas)}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "recorrente") {
                      setFormData(prev => ({ ...prev, total_parcelas: 12, recorrente: true }));
                    } else {
                      setFormData(prev => ({ ...prev, total_parcelas: Number(val), recorrente: false }));
                    }
                  }}
                  className="w-full bg-slate-100 border border-transparent rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground cursor-pointer"
                >
                  <option value="1">Lançamento Único (1x)</option>
                  <option value="2">Parcelar em 2x</option>
                  <option value="3">Parcelar em 3x</option>
                  <option value="6">Parcelar em 6x</option>
                  <option value="12">Parcelar em 12x</option>
                  <option value="recorrente">Fixo Recorrente Mensal (12 Meses)</option>
                </select>
              </div>
            )}

            {/* Status Inicial (Só se não for transferência) */}
            {activeFormType !== "transferencia" && (
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                  Estado da Transação (Lote Inicial)
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-100 border border-transparent rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground cursor-pointer"
                >
                  <option value="pendente">
                    {activeFormType === "receita" ? "📈 Pendente (A Receber)" : 
                     activeFormType === "despesa" ? "📉 Pendente (A Pagar)" : "Agendado (Não Executado)"}
                  </option>
                  <option value="pago">
                    {activeFormType === "receita" ? "✅ Recebido (Pago)" : 
                     activeFormType === "despesa" ? "✅ Pago (Liquidado)" : "Efetivado (Conciliado)"}
                  </option>
                </select>
              </div>
            )}

            {/* Observações */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                Observações Adicionais
              </label>
              <textarea
                value={formData.observacao}
                onChange={e => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                placeholder="Condições, notas fiscais, convênios bancários ou observações para conciliação..."
                rows={2}
                className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-foreground border border-transparent focus:border-primary/20 resize-none"
              />
            </div>

          </div>

          {/* SIMULADOR DE PARCELAS PREMIUM */}
          {parcelasSimuladas.length > 0 && (
            <div className="border border-indigo-100 rounded-2xl overflow-hidden mt-4">
              <div className="bg-indigo-50/50 px-4 py-2 flex items-center justify-between border-b border-indigo-100 text-indigo-900 font-bold">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>{formData.recorrente ? "Simulação de Lançamentos Recorrentes" : "Simulação de Parcelamento Comercial"}</span>
                </div>
                {formData.recorrente && (
                  <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">Recorrência</span>
                )}
              </div>
              
              {formData.recorrente && (
                <div className="bg-indigo-50/60 border-b border-indigo-100 px-4 py-2 text-[10px] text-indigo-900 font-semibold">
                  ⚠️ <strong>Aviso de Recorrência:</strong> Isto não é parcelamento. O valor integral será repetido mensalmente.
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] leading-relaxed text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-muted-foreground border-b border-indigo-100">
                      <th className="text-left px-4 py-1.5">Parcela</th>
                      <th className="text-left px-4 py-1.5">Data Vencimento</th>
                      <th className="text-right px-4 py-1.5">Valor da Parcela</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelasSimuladas.map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-1.5 font-bold">Parcela #{p.numero}</td>
                        <td className="px-4 py-1.5 font-medium">{p.vencimento}</td>
                        <td className="px-4 py-1.5 text-right font-black text-foreground">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-5 flex-shrink-0">
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
              {isEdit ? "Salvar Lançamento" : "Confirmar Lançamento"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
