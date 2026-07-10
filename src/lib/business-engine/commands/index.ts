// ============================================
// CORE BUSINESS RULES ENGINE — COMMANDS
// ============================================

import type { Command } from '../types';

export class CreateSaleCommand implements Command {
  public readonly type = 'CreateSaleCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      checkoutData: {
        clienteId: string | null;
        descontoGeral: number;
        formaPagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'multiplo';
        detalhePagamento: Record<string, number> | null;
        valorPago: number;
        troco: number;
        recompensaId?: string | null;
        cashbackUsado?: number | null;
        tipoDocumento?: "recibo" | "pedido" | "orcamento" | "comprovante" | "venda" | "devolucao" | "cupom";
      };
      items: Array<{
        produto: {
          id: string;
          nome: string;
          preco_venda: number;
          preco_custo?: number;
        };
        quantidade: number;
        desconto: number;
        total: number;
      }>;
    }
  ) {}
}

export class CancelSaleCommand implements Command {
  public readonly type = 'CancelSaleCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      vendaId: string;
      motivo: string;
    }
  ) {}
}

export class AdjustInventoryCommand implements Command {
  public readonly type = 'AdjustInventoryCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      produtoId: string;
      quantidade: number;
      motivo: string;
      tipo: 'entrada' | 'saida' | 'ajuste';
      lojaId?: string;
    }
  ) {}
}

export class CreateTransferCommand implements Command {
  public readonly type = 'CreateTransferCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      origemLojaId: string;
      destinoLojaId: string;
      items: Array<{
        produtoId: string;
        quantidade: number;
      }>;
      observacao?: string;
    }
  ) {}
}

export class ApproveTransferCommand implements Command {
  public readonly type = 'ApproveTransferCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transferenciaId: string;
    }
  ) {}
}

export class SendTransferCommand implements Command {
  public readonly type = 'SendTransferCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transferenciaId: string;
    }
  ) {}
}

export class ReceiveTransferCommand implements Command {
  public readonly type = 'ReceiveTransferCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transferenciaId: string;
      itensRecebidos: Array<{
        produtoId: string;
        quantidadeRecebida: number;
      }>;
      observacao?: string;
    }
  ) {}
}

export class OpenCashCommand implements Command {
  public readonly type = 'OpenCashCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      valorAbertura: number;
      observacao?: string;
    }
  ) {}
}

export class CloseCashCommand implements Command {
  public readonly type = 'CloseCashCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      saldoDinheiro: number;
      observacao?: string;
    }
  ) {}
}

// ============================================
// COMPRAS ENTERPRISE (FASE 4A) COMMANDS
// ============================================

export class CreatePurchaseRequestCommand implements Command {
  public readonly type = 'CreatePurchaseRequestCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      titulo: string;
      observacao?: string;
      origem?: 'manual' | 'ia_automatico' | 'ia_recorrente';
      itens: Array<{
        produtoId: string;
        quantidade: number;
      }>;
    }
  ) {}
}

export class ApprovePurchaseCommand implements Command {
  public readonly type = 'ApprovePurchaseCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      pedidoId: string;
      aprovado: boolean;
      justificativa?: string;
    }
  ) {}
}

export class GeneratePurchaseOrderCommand implements Command {
  public readonly type = 'GeneratePurchaseOrderCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      purchaseRequestId: string;
      purchaseQuoteId: string;
      compradorId: string;
      tipoComprador: 'filial' | 'corporativo';
      centroCusto?: string;
      filialId: string; // CD ou Filial destino
    }
  ) {}
}

export class ReceivePhysicalPurchaseCommand implements Command {
  public readonly type = 'ReceivePhysicalPurchaseCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      purchaseOrderId: string;
      recebidoPorId: string;
      conferidoPorId: string;
      itens: Array<{
        produtoId: string;
        quantidadeEnviada: number;
        quantidadeRecebida: number;
        quantidadeRecusada?: number;
        motivoRecusa?: string;
        lote?: string;
        validade?: string;
      }>;
    }
  ) {}
}

export class RegisterFiscalPurchaseCommand implements Command {
  public readonly type = 'RegisterFiscalPurchaseCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      purchaseReceiptId: string;
      chaveNfe: string;
      numeroNf: string;
      serieNf?: string;
      valorProdutos: number;
      valorImpostos: number;
      valorFrete: number;
      valorTotal: number;
      rateioCentroCustos?: Record<string, number>;
    }
  ) {}
}

export class CancelPurchaseCommand implements Command {
  public readonly type = 'CancelPurchaseCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      purchaseOrderId: string;
      motivo: string;
    }
  ) {}
}

// ============================================
// COMPRAS ENTERPRISE (FASE 4B) COMMANDS
// ============================================

export class ImportPurchaseXMLCommand implements Command {
  public readonly type = 'ImportPurchaseXMLCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      xmlRaw: string;
      parserVersion: string;
    }
  ) {}
}

export class ReconcilePurchaseXMLCommand implements Command {
  public readonly type = 'ReconcilePurchaseXMLCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      fiscalEntryId: string;
      justificativas: Record<string, string>; // item_id -> justificativa
      vencimentosParcelas?: Array<{ vencimento: string; valor: number }>;
    }
  ) {}
}

export class ReleaseQuarantineLotCommand implements Command {
  public readonly type = 'ReleaseQuarantineLotCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      loteId: string;
      status: 'liberado' | 'reprovado';
      justificativa?: string;
    }
  ) {}
}

