// ============================================
// SHOPMIND — MÓDULO FINANCEIRO INTELIGENTE: TIPOS
// ============================================

export type FinanceiroTipo = "receita" | "despesa";
export type FinanceiroStatus = "pendente" | "pago" | "cancelado" | "atrasado";

// ---------- TRANSAÇÃO FINANCEIRA ----------
export interface FinanceiroTransacao {
  id: string;
  loja_id: string;
  tipo: FinanceiroTipo;
  descricao: string;
  valor: number;
  categoria: string;
  referencia_id: string | null;
  cliente_id: string | null;
  fornecedor_id: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: FinanceiroStatus;
  observacao: string | null;
  origem: string; // 'manual', 'pdv', 'compra', 'ajuste', 'transferencia'
  numero_parcela: number;
  total_parcelas: number;
  conta_bancaria_id?: string | null;
  meta_financeira_id?: string | null;
  created_at: string;
  
  valor_pago?: number | null;
  
  // Relações estendidas (joins)
  cliente?: {
    nome: string;
    telefone?: string | null;
  } | null;
  fornecedor?: {
    nome: string;
    telefone?: string | null;
  } | null;
  cliente_nome?: string | null;
  fornecedor_nome?: string | null;
}

// ---------- KPIs DO PAINEL ----------
export interface FinanceiroKPIs {
  saldoConsolidado: number;       // Receitas recebidas - Despesas pagas
  receitasMes: number;            // Receitas recebidas no mês corrente
  despesasMes: number;            // Despesas pagas no mês corrente
  lucroMes: number;               // receitasMes - despesasMes
  contasReceberPendente: number;  // Receitas pendentes/atrasadas
  contasPagarPendente: number;    // Despesas pendentes/atrasadas
  inadimplenciaValor: number;     // Receitas vencidas (atrasadas)
  margemOperacional: number;      // (lucroMes / receitasMes) * 100
  resultadoProjetado: number;     // Saldo atual + (A Receber - A Pagar nos próximos 30 dias)
  saudeFinanceiraScore: number;   // Indicador de saúde financeira (0 a 100)
}

// ---------- DRE SIMPLIFICADO ----------
export interface DRESimplificado {
  mes: number;
  ano: number;
  receitaBruta: number;           // Total de receitas sem descontos
  deducoesDescontos: number;      // Descontos concedidos nas vendas
  receitaLiquida: number;         // Receita Bruta - Deduções
  custoMercadorias: number;       // CMV (preço de custo dos produtos vendidos)
  lucroBruto: number;             // Receita Líquida - CMV
  despesasOperacionais: number;   // Aluguel, funcionários, impostos, etc.
  lucroLiquido: number;           // Lucro Bruto - Despesas
  margemBruta: number;            // (Lucro Bruto / Receita Líquida) * 100
  margemLiquida: number;           // (Lucro Líquido / Receita Líquida) * 100
}

// ---------- FLUXO DE CAIXA PROJETADO ----------
export interface FluxoCaixaItem {
  data: string;
  entradas: number;
  saidas: number;
  saldoProjetado: number;
}

export interface FluxoCaixaProjecao {
  diario: FluxoCaixaItem[];
  semanal: {
    semana: string;
    entradas: number;
    saidas: number;
    saldoProjetado: number;
  }[];
  mensal: {
    mes: string;
    entradas: number;
    saidas: number;
    saldoProjetado: number;
  }[];
}

// ---------- DEVEDORES / INADIMPLÊNCIA ----------
export interface InadimplenciaDevedor {
  cliente_id: string;
  cliente_nome: string;
  cliente_telefone?: string | null;
  total_atrasado: number;
  qtd_titulos: number;
  dias_atraso_max: number;
}

// ---------- IA FINANCEIRA INSIGHTS ----------
export interface FinanceiroIAInsight {
  id: string;
  tipo: "alerta" | "sucesso" | "perigo" | "info";
  titulo: string;
  descricao: string;
  acao?: string;
  acaoLabel?: string;
}

// ---------- PREPARAÇÃO FUTURA: METAS E CONTAS ----------
export interface MetaFinanceira {
  id: string;
  loja_id: string;
  titulo: string;
  tipo: "receita" | "despesa" | "lucro" | "economia";
  valor_alvo: number;
  valor_atingido: number;
  data_inicio: string;
  data_fim: string;
  status: "em_andamento" | "atingida" | "nao_atingida";
  created_at: string;
}

export interface ContaBancaria {
  id: string;
  loja_id: string;
  nome: string;
  tipo: "corrente" | "poupanca" | "caixa_fisico" | "outros";
  banco: string | null;
  saldo: number;
  created_at: string;
}
