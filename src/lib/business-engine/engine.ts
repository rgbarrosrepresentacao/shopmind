// ============================================
// CORE BUSINESS RULES ENGINE — CENTRAL GATEWAY
// ============================================

import { BusinessRegistry } from './registry';
import { BusinessContextBuilder } from './context';
import { registerAllSubscribers } from './subscribers';
import type { Command, CommandResult, BusinessContext } from './types';

// Comandos e Handlers
import {
  CreateSaleCommand,
  CancelSaleCommand,
  AdjustInventoryCommand,
  CreatePurchaseRequestCommand,
  ApprovePurchaseCommand,
  GeneratePurchaseOrderCommand,
  ReceivePhysicalPurchaseCommand,
  RegisterFiscalPurchaseCommand,
  CancelPurchaseCommand,
  ImportPurchaseXMLCommand,
  ReconcilePurchaseXMLCommand,
  ReleaseQuarantineLotCommand,
  AddAdditionalPurchaseCostCommand,
  CreateFinancialTransactionCommand,
  ProcessFinancialPaymentCommand,
  RenegotiateFinancialTransactionCommand,
  RefundFinancialTransactionCommand,
  CancelFinancialTransactionCommand,
  CreateFinanceAccountCommand,
  TransferFinanceFundsCommand,
  ApproveFinancialWorkflowCommand,
  CreateClosingPeriodCommand,
  ReopenClosingPeriodCommand,
  UpdateFinancialBudgetCommand,
  ProcessBankReconciliationCommand,
  ReprocessFinancialTransactionCommand,
  OpenCashSessionCommand,
  CloseCashSessionCommand,
  PerformCashInflowCommand,
  PerformCashOutflowCommand,
  ReconcileCashSessionCommand
} from './commands';

import {
  CreateSaleCommandHandler,
  CancelSaleCommandHandler,
  AdjustInventoryCommandHandler,
  CreatePurchaseRequestCommandHandler,
  ApprovePurchaseCommandHandler,
  GeneratePurchaseOrderCommandHandler,
  ReceivePhysicalPurchaseCommandHandler,
  RegisterFiscalPurchaseCommandHandler,
  CancelPurchaseCommandHandler,
  ImportPurchaseXMLCommandHandler,
  ReconcilePurchaseXMLCommandHandler,
  ReleaseQuarantineLotCommandHandler,
  AddAdditionalPurchaseCostCommandHandler,
  CreateFinancialTransactionCommandHandler,
  ProcessFinancialPaymentCommandHandler,
  RenegotiateFinancialTransactionCommandHandler,
  RefundFinancialTransactionCommandHandler,
  CancelFinancialTransactionCommandHandler,
  CreateFinanceAccountCommandHandler,
  TransferFinanceFundsCommandHandler,
  ApproveFinancialWorkflowCommandHandler,
  CreateClosingPeriodCommandHandler,
  ReopenClosingPeriodCommandHandler,
  UpdateFinancialBudgetCommandHandler,
  ProcessBankReconciliationCommandHandler,
  ReprocessFinancialTransactionCommandHandler,
  OpenCashSessionCommandHandler,
  CloseCashSessionCommandHandler,
  PerformCashInflowCommandHandler,
  PerformCashOutflowCommandHandler,
  ReconcileCashSessionCommandHandler
} from './handlers';

// Inicializar ouvintes (subscribers) do EventBus de forma automática ao carregar o Engine
if (typeof window === 'undefined') {
  registerAllSubscribers();
}

export class BusinessEngine {
  // Expor todas as propriedades do Registro Central (Lazy Load Getters)
  
  public static get permissions() {
    return BusinessRegistry.permissions;
  }

  public static get validators() {
    return BusinessRegistry.validators;
  }

  public static get pricing() {
    return BusinessRegistry.pricing;
  }

  public static get inventory() {
    return BusinessRegistry.inventory;
  }

  public static get finance() {
    return BusinessRegistry.finance;
  }

  public static get workflow() {
    return BusinessRegistry.workflow;
  }

  public static get governance() {
    return BusinessRegistry.governance;
  }

  public static get audit() {
    return BusinessRegistry.audit;
  }

  public static get notifications() {
    return BusinessRegistry.notifications;
  }

  public static get knowledge() {
    return BusinessRegistry.knowledge;
  }

  public static get metrics() {
    return BusinessRegistry.metrics;
  }

  public static get rules() {
    return BusinessRegistry.rules;
  }

  public static get policies() {
    return BusinessRegistry.policies;
  }

  /**
   * Constrói e retorna o contexto de negócios unificado e cacheado por transação.
   */
  public static async getContext(customOverrides?: {
    userId?: string;
    lojaId?: string;
    caixaId?: string;
  }): Promise<BusinessContext> {
    return BusinessContextBuilder.build(customOverrides);
  }

