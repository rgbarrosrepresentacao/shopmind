// ============================================
// SHOPMIND — MÓDULO COMPRAS INTELIGENTES: TIPOS
// ============================================

// ---------- FORNECEDOR ----------

export interface Fornecedor {
  id: string;
  loja_id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: Record<string, string> | null;
  contato: string | null;
  observacao: string | null;
  status: "ativo" | "inativo";
  created_at: string;
}

export interface FornecedorInsert {
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  contato?: string | null;
  observacao?: string | null;
}

// ---------- COMPRA ----------

export type CompraStatus = "rascunho" | "pendente" | "pedido" | "concluida" | "cancelada";

export interface Compra {
  id: string;
  loja_id: string;
  fornecedor_id: string;
  usuario_id: string | null;
  numero: number;
  numero_nf: string | null;
  data_compra: string;
  subtotal: number;
  desconto: number;
  total: number;
  observacao: string | null;
  status: CompraStatus;
  metodo_pagamento: string | null;
  data_vencimento: string | null;
  created_at: string;
  // Relações populadas
  fornecedor_nome?: string;
  usuario_nome?: string;
  itens_count?: number;
}

export interface CompraItem {
  id: string;
  compra_id: string;
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  atualizar_custo: boolean;
  custo_anterior: number | null;
  // Campos computados do produto (para exibição)
  produto_preco_venda?: number;
  produto_estoque_atual?: number;
  produto_estoque_minimo?: number;
}

export interface CompraItemInput {
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  atualizar_custo: boolean;
  // Para exibição do controle de custo (não persistido)
  custo_atual?: number;
  preco_venda?: number;
  estoque_atual?: number;
}

export interface CompraDetalhe extends Compra {
  itens: CompraItem[];
  fornecedor?: Fornecedor;
}

// ---------- FILTROS ----------

export interface CompraFilter {
  search?: string;
  fornecedor_id?: string;
  status?: CompraStatus | "todos";
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
  usuario_id?: string;
  page?: number;
  perPage?: number;
}

// ---------- KPIs ----------

export interface CompraKPIs {
  totalMes: number;
  qtdCompras: number;
  fornecedoresAtivos: number;
  produtosComprados: number;
  valorMedio: number;
  ultimaCompra: string | null;
  pendentes: number;
  concluidas: number;
  reposicaoNecessaria: number;
}

// ---------- REPOSIÇÃO INTELIGENTE ----------

export interface ReposicaoSugerida {
  produto_id: string;
  nome: string;
  sku: string | null;
  categoria_nome: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  preco_venda: number;
  margem: number;
  urgencia: "critico" | "alto" | "medio" | "baixo";
  motivo: string;
  quantidade_sugerida: number;
}

// ---------- IA INSIGHTS ----------

export interface CompraIAInsight {
  id: string;
  tipo: "info" | "alerta" | "perigo" | "sucesso";
  titulo: string;
  descricao: string;
  acao?: string;
  acaoLabel?: string;
}

// ---------- HELPERS ----------

export function formatBRL(value: number | string): string {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue || 0);
}

export function getStatusLabel(status: CompraStatus): string {
  const map: Record<CompraStatus, string> = {
    rascunho: "Rascunho",
    pendente: "Pendente",
    pedido: "Pedido",
    concluida: "Concluída",
    cancelada: "Cancelada",
  };
  return map[status] || status;
}

export function getStatusColor(status: CompraStatus): string {
  const map: Record<CompraStatus, string> = {
    rascunho: "bg-slate-100 text-slate-600 border-slate-200",
    pendente: "bg-amber-100 text-amber-700 border-amber-200",
    pedido: "bg-blue-100 text-blue-700 border-blue-200",
    concluida: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelada: "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] || "";
}

/** Calcula impacto na margem */
export function calcularImpactoMargem(
  custoAtual: number,
  novoCusto: number,
  precoVenda: number
): { margemAtual: number; novaMargem: number; diferencaCusto: number; diferencaPercentual: number } {
  const margemAtual = precoVenda > 0 ? ((precoVenda - custoAtual) / precoVenda) * 100 : 0;
  const novaMargem = precoVenda > 0 ? ((precoVenda - novoCusto) / precoVenda) * 100 : 0;
  const diferencaCusto = novoCusto - custoAtual;
  const diferencaPercentual = custoAtual > 0 ? ((novoCusto - custoAtual) / custoAtual) * 100 : 0;
  return { margemAtual, novaMargem, diferencaCusto, diferencaPercentual };
}
