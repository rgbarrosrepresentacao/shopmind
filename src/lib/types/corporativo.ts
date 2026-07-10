// ============================================
// SHOPMIND — MÓDULO CORPORATIVO EXECUTIVO: TIPOS
// ============================================

export interface KPIsCorporativos {
  faturamentoHoje: number;
  faturamentoOntem: number;
  faturamentoSemana: number;
  faturamentoMes: number;
  faturamentoAno: number;
  lucroBruto: number;
  lucroLiquido: number;
  margemLucro: number;
  ticketMedio: number;
  fluxoCaixa: number;
  contasReceber: number;
  contasPagar: number;
  capitalDeGiro: number;
  caixaConsolidado: number;
  produtosAtivos: number;
  valorEstoque: number;
  produtosCriticos: number;
  comprasMes: number;
  clientesAtivos: number;
  clientesVIP: number;
  totalFornecedores: number;
  totalFuncionarios: number;
  totalFiliais: number;
  caixasAbertos: number;
  healthScore: number;

  // Novos KPIs Contábeis CEO Enterprise
  quantidadeClientes: number;
  novosClientes: number;
  clientesInativos: number;
  produtosVendidos: number;
  pedidosCount: number;
  capitalEmTransito: number;
  capitalReservado: number;
  capitalParado: number;
  saldoBancario: number;
  isCustoFallback: boolean; // Indica se o cálculo do CMV/Lucro usou fallback de preço de custo
  receitasPagasMes: number;
  despesasPagasMes: number;
}

export interface FilialCardExecutivo {
  id: string;
  nome: string;
  cidade: string | null;
  status: string;
  faturamentoHoje: number;
  faturamentoMes: number;
  lucroMes: number;
  margemMes: number;
  caixasAbertos: number;
  funcionariosOnline: number;
  produtosCriticos: number;
  clientesAtendidosHoje: number;
  ticketMedioMes: number;
  metaMes: number;
  percentualMeta: number;
  faturamentoOntem: number;
  faturamentoMesAnterior: number;

  // Novos KPIs por filial na Visão Corporativa
  funcionariosCount: number;
  clientesCount: number;
  estoqueQtd: number;
  estoqueValor: number;
  caixaAberto: boolean;
  transferenciasCount: number;
  pedidosCount: number;
  alertasCount: number;
  healthScore: number;
}

export interface RankingItem {
  lojaId: string;
  lojaNome: string;
  valor: number;
  posicao: number;
}

export interface RankingsCorporativos {
  faturamento: RankingItem[];
  lucro: RankingItem[];
  margem: RankingItem[];
  crescimento: RankingItem[];
  ticketMedio: RankingItem[];
  clientesAtendidos: RankingItem[];
  estoqueValor: RankingItem[];
}

export interface BenchmarkItem {
  lojaId: string;
  lojaNome: string;
  receita: number;
  lucro: number;
  margem: number;
  ticketMedio: number;
  clientes: number;
  estoqueValor: number;
  receitaVsMedia: number;
  lucroVsMedia: number;
}

export interface SolicitacaoAprovacao {
  id: string;
  grupo_id: string;
  loja_id: string;
  loja_nome: string;
  tipo:
    | 'compra_alto_valor'
    | 'desconto_elevado'
    | 'cancelamento_venda'
    | 'ajuste_financeiro'
    | 'transferencia_estoque'
    | 'mudanca_preco'
    | 'mudanca_estoque'
    | 'mudanca_usuario';
  descricao: string;
  valor: number | null;
  status: 'pendente' | 'aprovado' | 'reprovado' | 'revisao';
  solicitado_por_nome: string;
  solicitado_em: string;
  resolvido_em?: string | null;
  resolvido_por_nome?: string | null;
  observacoes?: string | null;
}

export interface NotificacaoExecutiva {
  id: string;
  tipo: 'erro' | 'alerta' | 'sucesso' | 'info';
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  loja_name?: string | null; // alterado para casar com retorno da junção
  loja_nome?: string | null;
}

