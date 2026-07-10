// ============================================
// CORE BUSINESS RULES ENGINE — FEATURE FLAGS
// ============================================

import type { BusinessContext } from '../types';

export class FeatureFlagProvider {
  // Configuração padrão de ativação gradual de novos submotores
  private static defaultFlags: Record<string, boolean> = {
    novoPDV: true,
    novaIA: true,
    novoWorkflow: true,
    novoFinanceiro: true,
    novoBusinessEngine: true,
    novoPricing: true,
    novoCashback: true,
    novoEstoque: true,
  };

  /**
   * Verifica se uma Feature Flag específica está ativa para o contexto fornecido,
   * permitindo ativação gradual por loja/grupo (tenant) ou fallback seguro.
   */
  public static isEnabled(context: BusinessContext, flag: string): boolean {
    // 1. Verificar override direto no tenant (configuracoes_loja)
    const tenantConfigs = context.tenant?.configuracoes || {};
    const tenantOverride = tenantConfigs[`flag_${flag}`] ?? tenantConfigs[flag];
    
    if (tenantOverride !== undefined) {
      return String(tenantOverride) === 'true' || tenantOverride === true;
    }

    // 2. Verificar variáveis de ambiente no Node (process.env) se aplicável
    if (typeof process !== 'undefined' && process.env) {
      const envOverride = process.env[`NEXT_PUBLIC_FLAG_${flag.toUpperCase()}`] ?? process.env[`FLAG_${flag.toUpperCase()}`];
      if (envOverride !== undefined) {
        return envOverride === 'true';
      }
    }

    // 3. Fallback para a flag padrão da Holding
    return this.defaultFlags[flag] ?? false;
  }

  /**
   * Retorna todas as flags ativas no contexto
   */
  public static getAllFlags(context: BusinessContext): Record<string, boolean> {
    const allFlags: Record<string, boolean> = {};
    for (const key of Object.keys(this.defaultFlags)) {
      allFlags[key] = this.isEnabled(context, key);
    }
    return allFlags;
  }
}
