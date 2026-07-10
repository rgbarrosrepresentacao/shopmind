// ============================================
// SHOPMIND — MÓDULO DE TRANSFERÊNCIAS: TIPOS
// ============================================

export type TransferenciaStatus =
  | "rascunho"
  | "solicitada"
  | "aprovada"
  | "em_transito"
  | "recebida"
  | "parcialmente_recebida"
  | "cancelada"
  | "recusada";

export type DivergenciaMotivo =
  | "Produto quebrado"
  | "Produto faltando"
  | "Extravio"
  | "Erro de separação"
  | "Outro";

export interface TransferenciaEstoque {
  id: string;
  grupo_id: string;
  loja_origem_id: string;
  loja_destino_id: string;
  status: TransferenciaStatus;
  solicitado_por: string | null;
  aprovado_por: string | null;
  enviado_por: string | null;
  recebido_por: string | null;
  cancelado_por: string | null;
  data_solicitacao: string | null;
  data_aprovacao: string | null;
  data_envio: string | null;
  data_recebimento: string | null;
  data_cancelamento: string | null;
  motivo_cancelamento: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;

  // Numeração e Metadados Enterprise
  codigo_corporativo: string | null;
  motivo: string;
  prioridade: string;

  // Dados Logísticos
  transportadora: string | null;
  motorista: string | null;
  placa: string | null;
  valor_frete: number;
  peso: number;
  volumes: number;
  data_prevista: string | null;
  observacoes_logistica: string | null;
  numero_conhecimento: string | null;
  status_entrega: string | null;

  // Workflow de Aprovação Complexo
  aprovado_supervisor_por: string | null;
  aprovado_financeiro_por: string | null;
  aprovado_dono_por: string | null;
  data_aprovacao_supervisor: string | null;
  data_aprovacao_financeiro: string | null;
  data_aprovacao_dono: string | null;

  // Populated fields
  loja_origem_nome?: string;
  loja_destino_nome?: string;
  solicitante_nome?: string;
  aprovador_nome?: string;
  enviado_nome?: string;
  recebido_nome?: string;
  cancelado_nome?: string;
  itens_count?: number;
  itens?: TransferenciaEstoqueItem[];
}

export interface TransferenciaEstoqueItem {
  id: string;
  transferencia_id: string;
  produto_mestre_id: string;
  produto_origem_id: string;
  produto_destino_id: string | null;
  quantidade_solicitada: number;
  quantidade_enviada: number;
  quantidade_recebida: number;
  custo_unitario: number;
  divergencia_motivo: DivergenciaMotivo | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;

  // Populated fields
  produto_nome?: string;
  produto_sku?: string;
  produto_barcode?: string;
  produto_foto?: string | null;
  produto_unidade?: string;
  estoque_origem_atual?: number;
  estoque_destino_atual?: number;
}

export interface TransferenciaFluxo {
  grupo_id: string;
  exige_supervisor: boolean;
  exige_financeiro: boolean;
  exige_dono: boolean;
  exige_dupla_aprovacao: boolean;
  aprovacao_automatica: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TransferenciaAgendada {
  id: string;
  grupo_id: string;
  loja_origem_id: string;
  loja_destino_id: string;
  status: "ativo" | "pausado" | "executado" | "erro";
  frequencia: "uma_vez" | "diario" | "semanal" | "mensal";
  data_agendada: string | null;
  dia_semana: number | null;
  dia_mes: number | null;
  motivo: string;
  prioridade: string;
  observacao: string | null;
  ultimo_erro: string | null;
  ultima_execucao: string | null;
  created_at: string;
  updated_at: string;

  // Joins
  loja_origem_nome?: string;
  loja_destino_nome?: string;
  itens?: TransferenciaAgendadaItem[];
}

export interface TransferenciaAgendadaItem {
  id: string;
  agendamento_id: string;
  produto_mestre_id: string;
  quantidade: number;
  created_at: string;

  // Joins
  produto_nome?: string;
  produto_sku?: string;
}

export interface PrevisaoRuptura {
  produtoId: string;
  produtoMestreId: string;
  produtoNome: string;
  sku: string | null;
  barcode: string | null;
  lojaId: string;
  lojaNome: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  mediaDiariaVendas: number;
  diasRestantes: number;
  dataPrevisaoRuptura: string | null;
}

export interface SmartSuggestion {
  produtoMestreId: string;
  produtoNome: string;
  produtoSku: string | null;
  produtoBarcode: string | null;
  lojaOrigemId: string;
  lojaOrigemNome: string;
  estoqueOrigemDisponivel: number;
  lojaDestinoId: string;
  lojaDestinoNome: string;
  estoqueDestinoAtual: number;
  estoqueDestinoMinimo: number;
  quantidadeSugerida: number;
  razao: string;

  // Campos Financeiros e Logísticos Estendidos
  valorEstoque: number;
  frete: number;
  tempoEstimado: number; // em dias
  economiaObtida: number; // economia financeira obtida ao reordenar
}

export interface CorporateStockMatrixRow {
  produtoMestreId: string;
  produtoNome: string;
  produtoSku: string | null;
  produtoBarcode: string | null;
  produtoUnidade: string;
  estoquesPorLoja: Record<string, {
    estoque_atual: number;
    estoque_reservado: number;
    estoque_minimo: number;
    status_estoque: "normal" | "baixo" | "critico" | "zerado" | "excesso";
  }>;
  estoqueTotalGrupo: number;
  valorTotalGrupo: number;
}

export interface CorporateStockKPIs {
  valorTotalEstoque: number;
  valorEmTransito: number;
  produtosEmTransito: number;
  transferenciasPendentes: number;
  transferenciasAtrasadas: number;
  produtosComRuptura: number;
  produtosComExcesso: number;
  filialQueMaisEnvia: string;
  filialQueMaisRecebe: string;
  tempoMedioTransferencia: number; // em dias
  economiaGerada: number; // em reais
}

// ============================================
// HELPERS E FORMATADORES
// ============================================

export function getLabelStatusTransferencia(status: TransferenciaStatus): string {
  const labels: Record<TransferenciaStatus, string> = {
    rascunho: "Rascunho",
    solicitada: "Solicitada",
    aprovada: "Aprovada",
    em_transito: "Em Trânsito",
    recebida: "Recebida",
    parcialmente_recebida: "Parcialmente Recebida",
    cancelada: "Cancelada",
    recusada: "Recusada",
  };
  return labels[status] || status;
}

export function getCorStatusTransferencia(status: TransferenciaStatus): string {
  const cores: Record<TransferenciaStatus, string> = {
    rascunho: "gray",
    solicitada: "blue",
    aprovada: "yellow",
    em_transito: "purple",
    recebida: "green",
    parcialmente_recebida: "orange",
    cancelada: "red",
    recusada: "red",
  };
  return cores[status] || "gray";
}
