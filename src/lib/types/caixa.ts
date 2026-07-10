// ============================================
// SHOPMIND — MÓDULO CAIXA INTELIGENTE: TIPOS
// ============================================

export interface Caixa {
  id: string;
  loja_id: string;
  usuario_id: string;
  valor_abertura: number;
  valor_fechamento: number | null;
  total_vendas: number;
  total_dinheiro: number;
  total_pix: number;
  total_cartao_credito: number;
  total_cartao_debito: number;
  total_sangrias: number;
  total_suprimentos: number;
  quantidade_vendas: number;
  observacao: string | null;
  status: "aberto" | "fechado";
  aberto_em: string;
  fechado_em: string | null;
  // Relacionado (opcional)
  usuario_nome?: string;
}

export interface MovimentacaoCaixa {
  id: string;
  loja_id: string;
  caixa_id: string;
  usuario_id: string;
  tipo: "sangria" | "suprimento" | "venda" | "cancelada";
  valor: number;
  motivo: string | null;
  created_at: string;
  // Relacionado (opcional)
  usuario_nome?: string;
  venda_numero?: number; // Para identificar a venda
}

export interface CaixaFilter {
  status?: "todos" | "aberto" | "fechado";
  usuario_id?: string | "todos";
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  perPage?: number;
}

export interface CaixaIAInsight {
  id: string;
  tipo: "info" | "alerta" | "perigo" | "sucesso";
  titulo: string;
  descricao: string;
  acao?: string;
  acaoLabel?: string;
}

/** Formata valor em Real Brasileiro (BRL) */
export function formatBRL(value: number | string): string {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue || 0);
}

/** Calcula o saldo de dinheiro esperado na gaveta física */
export function getSaldoDinheiroEsperado(caixa: Caixa): number {
  return (
    Number(caixa.valor_abertura) +
    Number(caixa.total_dinheiro) +
    Number(caixa.total_suprimentos) -
    Number(caixa.total_sangrias)
  );
}

/** Calcula a quebra/diferença de caixa no fechamento */
export function getDiferencaFechamento(caixa: Caixa): number {
  if (caixa.valor_fechamento === null) return 0;
  return Number(caixa.valor_fechamento) - getSaldoDinheiroEsperado(caixa);
}
