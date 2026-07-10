'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { fecharCaixa } from '@/lib/actions/caixa';
import type { Caixa } from '@/lib/types/caixa';
import { formatBRL, getSaldoDinheiroEsperado } from '@/lib/types/caixa';
import { AlertCircle, CheckCircle, Scale, DollarSign, CreditCard, Landmark, PiggyBank } from 'lucide-react';

interface CaixaFechamentoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caixa: Caixa | null;
  onSuccess: () => void;
}

export const CaixaFechamentoDialog: React.FC<CaixaFechamentoDialogProps> = ({
  isOpen,
  onClose,
  caixa,
  onSuccess,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [valorFechamento, setValorFechamento] = React.useState('0,00');
  const [observacao, setObservacao] = React.useState('');

  // Expected values
  const expectedCash = caixa ? getSaldoDinheiroEsperado(caixa) : 0;
  
  // Real-time parsed physical cash
  const cleanValue = valorFechamento.replace(/\./g, '').replace(',', '.');
  const physicalCashCounted = parseFloat(cleanValue) || 0;
  
  // Discrepancy
  const discrepancy = physicalCashCounted - expectedCash;

  React.useEffect(() => {
    if (caixa) {
      // Pre-fill with the expected cash to help operator or default count
      const formatted = expectedCash.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      setValorFechamento(formatted);
      setObservacao('');
    }
  }, [caixa, isOpen]);

  if (!caixa) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const res = await fecharCaixa(caixa.id, physicalCashCounted, observacao.trim() || undefined);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Caixa fechado com sucesso! Relatório de conferência gerado.');
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error('Erro ao fechar caixa.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format currency
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setValorFechamento('0,00');
      return;
    }
    
    const floatValue = parseFloat(value) / 100;
    const formatted = floatValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setValorFechamento(formatted);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fechamento de Caixa — Conferência Física"
      description="Verifique os valores do sistema e informe a quantidade real de dinheiro na gaveta."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Financial Audit Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Resumo Operacional (Sistema)
            </h4>
            
            <div className="bg-muted/30 rounded-xl border border-border/80 divide-y divide-border/60">
              <div className="flex justify-between items-center p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5" /> Fundo de Abertura
                </span>
                <span className="font-semibold">{formatBRL(caixa.valor_abertura)}</span>
              </div>
              <div className="flex justify-between items-center p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Vendas em Dinheiro (+)
                </span>
                <span className="font-semibold text-emerald-600">+{formatBRL(caixa.total_dinheiro)}</span>
              </div>
              <div className="flex justify-between items-center p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-blue-500" /> Suprimentos (+)
                </span>
                <span className="font-semibold text-blue-600">+{formatBRL(caixa.total_suprimentos)}</span>
              </div>
              <div className="flex justify-between items-center p-3 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-destructive" /> Sangrias (-)
                </span>
                <span className="font-semibold text-destructive">-{formatBRL(caixa.total_sangrias)}</span>
              </div>
              <div className="flex justify-between items-center p-3 text-xs bg-muted/60 font-bold border-t border-border">
                <span className="text-foreground">Saldo em Dinheiro Esperado</span>
                <span className="text-foreground">{formatBRL(expectedCash)}</span>
              </div>
            </div>

            {/* Other Payments (non-drawer) */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Outros Meios de Pagamento (Conferência Bancária/POS)
              </h5>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card border border-border p-2 rounded-lg text-center">
                  <span className="text-[9px] text-muted-foreground uppercase block font-bold">Pix</span>
                  <span className="text-xs font-bold text-indigo-500 block mt-1">{formatBRL(caixa.total_pix)}</span>
                </div>
                <div className="bg-card border border-border p-2 rounded-lg text-center">
                  <span className="text-[9px] text-muted-foreground uppercase block font-bold">C. Crédito</span>
                  <span className="text-xs font-bold text-sky-500 block mt-1">{formatBRL(caixa.total_cartao_credito)}</span>
                </div>
                <div className="bg-card border border-border p-2 rounded-lg text-center">
                  <span className="text-[9px] text-muted-foreground uppercase block font-bold">C. Débito</span>
                  <span className="text-xs font-bold text-teal-500 block mt-1">{formatBRL(caixa.total_cartao_debito)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-card border border-border px-3 py-2 rounded-lg text-xs">
                <span className="text-muted-foreground font-semibold">Total de Vendas Acumuladas</span>
                <span className="font-extrabold text-foreground">{formatBRL(caixa.total_vendas)} ({caixa.quantidade_vendas} vendas)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Physical Entry & Discrepancies */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Conferência Física
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Dinheiro Físico Contado (R$) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="text"
                    className="pl-9 font-bold text-lg text-foreground focus:ring-primary"
                    value={valorFechamento}
                    onChange={handleValorChange}
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Conte todas as moedas e cédulas na gaveta e insira o valor total aqui.
                </p>
              </div>

              {/* Dynamic Discrepancy Cards */}
              {discrepancy === 0 ? (
                <div className="bg-success/10 border border-success/30 p-3.5 rounded-xl flex gap-3 text-success">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold">Valores Coincidentes</h5>
                    <p className="text-[10px] leading-relaxed mt-0.5 opacity-90">
                      O dinheiro físico em caixa corresponde exatamente ao esperado pelo sistema. Conferência perfeita!
                    </p>
                  </div>
                </div>
              ) : discrepancy < 0 ? (
                <div className="bg-destructive/10 border border-destructive/30 p-3.5 rounded-xl flex gap-3 text-destructive animate-pulse-glow">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold">Quebra de Caixa Detectada</h5>
                    <p className="text-[10px] leading-relaxed mt-0.5 opacity-90">
                      Falta <span className="font-extrabold">{formatBRL(Math.abs(discrepancy))}</span> em relação ao esperado. Por favor, conte novamente e explique o motivo da diferença nas observações.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-warning/10 border border-warning/30 p-3.5 rounded-xl flex gap-3 text-warning">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold">Sobra de Caixa Detectada</h5>
                    <p className="text-[10px] leading-relaxed mt-0.5 opacity-90">
                      Sobra <span className="font-extrabold">{formatBRL(discrepancy)}</span> a mais na gaveta. Por favor, conte novamente e explique a sobra nas observações (ex: troco não retirado).
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Observações / Justificativa {Math.abs(discrepancy) > 0.05 && <span className="text-destructive">(Obrigatório em caso de quebra)</span>}
                </label>
                <textarea
                  className="w-full min-h-[90px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Justifique qualquer diferença de valores ou adicione observações sobre o expediente..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  required={Math.abs(discrepancy) > 0.05}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                isLoading={loading}
              >
                Confirmar Fechamento
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
