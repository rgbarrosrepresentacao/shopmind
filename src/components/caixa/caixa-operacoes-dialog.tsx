'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { registrarSangria, registrarSuprimento } from '@/lib/actions/caixa';
import { formatBRL } from '@/lib/types/caixa';
import { ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';

interface CaixaOperacoesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caixaId: string;
  tipo: 'sangria' | 'suprimento';
  currentCashBalance: number;
  onSuccess: () => void;
}

export const CaixaOperacoesDialog: React.FC<CaixaOperacoesDialogProps> = ({
  isOpen,
  onClose,
  caixaId,
  tipo,
  currentCashBalance,
  onSuccess,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [valor, setValor] = React.useState('0,00');
  const [motivo, setMotivo] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setValor('0,00');
      setMotivo('');
    }
  }, [isOpen, tipo]);

  const isSangria = tipo === 'sangria';
  const cleanValue = valor.replace(/\./g, '').replace(',', '.');
  const parsedValue = parseFloat(cleanValue) || 0;

  // Validation: Sangria cannot exceed current physical drawer cash balance
  const isOverdraft = isSangria && parsedValue > currentCashBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedValue <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }

    if (isSangria && isOverdraft) {
      toast.error('Saldo em dinheiro insuficiente na gaveta para realizar esta sangria.');
      return;
    }

    if (!motivo.trim() || motivo.trim().length < 3) {
      toast.error('Informe uma justificativa/motivo detalhado (mínimo 3 caracteres).');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isSangria) {
        res = await registrarSangria(caixaId, parsedValue, motivo.trim());
      } else {
        res = await registrarSuprimento(caixaId, parsedValue, motivo.trim());
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          isSangria
            ? 'Sangria (retirada) registrada com sucesso!'
            : 'Suprimento (aporte) registrado com sucesso!'
        );
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error('Erro ao registrar operação.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val === '') {
      setValor('0,00');
      return;
    }
    const floatValue = parseFloat(val) / 100;
    const formatted = floatValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setValor(formatted);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSangria ? 'Registrar Sangria (Retirada)' : 'Registrar Suprimento (Aporte)'}
      description={
        isSangria
          ? 'Retirada de dinheiro em espécie do caixa (ex: depósitos, pagamentos, sangria de segurança).'
          : 'Aporte de dinheiro em espécie na gaveta (ex: adição de troco no início ou meio do dia).'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info box */}
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl border ${
            isSangria
              ? 'bg-destructive/5 border-destructive/20 text-destructive'
              : 'bg-primary/5 border-primary/20 text-primary'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isSangria ? 'bg-destructive/10' : 'bg-primary/10'
            }`}
          >
            {isSangria ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block">
              Gaveta Física (Dinheiro)
            </span>
            <span className="text-sm font-extrabold block">
              Saldo Estimado: {formatBRL(currentCashBalance)}
            </span>
          </div>
        </div>

        {/* Input: Valor */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block">
            Valor da Operação (R$) <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              R$
            </span>
            <Input
              type="text"
              className={`pl-9 font-bold text-base ${isOverdraft ? 'border-destructive focus:ring-destructive' : ''}`}
              value={valor}
              onChange={handleValorChange}
              required
            />
          </div>
          {isOverdraft && (
            <div className="flex items-center gap-1.5 text-destructive text-[10px] font-bold mt-1.5 animate-pulse-glow">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>O valor excede o dinheiro disponível na gaveta ({formatBRL(currentCashBalance)}).</span>
            </div>
          )}
        </div>

        {/* Input: Motivo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Motivo / Justificativa <span className="text-destructive">*</span>
          </label>
          <textarea
            className="w-full min-h-[90px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={
              isSangria
                ? 'Ex: Sangria de segurança para depósito bancário periódico ou pagamento de fornecedor...'
                : 'Ex: Fundo de troco de moedas adicionais fornecido pelo gerente...'
            }
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-4">
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
            variant={isSangria ? 'destructive' : 'primary'}
            size="sm"
            isLoading={loading}
            disabled={isOverdraft}
          >
            Confirmar {isSangria ? 'Sangria' : 'Suprimento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
