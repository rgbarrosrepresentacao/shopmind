// ============================================
// CORE BUSINESS RULES ENGINE — TYPES
// ============================================

export interface TenantContext {
  grupoId: string;
  lojaId: string;
  nomeLoja: string;
  tipoUnidade: 'matriz' | 'filial' | 'deposito';
  configuracoes: Record<string, any>;
}

export interface ActorContext {
  usuarioId: string;
  nome: string;
  email: string;
  tipo: 'dono' | 'gerente' | 'supervisor' | 'estoquista' | 'financeiro' | 'vendedor' | 'caixa';
}

export interface EnvironmentContext {
  ip: string;
  userAgent: string;
  device: string;
  os: string;
  browser: string;
  timezone: string;
  timestamp: string;
}

export interface BusinessContext {
  tenant: TenantContext;
  actor: ActorContext;
  environment: EnvironmentContext;
  
  // Entidades opcionais em andamento (Snapshots de Transação)
  caixaAtivo?: {
    id: string;
    operadorId: string;
    valorAbertura: number;
    saldoDinheiro: number;
  } | null;
  
  produto?: Record<string, any> | null;
  cliente?: Record<string, any> | null;
  venda?: Record<string, any> | null;
  transferencia?: Record<string, any> | null;
  
  // Cache de dados consultados durante a operação
  cache: Map<string, any>;
}

export interface BusinessDecision {
  allowed: boolean;
  reason: string | null;
  warnings: string[];
  approvalsRequired: string[]; // Perfis necessários para liberação (Ex: 'gerente', 'dono')
  generatedEvents: string[];   // Nomes dos eventos que serão gerados após a conclusão
  metadata: Record<string, any>;
  executionTime: number;       // Telemetria em milissegundos
}

// Interfaces para CQRS (Command Pattern)
export interface Command {
  type: string;
  timestamp: string;
  payload: Record<string, any>;
}

export interface CommandResult<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  decision?: BusinessDecision;
}

export interface CommandHandler<C extends Command = Command, R = any> {
  handle(command: C, context: BusinessContext): Promise<CommandResult<R>>;
}

// Assinaturas de Eventos de Domínio e Event Bus
export interface DomainEvent<P = any> {
  name: string;
  timestamp: string;
  context: BusinessContext;
  payload: P;
}

export interface EventSubscriber<E extends DomainEvent = DomainEvent> {
  name: string;
  priority: number; // Prioridade de execução (menor executa primeiro)
  handle(event: E): Promise<void>;
}
