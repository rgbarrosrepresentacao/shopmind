// ============================================
// CORE BUSINESS RULES ENGINE — CENTRAL REGISTRY
// ============================================

import { PermissionEngine } from './permissions';
import { ValidationEngine } from './validators';
import { PricingEngine } from './pricing';
import { InventoryEngine } from './inventory';
import { FinanceEngine } from './finance';
import { WorkflowEngine } from './workflow';
import { GovernanceEngine } from './governance';
import { AuditEngine } from './audit';
import { NotificationsEngine } from './notifications';
import { KnowledgeProvider } from './knowledge';
import { MetricsEngine } from './metrics';

// Importar as classes de regras e políticas
import {
  MinimumMarginRule,
  MaximumDiscountRule,
  InventoryAvailableRule,
  CashCloseRule,
  TransferApprovalRule
} from './rules';

import {
  DiscountPolicy,
  PricePolicy,
  InventoryPolicy,
  CashPolicy,
  TransferPolicy,
  PurchaseBudgetPolicy,
  SupplierPolicy,
  DuplicatePurchasePolicy,
  ApprovalPolicy,
  FiscalEntryPolicy,
  CostUpdatePolicy,
  LotValidationPolicy,
  PayableGenerationPolicy
} from './policies';

export class BusinessRegistry {
  private static _permissions?: PermissionEngine;
  private static _validators?: ValidationEngine;
  private static _pricing?: PricingEngine;
  private static _inventory?: InventoryEngine;
  private static _finance?: FinanceEngine;
  private static _workflow?: WorkflowEngine;
  private static _governance?: GovernanceEngine;
  private static _audit?: AuditEngine;
  private static _notifications?: NotificationsEngine;
  private static _knowledge?: KnowledgeProvider;
  private static _metrics?: MetricsEngine;

  // Instâncias lazy de regras e políticas agrupadas
  private static _rules?: {
    minMargin: MinimumMarginRule;
    maxDiscount: MaximumDiscountRule;
    inventoryAvailable: InventoryAvailableRule;
    cashClose: CashCloseRule;
    transferApproval: TransferApprovalRule;
  };

  private static _policies?: {
    discount: DiscountPolicy;
    price: PricePolicy;
    inventory: InventoryPolicy;
    cash: CashPolicy;
    transfer: TransferPolicy;
    purchaseBudget: PurchaseBudgetPolicy;
    supplier: SupplierPolicy;
    duplicatePurchase: DuplicatePurchasePolicy;
    approval: ApprovalPolicy;
    fiscalEntry: FiscalEntryPolicy;
    costUpdate: CostUpdatePolicy;
    lotValidation: LotValidationPolicy;
    payableGeneration: PayableGenerationPolicy;
  };

  // Getters estáticos com Lazy Loading

  public static get permissions(): PermissionEngine {
    if (!this._permissions) this._permissions = new PermissionEngine();
    return this._permissions;
  }

  public static get validators(): ValidationEngine {
    if (!this._validators) this._validators = new ValidationEngine();
    return this._validators;
  }

  public static get pricing(): PricingEngine {
    if (!this._pricing) this._pricing = new PricingEngine();
    return this._pricing;
  }

  public static get inventory(): InventoryEngine {
    if (!this._inventory) this._inventory = new InventoryEngine();
    return this._inventory;
  }

  public static get finance(): FinanceEngine {
    if (!this._finance) this._finance = new FinanceEngine();
    return this._finance;
  }

  public static get workflow(): WorkflowEngine {
    if (!this._workflow) this._workflow = new WorkflowEngine();
    return this._workflow;
  }

  public static get governance(): GovernanceEngine {
    if (!this._governance) this._governance = new GovernanceEngine();
    return this._governance;
  }

  public static get audit(): AuditEngine {
    if (!this._audit) this._audit = new AuditEngine();
    return this._audit;
  }

  public static get notifications(): NotificationsEngine {
    if (!this._notifications) this._notifications = new NotificationsEngine();
    return this._notifications;
  }

  public static get knowledge(): KnowledgeProvider {
    if (!this._knowledge) this._knowledge = new KnowledgeProvider();
    return this._knowledge;
  }

  public static get metrics(): MetricsEngine {
    if (!this._metrics) this._metrics = new MetricsEngine();
    return this._metrics;
  }

  public static get rules() {
    if (!this._rules) {
      this._rules = {
        minMargin: new MinimumMarginRule(),
        maxDiscount: new MaximumDiscountRule(),
        inventoryAvailable: new InventoryAvailableRule(),
        cashClose: new CashCloseRule(),
        transferApproval: new TransferApprovalRule(),
      };
    }
    return this._rules;
  }

  public static get policies() {
    if (!this._policies) {
      this._policies = {
        discount: new DiscountPolicy(),
        price: new PricePolicy(),
        inventory: new InventoryPolicy(),
        cash: new CashPolicy(),
        transfer: new TransferPolicy(),
        purchaseBudget: new PurchaseBudgetPolicy(),
        supplier: new SupplierPolicy(),
        duplicatePurchase: new DuplicatePurchasePolicy(),
        approval: new ApprovalPolicy(),
        fiscalEntry: new FiscalEntryPolicy(),
        costUpdate: new CostUpdatePolicy(),
        lotValidation: new LotValidationPolicy(),
        payableGeneration: new PayableGenerationPolicy(),
      };
    }
    return this._policies;
  }
}
