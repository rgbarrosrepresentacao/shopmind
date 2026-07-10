// ============================================
// CORE BUSINESS RULES ENGINE — HELPERS
// ============================================

export class BusinessHelper {
  /**
   * Formata valores numéricos para o padrão de moeda brasileiro (BRL)
   */
  public static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  /**
   * Arredonda valores de ponto flutuante evitando erros comuns de precisão do JS
   */
  public static round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Calcula a margem de lucro com base no preço de venda e preço de custo
   * Fórmula: (Preço Venda - Preço Custo) / Preço Venda * 100
   */
  public static calculateMargin(salePrice: number, costPrice: number): number {
    if (salePrice <= 0) return 0;
    const profit = salePrice - costPrice;
    return this.round((profit / salePrice) * 100, 2);
  }

  /**
   * Converte metadados em string/JSON em objeto seguro de forma resiliente
   */
  public static parseMetadata(data: any): Record<string, any> {
    if (!data) return {};
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return { raw: data };
      }
    }
    if (typeof data === 'object') {
      return data;
    }
    return { value: data };
  }

  /**
   * Retorna a diferença em dias entre duas datas
   */
  public static dateDiffInDays(date1: Date | string, date2: Date | string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Executa uma verificação segura de permissão de horário de funcionamento
   */
  public static isWithinWorkingHours(startHour: number = 7, endHour: number = 22): boolean {
    const now = new Date();
    // Ajustado para o fuso horário padrão do servidor (America/Sao_Paulo) se necessário,
    // mas a verificação local em ambiente Next.js já cobre a maioria dos casos de Server Actions.
    const currentHour = now.getHours();
    return currentHour >= startHour && currentHour < endHour;
  }
}
