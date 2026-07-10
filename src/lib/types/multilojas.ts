// ============================================
// SHOPMIND — ARQUITETURA MULTI-LOJAS: TIPOS
// ============================================

export type PerfilUsuarioLoja = 'dono' | 'gerente' | 'caixa' | 'estoquista' | 'vendedor' | 'financeiro' | 'supervisor';

export interface GrupoEmpresarial {
  id: string;
  nome: string;
  slug: string;
  dono_id: string;
  logo_url: string | null;
  status: 'ativo' | 'inativo';
  max_lojas: number;
  created_at: string;
  updated_at: string;
}

export interface LojaFilial {
  id: string;
  nome_loja: string;
  slug: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  endereco: any | null; // JSONB
  cor_primaria: string | null;
  cor_secundaria: string | null;
  status: 'ativo' | 'inativo';
  grupo_id: string | null;
  tipo_unidade: 'matriz' | 'filial' | 'deposito' | 'ecommerce' | 'escritorio';
  codigo_interno: string | null;
  ordem: number;
  created_at: string;
}

export interface UsuarioLoja {
  id: string;
  usuario_id: string;
  loja_id: string;
  perfil: PerfilUsuarioLoja;
  ativo: boolean;
  loja_padrao: boolean;
  acesso_todas_lojas: boolean;
  created_at: string;
  // Join fields optionally loaded
  usuario?: {
    nome: string;
    email: string;
    status: string;
  };
  loja?: {
    nome_loja: string;
    tipo_unidade: 'matriz' | 'filial';
  };
}

export interface ContextoAtivo {
  grupo: GrupoEmpresarial;
  lojaAtiva: LojaFilial;
  lojas: LojaFilial[];
  perfil: PerfilUsuarioLoja;
}

export interface CriarFilialInput {
  nome_loja: string;
  slug: string;
  cnpj?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  codigo_interno?: string | null;
  cor_primaria?: string;
  cor_secundaria?: string;
  tipo_unidade?: 'matriz' | 'filial' | 'deposito' | 'ecommerce' | 'escritorio';
  logo_url?: string | null;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    estado?: string;
    responsavel?: string;
  } | null;
  status?: 'ativo' | 'inativo';
}

