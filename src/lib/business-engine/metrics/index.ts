// ============================================
// CORE BUSINESS RULES ENGINE — METRICS ENGINE
// ============================================

export interface MetricEntry {
  timestamp: string;
  operation: string;
  executionTime: number;
  rulesCount: number;
  eventsCount: number;
  success: boolean;
  error?: string | null;
}

export class MetricsEngine {
  private static telemetryLog: MetricEntry[] = [];
  private static maxLogSize = 1000; // Mantém no máximo 1000 registros na memória para evitar vazamento

  /**
   * Registra a telemetria de uma operação executada pelo Core Engine.
   */
  public record(entry: Omit<MetricEntry, 'timestamp'>): void {
    const fullEntry: MetricEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    MetricsEngine.telemetryLog.push(fullEntry);
    
    // Evita consumo indefinido de memória (FIFO)
    if (MetricsEngine.telemetryLog.length > MetricsEngine.maxLogSize) {
      MetricsEngine.telemetryLog.shift();
    }

    // Alerta no console em ambiente de desenvolvimento se houver execução muito lenta
    if (entry.executionTime > 500) {
      console.warn(
        `⚠️ [MetricsEngine] Operação LENTA detectada: "${entry.operation}" demorou ${entry.executionTime}ms (Regras: ${entry.rulesCount} | Sucesso: ${entry.success})`
      );
    }
  }

  /**
   * Obtém a lista consolidada de telemetria para monitoramento do CEO/Dono.
   */
  public getMetricsSummary() {
    const log = MetricsEngine.telemetryLog;
    if (log.length === 0) {
      return {
        totalOperations: 0,
        averageExecutionTime: 0,
        successRate: 100,
        totalRulesExecuted: 0,
        totalEventsTriggered: 0,
      };
    }

    const totalOperations = log.length;
    const totalTime = log.reduce((acc, l) => acc + l.executionTime, 0);
    const successful = log.filter(l => l.success).length;
    const totalRules = log.reduce((acc, l) => acc + l.rulesCount, 0);
    const totalEvents = log.reduce((acc, l) => acc + l.eventsCount, 0);

    return {
      totalOperations,
      averageExecutionTime: Math.round(totalTime / totalOperations),
      successRate: Math.round((successful / totalOperations) * 100),
      totalRulesExecuted: totalRules,
      totalEventsTriggered: totalEvents,
    };
  }

  /**
   * Limpa a telemetria registrada
   */
  public clear(): void {
    MetricsEngine.telemetryLog = [];
  }
}
