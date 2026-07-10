'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { abrirCaixa } from '@/lib/actions/caixa';
import { Coins } from 'lucide-react';

interface CaixaAberturaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CaixaAberturaDialog: React.FC<CaixaAberturaDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [valorAbertura, setValorAbertura] = React.useState('150,00');
  const [observacao, setObservacao] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse BRL format to number
    const cleanValue = valorAbertura
      .replace(/\./g, '')
      .replace(',', '.');
    const parsedValue = parseFloat(cleanValue);

    if (isNaN(parsedValue) || parsedValue < 0) {
      toast.error('Informe um valor de abertura válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await abrirCaixa(parsedValue, observacao.trim() || undefined);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Caixa aberto com sucesso!');
        onSuccess();
        onClose();
        // Reset states
        setValorAbertura('150,00');
        setObservacao('');
      }
    } catch (err) {
      toast.error('Erro ao abrir caixa.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format input as currency while typing
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setValorAbertura('0,00');
      return;
    }
    
    // Format to 1234,56
    const floatValue = parseFloat(value) / 100;
    const formatted = floatValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setValorAbertura(formatted);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Abertura de Caixa"
      description="Informe o saldo inicial (fundo de troco) disponível na gaveta física."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/60 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Fundo de Troco Inicial</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Recomendado pela IA Gerente: R$ 150,00
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Valor de Abertura (R$) <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              R$
            </span>
            <Input
              type="text"
              className="pl-9 font-bold text-base"
              value={valorAbertura}
              onChange={handleValorChange}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Observações de Abertura
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ex: Utilizando notas de 2, 5 e 10 reais para troco."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
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
            variant="primary"
            size="sm"
            isLoading={loading}
          >
            Abrir Caixa
          </Button>
        </div>
      </form>
    </Modal>
  );
};
