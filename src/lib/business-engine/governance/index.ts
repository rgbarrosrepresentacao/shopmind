// ============================================
// CORE BUSINESS RULES ENGINE — GOVERNANCE
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import { PermissionEngine } from '../permissions';
import { ValidationEngine } from '../validators';
import { PolicyAggregator } from '../policies';

export class GovernanceEngine {
  private permissionEngine = new PermissionEngine();
  private validationEngine = new ValidationEngine();

  /**
   * Executa a governança corporativa sobre uma determinada ação.
   * Aplica em pipeline: Permissões (RBAC) -> Validação Básica -> Políticas Personalizadas.
   */
  public evaluate(
    context: BusinessContext,
    action: string,
    customPolicyEvaluation?: () => BusinessDecision
  ): BusinessDecision {
    const start = Date.now();
    const decisions: BusinessDecision[] = [];

    // 1. Validar Permissões (RBAC)
    const permDecision = this.permissionEngine.check(context, action);
    decisions.push(permDecision);

    if (!permDecision.allowed) {
      return PolicyAggregator.aggregate(decisions, 'GovernanceEngine');
    }

    // 2. Executar validações ou políticas específicas passadas via callback
    if (customPolicyEvaluation) {
      const policyDecision = customPolicyEvaluation();
      decisions.push(policyDecision);
    }

    const consolidated = PolicyAggregator.aggregate(decisions, 'GovernanceEngine');
    return {
      ...consolidated,
      executionTime: Date.now() - start,
    };
  }
}
