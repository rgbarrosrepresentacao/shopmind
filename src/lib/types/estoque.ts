// ============================================
// SHOPMIND — MÓDULO ESTOQUE INTELIGENTE: TIPOS
// ============================================

// ---------- MOVIMENTAÇÃO ----------

export type TipoMovimentacao =
  | 'entrada'
  | 'saida'
  | 'venda'
  | 'compra'
  | 'ajuste'
  | 'perda'
  | 'troca'
  | 'devolucao'
  | 'inventario'
  | 'estoque_inicial'
  | 'transferencia_entrada'
  | 'transferencia_saida';

export interface Movimentacao {
  id: string;
  loja_id: string;
  produto_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: string | null;
  referencia_id: string | null;
  usuario_id: string | null;
  created_at: string;
  // Populados (joins)
  produto?: {
    id: string;
    nome: string;
    sku: string | null;
    unidade: string;
    foto_url: string | null;
  } | null;
  usuario?: {
    id: string;
    nome: string;
  } | null;
}

// ---------- FILTROS DE MOVIMENTAÇÃO ----------

export interface MovimentacaoFilter {
  search?: string;
  tipo?: TipoMovimentacao | 'todos';
  produto_id?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  perPage?: number;
}

// ---------- KPIs DO ESTOQUE ----------

export interface EstoqueKPIs {
  totalProdutos: number;
  itensEmEstoque: number;
  valorTotalEstoque: number;
  valorTotalVenda: number;
  lucroPotencial: number;
  semEstoque: number;
  estoqueBaixo: number;
  produtosParados30d: number;
  produtosParados60d: number;
  produtosParados90d: number;
  produtosCriticos: number;
  giroAlto: number;
  giroMedio: number;
  giroBaixo: number;
  semGiro: number;
  reposicaoNecessaria: number;
}

// ---------- ALERTAS INTELIGENTES ----------

export type AlertaTipo =
  | 'critico'
  | 'sem_movimento'
  | 'proximo_minimo'
  | 'excesso'
  | 'campea_vendas'
  | 'reposicao'
  | 'perda_detectada';

export interface EstoqueAlerta {
  tipo: AlertaTipo;
  produtoId: string;
  produtoNome: string;
  produtoSku: string | null;
  produtoFoto: string | null;
  estoqueAtual: number;
  estoqueMinimo: number;
  unidade: string;
  mensagem: string;
  prioridade: 'alta' | 'media' | 'baixa';
  // Dados contextuais
  diasSemMovimento?: number;
  quantidadeVendida30d?: number;
  previsaoDias?: number;
}

// ---------- GIRO DE ESTOQUE ----------

export type GiroClassificacao = 'alto' | 'medio' | 'baixo' | 'sem_giro';

export interface ProdutoGiro {
  produtoId: string;
  produtoNome: string;
  produtoSku: string | null;
  estoqueAtual: number;
  unidade: string;
  totalVendido30d: number;
  totalVendido60d: number;
  totalVendido90d: number;
  giroMensal: number; // rotações por mês
  classificacao: GiroClassificacao;
  diasEmEstoque: number;
  previsaoRuptura: number | null; // em dias
}

// ---------- PRODUTOS PARADOS ----------

export interface ProdutoParado {
  produtoId: string;
  produtoNome: string;
  produtoSku: string | null;
  produtoFoto: string | null;
  estoqueAtual: number;
  valorEstoque: number;
  unidade: string;
  ultimaMovimentacao: string | null;
  diasSemMovimento: number;
  categoria: string | null;
}

// ---------- INVENTÁRIO ----------

export type InventarioStatus = 'pendente' | 'em_contagem' | 'concluido' | 'cancelado';

export interface InventarioItem {
  produtoId: string;
  produtoNome: string;
  produtoSku: string | null;
  estoqueAntes: number;
  estoqueContado: number | null;
  diferenca: number | null;
  unidade: string;
  conferido: boolean;
}

// ---------- AJUSTE MANUAL ----------

export interface AjusteEstoqueInput {
  produto_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  motivo: string;
}

// ---------- VALOR DO ESTOQUE ----------

export interface ProdutoValorEstoque {
  produtoId: string;
  produtoNome: string;
  produtoSku: string | null;
  produtoFoto: string | null;
  categoria: string | null;
  estoqueAtual: number;
  unidade: string;
  precoCusto: number;
  precoVenda: number;
  valorCustoTotal: number;
  valorVendaTotal: number;
  lucroPotencial: number;
  margemPercent: number;
}

// ---------- DADOS PARA GRÁFICOS ----------

export interface MovimentacaoChartData {
  data: string;
  entradas: number;
  saidas: number;
  vendas: number;
}

// ---------- HELPERS ----------

export function getLabelTipoMovimentacao(tipo: TipoMovimentacao): string {
  const labels: Record<TipoMovimentacao, string> = {
    entrada: 'Entrada',
    saida: 'Saída',
    venda: 'Venda',
    compra: 'Compra',
    ajuste: 'Ajuste',
    perda: 'Perda',
    troca: 'Troca',
    devolucao: 'Devolução',
    inventario: 'Inventário',
    estoque_inicial: 'Estoque Inicial',
    transferencia_entrada: 'Transf. Entrada',
    transferencia_saida: 'Transf. Saída',
  };
  return labels[tipo] || tipo;
}

export function getCorTipoMovimentacao(tipo: TipoMovimentacao): string {
  const cores: Record<TipoMovimentacao, string> = {
    entrada: '#10b981',  // green
    compra: '#10b981',   // green
    estoque_inicial: '#10b981',
    devolucao: '#6366f1',
    saida: '#ef4444',    // red
    venda: '#ef4444',
    perda: '#ef4444',
    ajuste: '#f59e0b',   // amber
    inventario: '#f59e0b',
    troca: '#8b5cf6',    // purple
    transferencia_entrada: '#3b82f6', // blue
    transferencia_saida: '#6366f1',   // indigo
  };
  return cores[tipo] || '#64748b';
}

export function getLabelAlertaTipo(tipo: AlertaTipo): string {
  const labels: Record<AlertaTipo, string> = {
    critico: 'Estoque Crítico',
    sem_movimento: 'Sem Movimentação',
    proximo_minimo: 'Próximo do Mínimo',
    excesso: 'Excesso de Estoque',
    campea_vendas: 'Campeão de Vendas',
    reposicao: 'Reposição Necessária',
    perda_detectada: 'Perda Detectada',
  };
  return labels[tipo] || tipo;
}

export function getLabelGiro(classificacao: GiroClassificacao): string {
  const labels: Record<GiroClassificacao, string> = {
    alto: 'Alto Giro',
    medio: 'Médio Giro',
    baixo: 'Baixo Giro',
    sem_giro: 'Sem Giro',
  };
  return labels[classificacao];
}

export function getCorGiro(classificacao: GiroClassificacao): string {
  const cores: Record<GiroClassificacao, string> = {
    alto: '#10b981',
    medio: '#f59e0b',
    baixo: '#ef4444',
    sem_giro: '#64748b',
  };
  return cores[classificacao];
}
