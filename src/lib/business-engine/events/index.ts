// ============================================
// CORE BUSINESS RULES ENGINE — EVENT BUS
// ============================================

import type { DomainEvent, EventSubscriber } from '../types';

export class EventBus {
  private static subscribersMap = new Map<string, EventSubscriber[]>();

  /**
   * Registra um subscriber para escutar um determinado evento de domínio
   */
  public static subscribe(eventName: string, subscriber: EventSubscriber): void {
    if (!this.subscribersMap.has(eventName)) {
      this.subscribersMap.set(eventName, []);
    }
    const list = this.subscribersMap.get(eventName)!;
    
    // Evita duplicados
    if (list.some(s => s.name === subscriber.name)) {
      return;
    }
    
    list.push(subscriber);
    // Ordena por prioridade (menor prioridade executa primeiro)
    list.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Desregistra um subscriber
   */
  public static unsubscribe(eventName: string, subscriberName: string): void {
    const list = this.subscribersMap.get(eventName);
    if (list) {
      this.subscribersMap.set(eventName, list.filter(s => s.name !== subscriberName));
    }
  }

  /**
   * Publica um evento de domínio executando todos os ouvintes registrados em sequência.
   * A execução é sequencial respeitando a prioridade para garantir integridade contábil/auditoria.
   */
  public static async publish<P = any>(event: DomainEvent<P>): Promise<void> {
    const subscribers = this.subscribersMap.get(event.name) || [];
    
    if (subscribers.length === 0) {
      return;
    }

    // Registrar telemetria simples
    const start = Date.now();
    
    for (const subscriber of subscribers) {
      try {
        await subscriber.handle(event);
      } catch (error) {
        // Garantir resiliência: falha de um subscriber não interrompe os outros
        console.error(
          `[EventBus] Erro ao executar subscriber "${subscriber.name}" no evento "${event.name}":`,
          error
        );
      }
    }

    // Telemetria opcional
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`[EventBus] Execução lenta dos ouvintes do evento "${event.name}": ${duration}ms`);
    }
  }
}
