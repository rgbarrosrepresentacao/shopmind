// ============================================
// SHOPMIND — MÓDULO IA GERENTE: TIPOS
// ============================================

export interface IACreditos {
  id: string;
  loja_id: string;
  mes: number;
  ano: number;
  consultas_incluidas: number;
  consultas_utilizadas: number;
  consultas_extras: number;
  limite_diario: number;
  tokens_entrada: number;
  tokens_saida: number;
  tokens_total: number;
  custo_estimado: number;
  renova_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface IALog {
  id: string;
  loja_id: string;
  usuario_id: string | null;
  tipo: string | null;
  pergunta: string;
  resposta: string;
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
  tokens_total: number;
  custo_estimado: number;
  is_cached: boolean;
  status: string; // 'concluida', 'bloqueada', 'falhou'
  created_at: string;
}

export interface IAPacoteCreditos {
  id: string;
  nome: string;
  quantidade_consultas: number;
  valor: number;
  ativo: boolean;
  created_at: string;
}

export interface IACreditosCompra {
  id: string;
  loja_id: string;
  pacote_id: string | null;
  quantidade: number;
  valor: number;
  status: "pendente" | "confirmado" | "cancelado" | "falhou";
  gateway: string | null;
  gateway_payment_id: string | null;
  created_at: string;
  confirmado_em: string | null;

  // Join do pacote
  pacote?: IAPacoteCreditos | null;
}

// ---------- DOSSIÊ E CONTEXTO SEGURO DA LOJA ----------
export interface IASalesSummary {
  faturamentoHoje: number;
  qtdVendasHoje: number;
  faturamentoSemana: number;
  ticketMedioSemana: number;
  produtoMaisVendido: string;
}

export interface IAStockSummary {
  totalItens: number;
  itensSemEstoque: number;
  itensEstoqueBaixo: number;
  itensEstoqueCriticoLista: { nome: string; estoque: number; minimo: number }[];
}

export interface IACustomerSummary {
  totalClientes: number;
  clientesComAtrasos: number;
  valorTotalAtraso: number;
}

export interface IAFinanceSummary {
  saldoConsolidado: number;
  receitasMes: number;
  despesasMes: number;
  aReceberPendente: number;
  aPagarPendente: number;
  saudeFinanceiraScore: number;
}

export interface IASupplierSummary {
  totalFornecedores: number;
  fornecedorLider: string;
  gastoFornecedorLider: number;
}

export interface IACashierSummary {
  caixasAbertos: number;
  saldoCaixaFisico: number;
  diferencaCaixaRecente: number;
}

export interface IAProductSummary {
  totalProdutosCatalogados: number;
  categoriaMaisPopular: string;
  produtosMaiorMargem: { nome: string; margem: number }[];
}

export interface IALoyaltySummary {
  fidelidadeAtivo: boolean;
  totalCampanhasAtivas: number;
  totalPontosAcumulados: number;
  totalPontosResgatados: number;
  totalCashbackGerado: number;
  totalCashbackUtilizado: number;
  saldoCashbackDisponivel: number;
  clientesPorNivelVip: { Bronze: number; Prata: number; Ouro: number; Diamante: number; VIP: number };
  clientesInativos30d: number;
  clientesInativos60d: number;
  clientesInativos90d: number;
  clientesInativos120d: number;
}

export interface IAFiscalSummary {
  totalEmitidos: number;
  totalCancelados: number;
  faturamentoComercial: number;
  ativosOrcamentos: number;
  ativosPedidos: number;
  reimpressoes: number;
  topOperadores: { nome: string; count: number }[];
}

export interface IAStoreContext {
  nomeLoja: string;
  sales?: IASalesSummary;
  stock?: IAStockSummary;
  customer?: IACustomerSummary;
  finance?: IAFinanceSummary;
  supplier?: IASupplierSummary;
  cashier?: IACashierSummary;
  product?: IAProductSummary;
  loyalty?: IALoyaltySummary;
  fiscal?: IAFiscalSummary;
  corporateStock?: {
    kpis: any;
    suggestions: any[];
    matrixSummary: any[];
  };
  predictiveStock?: {
    previsoes: any[];
    sugestoes: any[];
    sugestoesCompra: any[];
  };
}

// ---------- DASHBOARD ADMINISTRATIVO DE CONSUMO DE IA ----------
export interface IAAdminMetrics {
  totalConsultas: number;
  consultasComSucesso: number;
  consultasBloqueadas: number;
  consultasCached: number;
  cacheHitRate: number; // (consultasCached / totalConsultas) * 100
  totalTokens: number;
  custoEstimadoTotal: number;
  consumoPorTipo: { tipo: string; qtd: number }[];
  consumoPorModelo: { modelo: string; qtd: number }[];
  consumoDiarioTimeline: { data: string; qtd: number; cached: number }[];
}