export interface MetaCorporativa {
  id: string;
  loja_id: string | null;
  loja_name: string;
  tipo:
    | 'grupo'
    | 'filial'
    | 'gerente'
    | 'equipe'
    | 'categoria'
    | 'fornecedor'
    | 'produto'
    | 'cliente'
    | 'vendedor';
  referencia_id: string | null;
  referencia_nome: string;
  metrica: 'faturamento' | 'vendas_qtd' | 'margem' | 'novos_clientes';
  valor_alvo: number;
  valor_atual: number;
  periodo: string;
  data_inicio: string;
  data_fim: string;
  percentual: number;
}

// ============================================
// NOVAS INTERFACES CEO ENTERPRISE (FASE 16C)
// ============================================

export interface AlertaCorporativo {
  id: string;
  lojaId: string;
  lojaNome: string;
  tipo: 'critico' | 'atencao' | 'info';
  categoria: 'caixa' | 'estoque' | 'transferencia' | 'financeiro' | 'cliente' | 'seguranca' | 'geral';
  titulo: string;
  mensagem: string;
  created_at: string;
}

export interface CEOActivityEvent {
  id: string;
  lojaId: string;
  lojaNome: string;
  usuarioId: string;
  usuarioNome: string;
  tipo:
    | 'venda'
    | 'compra'
    | 'sangria'
    | 'suprimento'
    | 'abertura_caixa'
    | 'fechamento_caixa'
    | 'transferencia'
    | 'estoque'
    | 'usuario'
    | 'acesso_negado'
    | 'critico';
  descricao: string;
  dadosNovos?: any;
  created_at: string;
}

export interface PrevisoesCorporativas {
  receitaProjetada30Dias: number;
  lucroProjetado30Dias: number;
  fluxoCaixaProjetado30Dias: number;
  comprasSugeridasValor: number;
  clientesNovosProjetados: number;
  alertasSazonalidade: string[];
}

export interface CurvaABCItem {
  produtoMestreId: string;
  nome: string;
  receita: number;
  percentualShare: number;
  percentualAcumulado: number;
  classe: 'A' | 'B' | 'C';
}

export interface ComercialStats {
  topProdutos: { id: string; nome: string; quantidade: number; receita: number }[];
  topCategorias: { nome: string; quantidade: number; receita: number }[];
  topMarcas: { nome: string; quantidade: number; receita: number }[];
  topClientes: { id: string; nome: string; totalGasto: number; comprasCount: number }[];
  topVendedores: { id: string; nome: string; totalVendido: number; vendasCount: number }[];
  curvaABC: CurvaABCItem[];
  taxaConversao: number;
  frequenciaCompra: number;
}

export interface LogisticoStats {
  transferenciasCount: number;
  produtosEmTransito: number;
  rupturasCount: number;
  excessosCount: number;
  capitalEmTransito: number;
  tempoMedioTransito: number; // em dias
  custoFreteAcumulado: number;
}

export interface RHStats {
  usuariosAtivos: {
    id: string;
    nome: string;
    cargo: string;
    email: string;
    ultimaLoja: string;
    ultimoAcesso: string | null;
  }[];
  auditoriaResumo: {
    usuarioNome: string;
    totalOperacoes: number;
    operacoesCriticas: number;
  }[];
  caixasAtivos: {
    operadorNome: string;
    lojaNome: string;
    abertoEm: string;
  }[];
}

export interface CEODashboardDossier {
  kpis: KPIsCorporativos;
  filiais: FilialCardExecutivo[];
  rankings: RankingsCorporativos;
  benchmark: BenchmarkItem[];
  aprovacoes: SolicitacaoAprovacao[];
  alertas: AlertaCorporativo[];
  timeline: CEOActivityEvent[];
  metas: MetaCorporativa[];
  comercial: ComercialStats;
  logistico: LogisticoStats;
  rh: RHStats;
  previsoes: PrevisoesCorporativas;
  sangriasHoje?: SangriaHoje[];
  descontosHoje?: DescontoHojeItem[];
}

export interface SangriaHoje {
  id: string;
  lojaId: string;
  lojaNome: string;
  usuarioNome: string;
  valor: number;
  motivo: string;
  hora: string;
}

export interface DescontoHojeItem {
  vendaNumero: number;
  lojaNome: string;
  usuarioNome: string;
  produtoNome: string;
  valorOriginal: number;
  valorDesconto: number;
  hora: string;
}

