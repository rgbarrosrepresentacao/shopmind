// ============================================
// CORE BUSINESS RULES ENGINE — CONFIGURATION
// ============================================

import { DEFAULT_LIMITS } from '../constants';
import type { BusinessContext } from '../types';

export class RuleConfigProvider {
  /**
   * Obtém um limite configurável dinamicamente a partir do contexto da loja (configuracoes_loja)
   * com fallback seguro para os limites padrão.
   */
  public static getLimit(
    context: BusinessContext,
    key: keyof typeof DEFAULT_LIMITS
  ): number {
    const tenantConfigs = context.tenant.configuracoes || {};
    
    // Mapear chaves amigáveis de banco para as constantes padrão
    const dbKeyMap: Record<string, string> = {
      MAX_DISCOUNT_CAIXA: 'limite_desconto_caixa',
      MAX_DISCOUNT_GERENTE: 'limite_desconto_gerente',
      MIN_MARGIN_PERCENT: 'margem_lucro_minima',
      CRITICAL_PURCHASE_LIMIT: 'teto_compra_alçada',
      AUTO_APPROVAL_TRANSFER_LIMIT: 'limite_aprovacao_automatica_transferencia'
    };

    const dbKey = dbKeyMap[key];
    if (dbKey && tenantConfigs[dbKey] !== undefined) {
      return Number(tenantConfigs[dbKey]);
    }

    return DEFAULT_LIMITS[key];
  }
}
