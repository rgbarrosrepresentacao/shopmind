import type { Fornecedor, Compra } from "./compras";

export interface FornecedorKPIs {
  total: number;
  ativos: number;
  inativos: number;
  totalComprado: number;
  fornecedorLider: string | null;
  ultimaCompra: string | null;
  ticketMedio: number;
  semComprasRecentes: number;
}

export interface FornecedorListItem extends Fornecedor {
  qtd_compras: number;
  valor_comprado: number;
  ultima_compra: string | null;
  produtos_fornecidos_count: number;
}

export interface FornecedorProdutoFornecido {
  produto_id: string;
  nome: string;
  sku: string | null;
  estoque_atual: number;
  preco_venda: number;
  ultimo_custo: number;
  min_custo: number;
  max_custo: number;
  avg_custo: number;
  ultima_compra: string;
}

export interface FornecedorAuditLog {
  id: string;
  usuario_nome: string;
  acao: string;
  dados_anteriores: any;
  dados_novos: any;
  created_at: string;
}

export interface FornecedorPerfil {
  fornecedor: Fornecedor;
  valor_total_comprado: number;
  qtd_compras: number;
  ticket_medio: number;
  ranking: number;
  score: number;
  recencia: number | null; // dias desde a última compra
  compras: (Compra & { itens_count: number })[];
  produtos: FornecedorProdutoFornecido[];
  logs: FornecedorAuditLog[];
}

export interface FornecedorCustoAlternativo {
  fornecedor_id: string;
  fornecedor_nome: string;
  custo: number;
  ultima_compra: string;
}

export interface ProdutoCustoComparacao {
  produto_id: string;
  nome: string;
  sku: string | null;
  estoque_atual: number;
  preco_venda: number;
  menor_custo: number;
  maior_custo: number;
  diferenca_percentual: number;
  economia_potencial: number;
  fornecedores: FornecedorCustoAlternativo[];
}

export interface FornecedorIAInsight {
  id: string;
  tipo: "info" | "alerta" | "perigo" | "sucesso";
  titulo: string;
  descricao: string;
  acao?: string;
  acaoLabel?: string;
}
