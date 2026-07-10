// ============================================
// SHOPMIND — MÓDULO DE PRODUTOS: TIPOS
// ============================================

// ---------- PRODUTO ----------

export interface ProductMestre {
  id: string;
  grupo_id: string;
  nome: string;
  descricao: string | null;
  marca: string | null;
  categoria_nome: string | null;
  codigo_barras: string | null;
  unidade: string;
  foto_url: string | null;
  fotos_galeria?: string[] | null; // Galeria de imagens futuras
  favorito: boolean;
  destaque: boolean;
  ncm: string | null;
  cest: string | null;
  origem_fiscal: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductFilialConfig {
  id: string; // ID operacional local na filial
  loja_id: string;
  produto_mestre_id: string | null;
  produto_grupo_id: string | null; // Retrocompatibilidade
  categoria_id: string | null; // Categoria local na filial
  sku: string | null;
  preco_custo: number;
  preco_venda: number;
  preco_promocional: number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo: number;
  corredor: string | null;
  prateleira: string | null;
  deposito: string | null;
  lote: string | null;
  validade: string | null;
  status: "ativo" | "inativo";
  permitir_venda: boolean;
  permitir_compra: boolean;
  permitir_transferencia: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Product estende ambos os tipos para representação denormalizada local, mantendo retrocompatibilidade total
export interface Product extends ProductMestre, Omit<ProductFilialConfig, "id" | "created_at" | "updated_at" | "deleted_at"> {
  id: string; // ID local para não quebrar tabelas e chaves estrangeiras operacionais
  produto_mestre_id: string | null;
  produto_grupo_id: string | null;
  categoria?: Category | null;
}

/** Campos computados no client-side */
export interface ProductComputed {
  lucro: number;
  margem: number;
  estoqueStatus: "normal" | "baixo" | "critico" | "zerado";
  margemStatus: "alta" | "media" | "baixa" | "negativa";
  giro: "alto" | "medio" | "baixo" | "sem_movimento";
}

export type ProductWithComputed = Product & ProductComputed;

export interface ProductStoreConfig {
  loja_id: string;
  sku?: string | null;
  preco_venda: number;
  preco_custo: number;
  preco_promocional?: number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo?: number;
  corredor?: string | null;
  prateleira?: string | null;
  deposito?: string | null;
  lote?: string | null;
  validade?: string | null;
  status?: "ativo" | "inativo";
  permitir_venda?: boolean;
  permitir_compra?: boolean;
  permitir_transferencia?: boolean;
}

/** Tipo para criação de produto */
export interface ProductInsert {
  nome: string;
  sku?: string | null;
  codigo_barras?: string | null;
  marca?: string | null;
  descricao?: string | null;
  categoria_id?: string | null;
  categoria_nome?: string | null;
  preco_custo: number;
  preco_venda: number;
  preco_promocional?: number;
  estoque_atual?: number;
  estoque_minimo?: number;
  estoque_maximo?: number;
  corredor?: string | null;
  prateleira?: string | null;
  deposito?: string | null;
  lote?: string | null;
  validade?: string | null;
  unidade?: string;
  status?: "ativo" | "inativo";
  favorito?: boolean;
  destaque?: boolean;
  ncm?: string | null;
  cest?: string | null;
  origem_fiscal?: string | null;
  foto_url?: string | null;
  fotos_galeria?: string[] | null;
  produto_grupo_id?: string | null;
  produto_mestre_id?: string | null;
  permitir_venda?: boolean;
  permitir_compra?: boolean;
  permitir_transferencia?: boolean;
  syncPreco?: "all" | "none";
  // Campos multi-lojas para criação/edição
  disponibilidade_todas?: boolean;
  lojas_config?: ProductStoreConfig[];
}

/** Tipo para atualização parcial */
export type ProductUpdate = Partial<ProductInsert>;

// ---------- FILTROS ----------

export type ProductSortField =
  | "nome"
  | "preco_venda"
  | "preco_custo"
  | "estoque_atual"
  | "margem"
  | "created_at"
  | "updated_at";

export type ProductSortDirection = "asc" | "desc";

export interface ProductFilter {
  search?: string;
  categoria_id?: string | null;
  status?: "ativo" | "inativo" | "todos";
  estoque?: "todos" | "baixo" | "zerado" | "normal";
  favorito?: boolean;
  destaque?: boolean;
  sortBy?: ProductSortField;
  sortDir?: ProductSortDirection;
  page?: number;
  perPage?: number;
}

// ---------- KPIs ----------

export interface ProductKPIs {
  total: number;
  ativos: number;
  semEstoque: number;
  estoqueBaixo: number;
  valorEstoque: number;
  margemMedia: number;
  giroAlto: number;
  giroBaixo: number;
}

// ---------- CATEGORIA ----------

export interface Category {
  id: string;
  loja_id: string;
  nome: string;
  status: string;
  created_at: string;
  _count?: number; // contagem de produtos na categoria
}

export interface CategoryInsert {
  nome: string;
}

// ---------- HISTÓRICO ----------

export interface ProductActivity {
  id: string;
  usuario_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
  // Populated
  usuario_nome?: string;
}

export interface ProductMestreHistory {
  id: string;
  produto_mestre_id: string;
  grupo_id: string;
  loja_id: string;
  usuario_id: string | null;
  acao: string;
  escopo: "global" | "local";
  dados_anteriores: Record<string, any> | null;
  dados_novos: Record<string, any> | null;
  created_at: string;
  // Populated
  usuario_nome?: string;
  loja_nome?: string;
}

// ---------- AUDITORIA DE ESTOQUE ----------

export interface ProductStockAudit {
  totalVendido: number;
  totalComprado: number;
  ultimaMovimentacao: string | null;
  ultimaVenda: string | null;
  movimentacoes30d: number;
}

// ---------- INSIGHTS IA (Placeholder) ----------

export type IAInsightType =
  | "margem_baixa"
  | "sem_venda"
  | "estoque_critico"
  | "campea_vendas"
  | "sem_movimento"
  | "margem_ideal"
  | "proximo_minimo";

export interface IAInsight {
  type: IAInsightType;
  title: string;
  message: string;
  priority: "alta" | "media" | "baixa";
  actionLabel?: string;
}

// ---------- HELPERS ----------

/** Calcula lucro e margem a partir de custo e venda */
export function computeMargin(
  precoCusto: number,
  precoVenda: number
): { lucro: number; margem: number } {
  const lucro = precoVenda - precoCusto;
  const margem = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;
  return { lucro, margem };
}

/** Determina status visual do estoque */
export function computeEstoqueStatus(
  atual: number,
  minimo: number
): ProductComputed["estoqueStatus"] {
  if (atual <= 0) return "zerado";
  if (atual <= minimo) return "critico";
  if (atual <= minimo * 1.5) return "baixo";
  return "normal";
}

/** Determina status visual da margem */
export function computeMargemStatus(
  margem: number
): ProductComputed["margemStatus"] {
  if (margem < 0) return "negativa";
  if (margem < 15) return "baixa";
  if (margem < 30) return "media";
  return "alta";
}

/** Formata valor em reais */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Formata porcentagem */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
