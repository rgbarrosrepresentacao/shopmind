// ============================================
// CORE BUSINESS RULES ENGINE — CONSTANTS
// ============================================

export const ROLES = {
  DONO: 'dono',
  GERENTE: 'gerente',
  SUPERVISOR: 'supervisor',
  ESTOQUISTA: 'estoquista',
  FINANCEIRO: 'financeiro',
  VENDEDOR: 'vendedor',
  CAIXA: 'caixa',
  COMPRADOR: 'comprador',
  FISCAL: 'fiscal',
} as const;

export const EVENT_NAMES = {
  BEFORE_SALE: 'BeforeSale',
  AFTER_SALE: 'AfterSale',
  BEFORE_PAYMENT: 'BeforePayment',
  AFTER_PAYMENT: 'AfterPayment',
  BEFORE_DISCOUNT: 'BeforeDiscount',
  AFTER_DISCOUNT: 'AfterDiscount',
  BEFORE_TRANSFER: 'BeforeTransfer',
  AFTER_TRANSFER: 'AfterTransfer',
  BEFORE_PURCHASE: 'BeforePurchase',
  AFTER_PURCHASE: 'AfterPurchase',
  BEFORE_CASH_OPEN: 'BeforeCashOpen',
  AFTER_CASH_OPEN: 'AfterCashOpen',
  BEFORE_CASH_CLOSE: 'BeforeCashClose',
  AFTER_CASH_CLOSE: 'AfterCashClose',
  BEFORE_PRICE_CHANGE: 'BeforePriceChange',
  AFTER_PRICE_CHANGE: 'AfterPriceChange',
  BEFORE_DELETE: 'BeforeDelete',
  AFTER_DELETE: 'AfterDelete',

  // Domain Events (Fase 3.5 Complemento)
  SALE_CREATED: 'SaleCreated',
  SALE_CANCELLED: 'SaleCancelled',
  SALE_PAID: 'SalePaid',
  CASH_OPENED: 'CashOpened',
  CASH_CLOSED: 'CashClosed',
  TRANSFER_CREATED: 'TransferCreated',
  TRANSFER_APPROVED: 'TransferApproved',
  TRANSFER_SENT: 'TransferSent',
  TRANSFER_RECEIVED: 'TransferReceived',
  PURCHASE_CREATED: 'PurchaseCreated',
  PURCHASE_APPROVED: 'PurchaseApproved',
  PURCHASE_RECEIVED: 'PurchaseReceived',
  INVENTORY_ADJUSTED: 'InventoryAdjusted',
  CUSTOMER_CREATED: 'CustomerCreated',
  PRODUCT_CREATED: 'ProductCreated',
  PRODUCT_UPDATED: 'ProductUpdated',
  PRICE_CHANGED: 'PriceChanged',
  STOCK_RESERVED: 'StockReserved',
  STOCK_RELEASED: 'StockReleased',
} as const;

export const DEFAULT_LIMITS = {
  MAX_DISCOUNT_CAIXA: 10,       // 10%
  MAX_DISCOUNT_VENDEDOR: 10,    // 10%
  MAX_DISCOUNT_GERENTE: 30,     // 30%
  MAX_DISCOUNT_SUPERVISOR: 15,  // 15%
  MIN_MARGIN_PERCENT: 15,       // 15% margem mínima recomendada
  AUTO_APPROVAL_TRANSFER_LIMIT: 5000, // Limite de valor para aprovação automática
  CRITICAL_PURCHASE_LIMIT: 20000,      // Acima de R$ 20k exige dupla aprovação
  MAX_CASH_DIFFERENCE: 100,     // Diferença máxima aceitável no fechamento de caixa
};
