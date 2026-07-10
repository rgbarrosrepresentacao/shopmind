// ============================================
// CORE BUSINESS RULES ENGINE — CONTEXT BUILDER
// ============================================

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import type { BusinessContext, TenantContext, ActorContext, EnvironmentContext } from '../types';

export class BusinessContextBuilder {
  /**
   * Constrói o contexto de negócios completo (Tenant, Actor, Environment)
   * consultando o banco de dados e os cabeçalhos da requisição.
   */
  public static async build(customOverrides?: {
    userId?: string;
    lojaId?: string;
    caixaId?: string;
  }): Promise<BusinessContext> {
    const supabase = await createClient();
    const cache = new Map<string, any>();

    // 1. Obter Usuário e Perfil (Actor)
    let user;
    let profile;
    
    if (customOverrides?.userId) {
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, loja_id')
        .eq('id', customOverrides.userId)
        .single();
      if (data) {
        user = { id: data.id, email: data.email };
        profile = data;
      }
    }

    if (!user || !profile) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        user = authUser;
        const { data: userProfile } = await supabase
          .from('usuarios')
          .select('id, nome, email, tipo, loja_id')
          .eq('id', authUser.id)
          .single();
        profile = userProfile;
      }
    }

    // Fallback seguro se não autenticado
    const actor: ActorContext = {
      usuarioId: profile?.id || user?.id || 'anonymous',
      nome: profile?.nome || 'Anônimo',
      email: profile?.email || user?.email || 'anonymous@shopmind.com.br',
      tipo: (profile?.tipo as any) || 'vendedor',
    };

    // 2. Obter Loja e Configurações (Tenant)
    const activeLojaId = customOverrides?.lojaId || profile?.loja_id;
    let tenant: TenantContext = {
      grupoId: '',
      lojaId: activeLojaId || '',
      nomeLoja: 'Loja Padrão',
      tipoUnidade: 'filial',
      configuracoes: {},
    };

    if (activeLojaId) {
      // Buscar Loja e seu Grupo
      const { data: loja } = await supabase
        .from('lojas')
        .select('id, nome_loja, tipo_unidade, grupo_id')
        .eq('id', activeLojaId)
        .single();

      if (loja) {
        tenant.lojaId = loja.id;
        tenant.nomeLoja = loja.nome_loja;
        tenant.tipoUnidade = (loja.tipo_unidade as any) || 'filial';
        tenant.grupoId = loja.grupo_id || '';
      }

      // Buscar configurações da loja
      const { data: config } = await supabase
        .from('configuracoes_loja')
        .select('*')
        .eq('loja_id', activeLojaId)
        .maybeSingle();

      if (config) {
        tenant.configuracoes = config;
      }
    }

    // 3. Compilar Metadados do Ambiente (Environment)
    let ip = '127.0.0.1';
    let userAgent = 'Unknown';
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';
    let timezone = 'America/Sao_Paulo';

    try {
      const reqHeaders = await headers();
      ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
      userAgent = reqHeaders.get('user-agent') || 'Unknown';
      timezone = reqHeaders.get('x-timezone') || 'America/Sao_Paulo';

      // Parsing simples de User Agent
      if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        device = 'Mobile';
      }
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';

      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Macintosh')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iPhone')) os = 'iOS';
    } catch (e) {
      // Ignorar erros se executado fora de requisições HTTP (ex: build)
    }

    const environment: EnvironmentContext = {
      ip,
      userAgent,
      device,
      os,
      browser,
      timezone,
      timestamp: new Date().toISOString(),
    };

    // 4. Obter Caixa Ativo (se houver)
    let caixaAtivo = null;
    const searchCaixaId = customOverrides?.caixaId;

    if (searchCaixaId) {
      const { data: caixa } = await supabase
        .from('caixas')
        .select('id, usuario_id, valor_abertura, total_dinheiro, status')
        .eq('id', searchCaixaId)
        .single();
      if (caixa && caixa.status === 'aberto') {
        caixaAtivo = {
          id: caixa.id,
          operadorId: caixa.usuario_id,
          valorAbertura: Number(caixa.valor_abertura || 0),
          saldoDinheiro: Number(caixa.total_dinheiro || 0),
        };
      }
    } else if (activeLojaId && actor.usuarioId !== 'anonymous') {
      // Buscar caixa aberto para o operador atual na loja atual
      const { data: caixa } = await supabase
        .from('caixas')
        .select('id, usuario_id, valor_abertura, total_dinheiro')
        .eq('loja_id', activeLojaId)
        .eq('usuario_id', actor.usuarioId)
        .eq('status', 'aberto')
        .maybeSingle();

      if (caixa) {
        caixaAtivo = {
          id: caixa.id,
          operadorId: caixa.usuario_id,
          valorAbertura: Number(caixa.valor_abertura || 0),
          saldoDinheiro: Number(caixa.total_dinheiro || 0),
        };
      }
    }

    return {
      tenant,
      actor,
      environment,
      caixaAtivo,
      cache,
    };
  }
}
