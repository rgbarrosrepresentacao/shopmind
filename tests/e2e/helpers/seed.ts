/**
 * SEED HELPER — ShopMind E2E Tests
 *
 * Este arquivo documenta e orquestra os dados de seed necessários
 * para a suíte de testes E2E do ShopMind.
 *
 * Os dados de seed são prefixados com "[E2E]" para fácil identificação
 * e limpeza posterior, sem afetar dados reais de produção.
 */

export const SEED_DATA = {
  /** Credenciais do usuário dono (já existente no sistema) */
  owner: {
    email: 'diretoaoponto.rs@gmail.com',
    password: '17269405',
  },

  /** Usuários operacionais criados durante os testes */
  users: {
    gerente: {
      nome: 'Gerente Teste',
      email: 'gerente.teste@shopmind.com',
      password: '17269405',
      cargo: 'gerente',
    },
    caixa: {
      nome: 'Caixa Teste',
      email: 'caixa.teste@shopmind.com',
      password: '17269405',
      cargo: 'caixa',
    },
    estoquista: {
      nome: 'Estoque Teste',
      email: 'estoque.teste@shopmind.com',
      password: '17269405',
      cargo: 'estoquista',
    },
    financeiro: {
      nome: 'Financeiro Teste',
      email: 'financeiro.teste@shopmind.com',
      password: '17269405',
      cargo: 'financeiro',
    },
  },

  /** Lojas criadas durante os testes */
  lojas: {
    filial: {
      nome: 'Loja Filial Centro',
      slug: 'loja-filial-centro',
    },
  },

  /** Produto mestre criado durante os testes */
  produto: {
    nome: 'Produto Teste Premium',
    sku: 'PROD-TESTE-001',
    codigoBarras: '7891234567890',
    precoVendaMatriz: 25.00,
    precoCustoMatriz: 10.00,
    estoqueMatriz: 20,
    precoVendaFilial: 27.00,
    precoCustoFilial: 11.00,
    estoqueFilial: 15,
  },

  /** Cliente criado durante os testes */
  cliente: {
    nome: 'Carlos Teste',
    telefone: '11999999999',
    cpf: '000.000.000-00',
  },

  /** Fornecedor criado durante os testes */
  fornecedor: {
    nome: 'Fornecedor Teste E2E',
    cnpj: '00.000.000/0001-00',
    email: 'fornecedor.teste@e2e.com',
    telefone: '11999999999',
  },

  /** Abertura de caixa */
  caixa: {
    fundoInicial: 100.00,
    observacao: 'Abertura de teste E2E - Playwright',
  },

  /** Financeiro */
  financeiro: {
    lancamento: {
      descricao: 'Receita Teste E2E - Playwright',
      valor: 150.00,
      tipo: 'receita',
    },
    conta: {
      nome: 'Conta Teste E2E',
      saldoInicial: 1000.00,
    },
  },
} as const;

/**
 * Prefixo para identificar todos os dados criados pelos testes E2E.
 * Use para filtrar e limpar após os testes se necessário.
 */
export const E2E_PREFIX = '[E2E]';

/**
 * Função auxiliar para verificar se um texto é dado de teste E2E
 */
export function isE2EData(text: string): boolean {
  return (
    text.includes('Teste') ||
    text.includes('E2E') ||
    text.includes('Playwright') ||
    text.includes('teste@shopmind.com')
  );
}
