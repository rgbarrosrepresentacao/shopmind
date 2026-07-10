// ============================================
// CORE BUSINESS RULES ENGINE — NOTIFICATIONS
// ============================================

import { createClient } from '@/lib/supabase/server';
import type { BusinessContext } from '../types';

export class NotificationsEngine {
  /**
   * Envia uma notificação sistêmica para usuários do ERP ou canais integrados (ex: email, webhook)
   */
  public async sendAlert(
    context: BusinessContext,
    params: {
      titulo: string;
      mensagem: string;
      destinatarios: string[]; // IDs de usuários ou perfis (Ex: ['gerente', 'dono'])
      tipo: 'info' | 'warning' | 'error' | 'success';
      link?: string;
    }
  ): Promise<boolean> {
    try {
      const supabase = await createClient();
      console.log(`[NotificationsEngine] Enviando alerta "${params.titulo}" para os perfis: ${params.destinatarios.join(', ')}`);

      // Se houver uma tabela de notificações no banco, inserimos.
      // Caso contrário, registramos em logs_atividade para exibição no centro de comando
      const { error } = await supabase.from('logs_atividade').insert({
        loja_id: context.tenant.lojaId,
        usuario_id: null, // Alerta sistêmico
        acao: 'solicitacao',
        entidade: 'usuario',
        dados_novos: {
          alerta_notificacao: true,
          titulo: params.titulo,
          mensagem: params.mensagem,
          tipo: params.tipo,
          destinatarios: params.destinatarios,
          link: params.link,
          created_at: new Date().toISOString(),
        },
      });

      return !error;
    } catch (err) {
      console.error('[NotificationsEngine] Erro ao disparar notificação:', err);
      return false;
    }
  }

  /**
   * Dispara um alerta de ruptura iminente de estoque
   */
  public async triggerStockRuptureAlert(
    context: BusinessContext,
    productName: string,
    sku: string,
    currentQty: number
  ): Promise<void> {
    await this.sendAlert(context, {
      titulo: '⚠️ Estoque Crítico / Ruptura',
      mensagem: `O produto "${productName}" (SKU: ${sku}) atingiu a quantidade crítica de ${currentQty} unidades. Reposição necessária imediatamente.`,
      destinatarios: ['gerente', 'estoquista', 'dono'],
      tipo: 'warning',
      link: '/dashboard/estoque',
    });
  }
}
