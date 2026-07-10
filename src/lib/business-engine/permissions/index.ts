// ============================================
// CORE BUSINESS RULES ENGINE — PERMISSIONS
// ============================================

import type { BusinessContext, BusinessDecision } from '../types';
import { ROLES } from '../constants';

export class PermissionEngine {
  // Mapa de permissões por perfil (RBAC) expandido para Procurement Core (Fase 4A)
  private rolePermissions: Record<string, string[]> = {
    [ROLES.DONO]: ['*'], // Acesso irrestrito a todas as ações
    [ROLES.GERENTE]: [
      'venda:criar', 'venda:cancelar', 'venda:listar',
      'estoque:listar', 'estoque:ajustar', 'estoque:reservar',
      'transferencia:solicitar', 'transferencia:aprovar', 'transferencia:enviar', 'transferencia:receber',
      'financeiro:listar', 'financeiro:visualizar',
      'cliente:criar', 'cliente:listar', 'produto:listar', 'produto:criar', 'produto:editar',
      // Compras (Fase 4A)
      'compra:solicitar', 'compra:aprovar', 'compra:cotar', 'compra:visualizar', 'compra:cancelar'
    ],
    [ROLES.SUPERVISOR]: [
      'venda:criar', 'venda:listar',
      'estoque:listar', 'estoque:reservar',
      'transferencia:solicitar', 'transferencia:enviar', 'transferencia:receber',
      'cliente:criar', 'cliente:listar', 'produto:listar',
      // Compras (Fase 4A)
      'compra:solicitar', 'compra:receber', 'compra:visualizar'
    ],
    [ROLES.ESTOQUISTA]: [
      'estoque:listar', 'estoque:ajustar', 'estoque:reservar',
      'transferencia:solicitar', 'transferencia:enviar', 'transferencia:receber',
      'produto:listar',
      // Compras (Fase 4A)
      'compra:receber', 'compra:visualizar'
    ],
    [ROLES.FINANCEIRO]: [
      'financeiro:listar', 'financeiro:visualizar', 'financeiro:ajustar',
      'venda:listar', 'produto:listar',
      // Compras (Fase 4A)
      'compra:visualizar'
    ],
    // Comprador corporativo ou de filial
    'comprador': [
      'compra:solicitar', 'compra:cotar', 'compra:visualizar',
      'produto:listar', 'estoque:listar'
    ],
    // Fiscal
    'fiscal': [
      'financeiro:visualizar', 'compra:visualizar', 'produto:listar'
    ],
    [ROLES.VENDEDOR]: [
      'venda:criar', 'venda:listar',
      'cliente:criar', 'cliente:listar',
      'produto:listar', 'estoque:listar'
    ],
    [ROLES.CAIXA]: [
      'venda:criar', 'venda:listar',
      'cliente:criar', 'cliente:listar',
      'produto:listar', 'estoque:listar'
    ],
  };

  /**
   * Verifica se o usuário ativo no contexto possui permissão para realizar uma ação.
   * Retorna uma BusinessDecision detalhada.
   */
  public check(context: BusinessContext, action: string): BusinessDecision {
    const start = Date.now();
    const userRole = context.actor.tipo;
    const allowedActions = this.rolePermissions[userRole] || [];

    // 1. Validar se o usuário está ativo
    if (context.actor.usuarioId === 'anonymous') {
      return this.createDecision(false, 'Usuário não autenticado no sistema.', start);
    }

    // 2. Verificar correspondência direta ou caractere curinga (*) para Dono
    const isAllowed = allowedActions.includes('*') || allowedActions.includes(action);

    if (!isAllowed) {
      return this.createDecision(
        false,
        `Perfil '${userRole}' não possui permissão para a operação '${action}'.`,
        start,
        [userRole === ROLES.CAIXA || userRole === ROLES.VENDEDOR ? ROLES.GERENTE : ROLES.DONO]
      );
    }

    // 3. Permissão concedida
    return this.createDecision(true, null, start);
  }

  private createDecision(
    allowed: boolean,
    reason: string | null,
    startTime: number,
    approvalsRequired: string[] = []
  ): BusinessDecision {
    return {
      allowed,
      reason,
      warnings: [],
      approvalsRequired,
      generatedEvents: [],
      metadata: { engine: 'permissions' },
      executionTime: Date.now() - startTime,
    };
  }
}