export class AddAdditionalPurchaseCostCommand implements Command {
  public readonly type = 'AddAdditionalPurchaseCostCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      fiscalEntryId: string;
      tipoCusto: 'frete' | 'seguro' | 'despachante' | 'armazenagem' | 'outros';
      valor: number;
      descricao?: string;
    }
  ) {}
}

// ============================================
// TESOURARIA CORE & CONTABILIDADE (FASE 5A) COMMANDS
// ============================================

export class CreateFinancialTransactionCommand implements Command {
  public readonly type = 'CreateFinancialTransactionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      tipo: 'receita' | 'despesa';
      descricao: string;
      valor: number;
      categoria: string;
      accountId: string;
      dataVencimento: string;
      clienteId?: string | null;
      fornecedorId?: string | null;
      centroCusto?: string;
      planoContas?: string;
      origem?: string;
      numeroParcela?: number;
      totalParcelas?: number;
      moeda?: string;
      idempotencyKey?: string;
      recorrente?: boolean;
      recorrenciaId?: string | null;
      recorrenciaOrigemId?: string | null;
      recorrenciaTipo?: string | null;
      recorrenciaIndice?: number | null;
      recorrenciaTotal?: number | null;
      observacao?: string | null;
    }
  ) {}
}

export class ProcessFinancialPaymentCommand implements Command {
  public readonly type = 'ProcessFinancialPaymentCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transacaoId: string;
      accountId: string;
      valorPago: number;
      juros?: number;
      multa?: number;
      desconto?: number;
      dataPagamento?: string;
      idempotencyKey?: string;
    }
  ) {}
}

export class RenegotiateFinancialTransactionCommand implements Command {
  public readonly type = 'RenegotiateFinancialTransactionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transacoesIds: string[];
      novasParcelas: Array<{ vencimento: string; valor: number }>;
      accountId: string;
      justificativa: string;
    }
  ) {}
}

export class RefundFinancialTransactionCommand implements Command {
  public readonly type = 'RefundFinancialTransactionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transacaoId: string;
      justificativa: string;
    }
  ) {}
}

export class CancelFinancialTransactionCommand implements Command {
  public readonly type = 'CancelFinancialTransactionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transacaoId: string;
      justificativa: string;
    }
  ) {}
}

export class CreateFinanceAccountCommand implements Command {
  public readonly type = 'CreateFinanceAccountCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      nome: string;
      tipo: 'caixa' | 'banco' | 'conta_corrente' | 'conta_aplicacao' | 'carteira' | 'pix' | 'cartao' | 'conta_digital';
      banco?: string;
      agencia?: string;
      conta?: string;
      pix?: string;
      limite?: number;
      saldoNegativoPermitido?: boolean;
      moeda?: string;
    }
  ) {}
}

export class TransferFinanceFundsCommand implements Command {
  public readonly type = 'TransferFinanceFundsCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      origemAccountId: string;
      destinoAccountId: string;
      valor: number;
      descricao?: string;
    }
  ) {}
}

export class ApproveFinancialWorkflowCommand implements Command {
  public readonly type = 'ApproveFinancialWorkflowCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transacaoId: string;
      status: 'aprovado' | 'rejeitado';
      justificativa?: string;
    }
  ) {}
}

export class CreateClosingPeriodCommand implements Command {
  public readonly type = 'CreateClosingPeriodCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      ano: number;
      mes: number;
    }
  ) {}
}

export class ReopenClosingPeriodCommand implements Command {
  public readonly type = 'ReopenClosingPeriodCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      ano: number;
      mes: number;
      justificativa: string;
    }
  ) {}
}

export class UpdateFinancialBudgetCommand implements Command {
  public readonly type = 'UpdateFinancialBudgetCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      ano: number;
      mes: number;
      centroCusto: string;
      planoContas: string;
      valorPrevisto: number;
    }
  ) {}
}

export class ProcessBankReconciliationCommand implements Command {
  public readonly type = 'ProcessBankReconciliationCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      statementId: string;
      conciliacoes: Array<{
        bankTransactionId: string;
        erpTransacaoId: string | null;
        status: 'conciliado' | 'divergente';
        justificativa?: string;
      }>;
    }
  ) {}
}

export class ReprocessFinancialTransactionCommand implements Command {
  public readonly type = 'ReprocessFinancialTransactionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      transacaoId: string;
      motivo: string;
    }
  ) {}
}

// ============================================
// CASH ENGINE (CAIXAS E PDV - FASE 5A) COMMANDS
// ============================================

export class OpenCashSessionCommand implements Command {
  public readonly type = 'OpenCashSessionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      operadorId: string;
      valorAbertura: number;
      accountId: string; // Conta de caixa correspondente na tesouraria
    }
  ) {}
}

export class CloseCashSessionCommand implements Command {
  public readonly type = 'CloseCashSessionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      caixaId: string;
      valorFechamento: number;
    }
  ) {}
}

export class PerformCashInflowCommand implements Command {
  public readonly type = 'PerformCashInflowCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      caixaId: string;
      valor: number;
      motivo: string;
    }
  ) {}
}

export class PerformCashOutflowCommand implements Command {
  public readonly type = 'PerformCashOutflowCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      caixaId: string;
      valor: number;
      motivo: string;
    }
  ) {}
}

export class ReconcileCashSessionCommand implements Command {
  public readonly type = 'ReconcileCashSessionCommand';
  public readonly timestamp = new Date().toISOString();
  constructor(
    public readonly payload: {
      caixaId: string;
      valorContado: number;
      justificativa?: string;
    }
  ) {}
}
