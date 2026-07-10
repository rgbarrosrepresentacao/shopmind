// ============================================
// SHOPMIND — MÓDULO CLIENTES INTELIGENTES: TIPOS
// ============================================

// ---------- CLIENTE ----------

export interface Cliente {
  id: string;
  loja_id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  email: string | null;
  aniversario: string | null; // date string YYYY-MM-DD
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  status: 'ativo' | 'inativo';
  tags: string[];
  total_compras: number;
  total_gasto: number;
  ultima_compra: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  nivel_vip?: string;
  data_entrada_vip?: string | null;
  data_expiracao_vip?: string | null;
}

// ---------- CLASSIFICAÇÃO AUTOMÁTICA ----------

export type ClassificacaoCliente =
  | 'novo'
  | 'ativo'
  | 'frequente'
  | 'vip'
  | 'inativo'
  | 'em_risco'
  | 'perdido';

export interface ClienteClassificado extends Cliente {
  classificacao: ClassificacaoCliente;
  ticketMedio: number;
  diasDesdeUltimaCompra: number | null;
  primeiraCompra: string | null;
  frequenciaMensal: number;
  isAniversariante: boolean;
}

// ---------- INSERT / UPDATE ----------

export interface ClienteInsert {
  nome: string;
  telefone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  email?: string | null;
  aniversario?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  observacoes?: string | null;
  status?: 'ativo' | 'inativo';
  tags?: string[];
}

export type ClienteUpdate = Partial<ClienteInsert>;

// ---------- FILTROS ----------

export type ClienteSortField =
  | 'nome'
  | 'total_gasto'
  | 'total_compras'
  | 'ultima_compra'
  | 'created_at';

export interface ClienteFilter {
  search?: string;
  status?: 'ativo' | 'inativo' | 'todos';
  classificacao?: ClassificacaoCliente | 'todos';
  tag?: string | null;
  aniversariante?: 'hoje' | 'semana' | 'mes' | null;
  sortBy?: ClienteSortField;
  sortDir?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

// ---------- KPIs ----------

export interface ClienteKPIs {
  totalClientes: number;
  clientesAtivos: number;
  clientesNovos30d: number;
  clientesInativos: number;
  ticketMedioGeral: number;
  valorTotalComprado: number;
  clientesVIP: number;
  clientesEmRisco: number;
  aniversariantesMes: number;
  clientesFrequentes: number;
  clientesPerdidos: number;
}

// ---------- HISTÓRICO DE COMPRAS ----------

export interface CompraCliente {
  id: string;
  numero: string | null;
  data: string;
  total: number;
  forma_pagamento: string | null;
  status: string;
  operador: string | null;
  itens: CompraClienteItem[];
}

export interface CompraClienteItem {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

// ---------- CLIENTE EM RISCO ----------

export interface ClienteRisco {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  totalGasto: number;
  totalCompras: number;
  ticketMedio: number;
  ultimaCompra: string | null;
  diasSemCompra: number;
  classificacao: ClassificacaoCliente;
  nivel: 'leve' | 'moderado' | 'critico' | 'perdido';
}

// ---------- ANIVERSARIANTES ----------

export interface ClienteAniversariante {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  aniversario: string;
  totalGasto: number;
  totalCompras: number;
  classificacao: ClassificacaoCliente;
  diasParaAniversario: number;
  isHoje: boolean;
}

// ---------- INSIGHTS IA ----------

export type InsightClienteTipo =
  | 'vip_ticket_alto'
  | 'potencial_vip'
  | 'sem_compra_recente'
  | 'queda_compras'
  | 'recompra_potencial'
  | 'aniversariante'
  | 'cliente_novo'
  | 'frequencia_alta';

export interface InsightCliente {
  tipo: InsightClienteTipo;
  titulo: string;
  mensagem: string;
  prioridade: 'alta' | 'media' | 'baixa';
  clienteId: string;
  clienteNome: string;
  icone: string;
}

// ---------- CRM RESUMO ----------

export interface CRMResumo {
  ultimosCadastrados: ClienteClassificado[];
  maisCompram: ClienteClassificado[];
  emRisco: ClienteRisco[];
  semComprasRecentes: ClienteClassificado[];
  maiorTicket: ClienteClassificado[];
}

// ---------- HELPERS ----------

export function classificarCliente(
  cliente: Cliente,
  now: Date = new Date()
): ClassificacaoCliente {
  const diasCriacao = Math.floor(
    (now.getTime() - new Date(cliente.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const diasUltimaCompra = cliente.ultima_compra
    ? Math.floor(
        (now.getTime() - new Date(cliente.ultima_compra).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;
  const ticketMedio = cliente.total_compras > 0
    ? cliente.total_gasto / cliente.total_compras
    : 0;

  // VIP: >10 compras E ticket médio >150 OU total gasto >2000
  if (
    (cliente.total_compras >= 10 && ticketMedio >= 150) ||
    cliente.total_gasto >= 2000
  ) {
    if (diasUltimaCompra !== null && diasUltimaCompra > 90) return 'em_risco';
    return 'vip';
  }

  // Perdido: >120 dias sem compra
  if (diasUltimaCompra !== null && diasUltimaCompra > 120) return 'perdido';

  // Em risco: 60-120 dias sem compra
  if (diasUltimaCompra !== null && diasUltimaCompra > 60) return 'em_risco';

  // Inativo: 30-60 dias sem compra
  if (diasUltimaCompra !== null && diasUltimaCompra > 30) return 'inativo';

  // Frequente: >5 compras nos últimos 30d
  if (cliente.total_compras >= 5 && (diasUltimaCompra === null || diasUltimaCompra <= 30)) {
    return 'frequente';
  }

  // Ativo: comprou nos últimos 30 dias
  if (diasUltimaCompra !== null && diasUltimaCompra <= 30) return 'ativo';

  // Novo: cadastrado há menos de 30 dias
  if (diasCriacao <= 30) return 'novo';

  // Default
  if (cliente.total_compras === 0) return 'novo';

  return 'ativo';
}

export function getLabelClassificacao(c: ClassificacaoCliente): string {
  const labels: Record<ClassificacaoCliente, string> = {
    novo: 'Novo',
    ativo: 'Ativo',
    frequente: 'Frequente',
    vip: 'VIP',
    inativo: 'Inativo',
    em_risco: 'Em Risco',
    perdido: 'Perdido',
  };
  return labels[c];
}

export function getCorClassificacao(c: ClassificacaoCliente): string {
  const cores: Record<ClassificacaoCliente, string> = {
    novo: '#3b82f6',      // blue
    ativo: '#10b981',     // green
    frequente: '#8b5cf6', // purple
    vip: '#f59e0b',       // amber/gold
    inativo: '#64748b',   // slate
    em_risco: '#ef4444',  // red
    perdido: '#374151',   // gray
  };
  return cores[c];
}

export function getBgClassificacao(c: ClassificacaoCliente): string {
  const bgs: Record<ClassificacaoCliente, string> = {
    novo: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    ativo: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    frequente: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    vip: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    inativo: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    em_risco: 'bg-red-500/15 text-red-400 border-red-500/30',
    perdido: 'bg-gray-500/15 text-gray-500 border-gray-500/30',
  };
  return bgs[c];
}

export function formatTelefone(tel: string | null): string {
  if (!tel) return '—';
  const clean = tel.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return tel;
}

export function formatCPF(cpf: string | null): string {
  if (!cpf) return '—';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  return cpf;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