  /**
   * Ponto de entrada oficial para execução de operações críticas no ShopMind (CQRS).
   * Encapsula em pipeline: Validação de Permissão -> Regras e Políticas -> Execução -> Domain Events -> Subscribers -> Auditoria e Métricas.
   */
  public static async executeCommand<R = any>(
    command: Command,
    customContext?: BusinessContext
  ): Promise<CommandResult<R>> {
    const start = Date.now();
    
    // 1. Obter ou construir contexto seguro
    const context = customContext || await this.getContext();
    
    let result: CommandResult<any>;

    try {
      // 2. Roteamento de comandos para seus respectivos Handlers
      if (command instanceof CreateSaleCommand) {
        const handler = new CreateSaleCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CancelSaleCommand) {
        const handler = new CancelSaleCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof AdjustInventoryCommand) {
        const handler = new AdjustInventoryCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CreatePurchaseRequestCommand) {
        const handler = new CreatePurchaseRequestCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ApprovePurchaseCommand) {
        const handler = new ApprovePurchaseCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof GeneratePurchaseOrderCommand) {
        const handler = new GeneratePurchaseOrderCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ReceivePhysicalPurchaseCommand) {
        const handler = new ReceivePhysicalPurchaseCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof RegisterFiscalPurchaseCommand) {
        const handler = new RegisterFiscalPurchaseCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CancelPurchaseCommand) {
        const handler = new CancelPurchaseCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ImportPurchaseXMLCommand) {
        const handler = new ImportPurchaseXMLCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ReconcilePurchaseXMLCommand) {
        const handler = new ReconcilePurchaseXMLCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ReleaseQuarantineLotCommand) {
        const handler = new ReleaseQuarantineLotCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof AddAdditionalPurchaseCostCommand) {
        const handler = new AddAdditionalPurchaseCostCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CreateFinancialTransactionCommand) {
        const handler = new CreateFinancialTransactionCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ProcessFinancialPaymentCommand) {
        const handler = new ProcessFinancialPaymentCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof RenegotiateFinancialTransactionCommand) {
        const handler = new RenegotiateFinancialTransactionCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof RefundFinancialTransactionCommand) {
        const handler = new RefundFinancialTransactionCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CancelFinancialTransactionCommand) {
        const handler = new CancelFinancialTransactionCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CreateFinanceAccountCommand) {
        const handler = new CreateFinanceAccountCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof TransferFinanceFundsCommand) {
        const handler = new TransferFinanceFundsCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ApproveFinancialWorkflowCommand) {
        const handler = new ApproveFinancialWorkflowCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CreateClosingPeriodCommand) {
        const handler = new CreateClosingPeriodCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ReopenClosingPeriodCommand) {
        const handler = new ReopenClosingPeriodCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof UpdateFinancialBudgetCommand) {
        const handler = new UpdateFinancialBudgetCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ProcessBankReconciliationCommand) {
        const handler = new ProcessBankReconciliationCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ReprocessFinancialTransactionCommand) {
        const handler = new ReprocessFinancialTransactionCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof OpenCashSessionCommand) {
        const handler = new OpenCashSessionCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof CloseCashSessionCommand) {
        const handler = new CloseCashSessionCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof PerformCashInflowCommand) {
        const handler = new PerformCashInflowCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof PerformCashOutflowCommand) {
        const handler = new PerformCashOutflowCommandHandler();
        result = await handler.handle(command, context);
      } else if (command instanceof ReconcileCashSessionCommand) {
        const handler = new ReconcileCashSessionCommandHandler();
        result = await handler.handle(command, context);
      } else {
        throw new Error(`Nenhum handler registrado para o comando do tipo "${command.type}".`);
      }

      // 3. Registrar telemetria no MetricsEngine
      const executionTime = Date.now() - start;
      const rulesCount = result.decision?.metadata 
        ? Object.keys(result.decision.metadata).filter(k => k.endsWith('Rule')).length 
        : 1;

      this.metrics.record({
        operation: command.type,
        executionTime,
        rulesCount,
        eventsCount: result.success ? 1 : 0,
        success: result.success,
        error: result.error,
      });

      // 4. Log de auditoria estruturado caso o comando tenha falhado por razões críticas
      if (!result.success && result.decision) {
        await this.audit.logSecurityAlert(
          context,
          'high',
          `Bloqueio operacional do comando ${command.type}: ${result.error}`,
          result.decision.metadata
        );
      }

      return result as CommandResult<R>;
    } catch (err: any) {
      const executionTime = Date.now() - start;
      
      // Registrar falha crítica do sistema
      this.metrics.record({
        operation: command.type,
        executionTime,
        rulesCount: 0,
        eventsCount: 0,
        success: false,
        error: err.message,
      });

      await this.audit.logActivity(context, {
        acao: 'erro',
        entidade: 'business_engine',
        entidadeId: null,
        observacao: `Falha crítica de sistema ao executar comando ${command.type}: ${err.message}`,
        dadosNovos: { errorStack: err.stack },
      });

      return {
        success: false,
        data: null,
        error: err.message || 'Erro inesperado na execução do comando corporativo.',
      };
    }
  }
}
