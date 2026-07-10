'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  Cliente,
  ClienteInsert,
  ClienteUpdate,
  ClienteFilter,
  ClienteKPIs,
  ClienteClassificado,
  ClienteRisco,
  ClienteAniversariante,
  InsightCliente,
  CompraCliente,
  CRMResumo,
  ClassificacaoCliente,
} from '@/lib/types/clientes';
import { classificarCliente } from '@/lib/types/clientes';

// ============================================
// HELPER — Get current user's loja_id
// ============================================
async function getUserLojaId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('loja_id')
    .eq('id', user.id)
    .single();
  return data?.loja_id || null;
}

// Helper to merge store-specific stats for a list of clients
async function mergeStoreStats(clientes: any[], activeLojaId: string | null) {
  if (clientes.length === 0 || !activeLojaId) {
    return clientes.map(c => ({
      ...c,
      total_compras: 0,
      total_gasto: 0,
      ultima_compra: null,
      nivel_vip: 'Bronze',
      data_entrada_vip: null,
      data_expiracao_vip: null
    }));
  }

  const supabase = await createClient();
  const clientIds = clientes.map(c => c.id);
  const { data: statsData } = await supabase
    .from('cliente_loja_stats')
    .select('*')
    .eq('loja_id', activeLojaId)
    .in('cliente_id', clientIds);

  const statsMap = new Map();
  if (statsData) {
    statsData.forEach((s: any) => {
      statsMap.set(s.cliente_id, s);
    });
  }

  return clientes.map(c => {
    const storeStats = statsMap.get(c.id);
    return {
      ...c,
      total_compras: storeStats?.total_compras || 0,
      total_gasto: Number(storeStats?.total_gasto || 0),
      ultima_compra: storeStats?.ultima_compra || null,
      nivel_vip: storeStats?.nivel_vip || 'Bronze',
      data_entrada_vip: storeStats?.data_entrada_vip || null,
      data_expiracao_vip: storeStats?.data_expiracao_vip || null
    };
  });
}

// ============================================
// LISTAR CLIENTES (com filtros, busca, paginação)
// ============================================
export async function listClientes(filters: ClienteFilter = {}) {
  const supabase = await createClient();
  const {
    search,
    status = 'ativo',
    tag,
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    perPage = 25,
  } = filters;

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (status !== 'todos') {
    query = query.eq('status', status);
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    query = query.or(
      `nome.ilike.%${term}%,telefone.ilike.%${term}%,whatsapp.ilike.%${term}%,cpf.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const validSortFields: Record<string, string> = {
    nome: 'nome',
    total_gasto: 'total_gasto',
    total_compras: 'total_compras',
    ultima_compra: 'ultima_compra',
    created_at: 'created_at',
  };

  const sortField = validSortFields[sortBy] || 'created_at';
  query = query.order(sortField, { ascending: sortDir === 'asc' });

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], count: 0, error: error.message };
  }

  const now = new Date();
  let clientes = (data as Cliente[]) || [];

  // Merge store specific statistics for active store
  const activeLojaId = await getUserLojaId();
  clientes = await mergeStoreStats(clientes, activeLojaId) as Cliente[];

  // Classificação e filtragem por classificação/aniversariante
  const classificados: ClienteClassificado[] = clientes.map(c => {
    const classificacao = classificarCliente(c, now);
    const ticketMedio = c.total_compras > 0 ? c.total_gasto / c.total_compras : 0;
    const diasDesdeUltimaCompra = c.ultima_compra
      ? Math.floor((now.getTime() - new Date(c.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Frequência mensal: compras / meses desde criação
    const mesesCriacao = Math.max(1,
      Math.floor((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    const frequenciaMensal = c.total_compras / mesesCriacao;

    // Check birthday
    let isAniversariante = false;
    if (c.aniversario) {
      const aniv = new Date(c.aniversario + 'T00:00:00');
      isAniversariante = aniv.getDate() === now.getDate() && aniv.getMonth() === now.getMonth();
    }

    return {
      ...c,
      classificacao,
      ticketMedio,
      diasDesdeUltimaCompra,
      primeiraCompra: null,
      frequenciaMensal,
      isAniversariante,
    };
  });

  // Filter by classificação if needed
  let filtered = classificados;
  if (filters.classificacao && filters.classificacao !== 'todos') {
    filtered = filtered.filter(c => c.classificacao === filters.classificacao);
  }

  // Filter by aniversariante
  if (filters.aniversariante) {
    filtered = filtered.filter(c => {
      if (!c.aniversario) return false;
      const aniv = new Date(c.aniversario + 'T00:00:00');
      const anivThisYear = new Date(now.getFullYear(), aniv.getMonth(), aniv.getDate());

      if (filters.aniversariante === 'hoje') {
        return aniv.getDate() === now.getDate() && aniv.getMonth() === now.getMonth();
      }
      if (filters.aniversariante === 'semana') {
        const diffDays = Math.floor((anivThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      }
      if (filters.aniversariante === 'mes') {
        return aniv.getMonth() === now.getMonth();
      }
      return true;
    });
  }

  return { data: filtered, count: count || 0, error: null };
}

// ============================================
// BUSCAR CLIENTE POR ID
// ============================================
export async function getCliente(id: string) {
  const supabase = await createClient();
  const activeLojaId = await getUserLojaId();

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message || 'Cliente não encontrado.' };
  }

  const client = data as Cliente;

  // Merge store specific statistics
  if (activeLojaId) {
    const { data: storeStats } = await supabase
      .from('cliente_loja_stats')
      .select('*')
      .eq('cliente_id', id)
      .eq('loja_id', activeLojaId)
      .maybeSingle();

    if (storeStats) {
      client.total_compras = storeStats.total_compras;
      client.total_gasto = Number(storeStats.total_gasto);
      client.ultima_compra = storeStats.ultima_compra;
      client.nivel_vip = storeStats.nivel_vip;
      client.data_entrada_vip = storeStats.data_entrada_vip;
      client.data_expiracao_vip = storeStats.data_expiracao_vip;
    } else {
      client.total_compras = 0;
      client.total_gasto = 0;
      client.ultima_compra = null;
      client.nivel_vip = 'Bronze';
      client.data_entrada_vip = null;
      client.data_expiracao_vip = null;
    }
  }

  return { data: client, error: null };
}

// ============================================
// KPIs DE CLIENTES (Estatísticas da Loja Ativa)
// ============================================
export async function getClienteKPIs(): Promise<ClienteKPIs> {
  const supabase = await createClient();
  const activeLojaId = await getUserLojaId();

  // Fetch all clients in the group (accessible via group RLS policy)
  const { data: groupClientes } = await supabase
    .from('clientes')
    .select('id, loja_id, aniversario, created_at, status')
    .is('deleted_at', null);

  if (!groupClientes || groupClientes.length === 0) {
    return {
      totalClientes: 0, clientesAtivos: 0, clientesNovos30d: 0,
      clientesInativos: 0, ticketMedioGeral: 0, valorTotalComprado: 0,
      clientesVIP: 0, clientesEmRisco: 0, aniversariantesMes: 0,
      clientesFrequentes: 0, clientesPerdidos: 0,
    };
  }

  // Fetch store-specific stats for active store
  let statsMap = new Map();
  if (activeLojaId) {
    const { data: statsData } = await supabase
      .from('cliente_loja_stats')
      .select('*')
      .eq('loja_id', activeLojaId);

    if (statsData) {
      statsData.forEach((s: any) => {
        statsMap.set(s.cliente_id, s);
      });
    }
  }

  const now = new Date();
  let totalGasto = 0, totalCompras = 0;
  let ativos = 0, novos30d = 0, inativos = 0, vip = 0, emRisco = 0;
  let frequentes = 0, perdidos = 0, anivMes = 0;
  let activeStoreClientCount = 0;

  for (const c of groupClientes) {
    const storeStats = statsMap.get(c.id);
    
    // Only count as part of this store's KPIs if they have shopped here OR were originally created in this store
    const isRelevantToStore = storeStats || c.loja_id === activeLojaId;
    if (!isRelevantToStore) continue;

    activeStoreClientCount++;

    const total_compras = storeStats?.total_compras || 0;
    const total_gasto = Number(storeStats?.total_gasto || 0);
    const ultima_compra = storeStats?.ultima_compra || null;
    const nivel_vip = storeStats?.nivel_vip || 'Bronze';

    const clientWithStats = {
      ...c,
      total_compras,
      total_gasto,
      ultima_compra,
      nivel_vip
    } as any;

    const classificacao = classificarCliente(clientWithStats, now);
    totalGasto += total_gasto;
    totalCompras += total_compras;

    switch (classificacao) {
      case 'ativo': ativos++; break;
      case 'frequente': frequentes++; ativos++; break;
      case 'vip': vip++; ativos++; break;
      case 'inativo': inativos++; break;
      case 'em_risco': emRisco++; break;
      case 'perdido': perdidos++; break;
      case 'novo': novos30d++; break;
    }

    // Aniversariante do mês
    if (c.aniversario) {
      const aniv = new Date(c.aniversario + 'T00:00:00');
      if (aniv.getMonth() === now.getMonth()) anivMes++;
    }
  }

  const ticketMedioGeral = totalCompras > 0 ? totalGasto / totalCompras : 0;

  return {
    totalClientes: activeStoreClientCount,
    clientesAtivos: ativos,
    clientesNovos30d: novos30d,
    clientesInativos: inativos,
    ticketMedioGeral,
    valorTotalComprado: totalGasto,
    clientesVIP: vip,
    clientesEmRisco: emRisco,
    aniversariantesMes: anivMes,
    clientesFrequentes: frequentes,
    clientesPerdidos: perdidos,
  };
}

// ============================================
// CRIAR CLIENTE
// ============================================
export async function createCliente(input: ClienteInsert) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Usuário não autenticado.' };

  const { data: profile } = await supabase
    .from('usuarios')
    .select('loja_id')
    .eq('id', user.id)
    .single();
  if (!profile) return { data: null, error: 'Perfil não encontrado.' };

  // Check CPF duplicate
  if (input.cpf && input.cpf.trim()) {
    const { data: existing } = await supabase
      .from('clientes')
      .select('id')
      .eq('cpf', input.cpf.replace(/\D/g, ''))
      .is('deleted_at', null)
      .maybeSingle();
    if (existing) return { data: null, error: 'Já existe um cliente com este CPF.' };
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      loja_id: profile.loja_id,
      nome: input.nome,
      telefone: input.telefone || null,
      whatsapp: input.whatsapp || null,
      cpf: input.cpf ? input.cpf.replace(/\D/g, '') : null,
      email: input.email || null,
      aniversario: input.aniversario || null,
      endereco: input.endereco || null,
      cidade: input.cidade || null,
      estado: input.estado || null,
      cep: input.cep || null,
      observacoes: input.observacoes || null,
      status: input.status || 'ativo',
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Log activity
  await supabase.from('logs_atividade').insert({
    loja_id: profile.loja_id,
    usuario_id: user.id,
    acao: 'criar_cliente',
    entidade: 'cliente',
    entidade_id: data.id,
    dados_novos: { nome: input.nome, telefone: input.telefone },
  });

  revalidatePath('/dashboard/clientes');
  return { data: data as Cliente, error: null };
}

// ============================================
// ATUALIZAR CLIENTE
// ============================================
export async function updateCliente(id: string, input: ClienteUpdate) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  // Get current data for audit
  const { data: current } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Cliente não encontrado.' };

  const updateData: Record<string, unknown> = {};
  if (input.nome !== undefined) updateData.nome = input.nome;
  if (input.telefone !== undefined) updateData.telefone = input.telefone;
  if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp;
  if (input.cpf !== undefined) updateData.cpf = input.cpf ? input.cpf.replace(/\D/g, '') : null;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.aniversario !== undefined) updateData.aniversario = input.aniversario;
  if (input.endereco !== undefined) updateData.endereco = input.endereco;
  if (input.cidade !== undefined) updateData.cidade = input.cidade;
  if (input.estado !== undefined) updateData.estado = input.estado;
  if (input.cep !== undefined) updateData.cep = input.cep;
  if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.tags !== undefined) updateData.tags = input.tags;

  const { error } = await supabase
    .from('clientes')
    .update(updateData)
    .eq('id', id);

  if (error) return { error: error.message };

  // Log
  const { data: profile } = await supabase
    .from('usuarios')
    .select('loja_id')
    .eq('id', user.id)
    .single();

  if (profile) {
    await supabase.from('logs_atividade').insert({
      loja_id: profile.loja_id,
      usuario_id: user.id,
      acao: 'editar_cliente',
      entidade: 'cliente',
      entidade_id: id,
      dados_anteriores: current,
      dados_novos: updateData,
    });
  }

  revalidatePath('/dashboard/clientes');
  revalidatePath(`/dashboard/clientes/${id}`);
  return { error: null };
}

// ============================================
// EXCLUIR CLIENTE (lógico)
// ============================================
export async function deleteCliente(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('clientes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/clientes');
  return { error: null };
}

// ============================================
// HISTÓRICO DE COMPRAS DO CLIENTE
// ============================================
export async function getComprasCliente(clienteId: string): Promise<CompraCliente[]> {
  const supabase = await createClient();

  const { data: vendas } = await supabase
    .from('vendas')
    .select(`
      id, created_at, total, forma_pagamento, status,
      usuario:usuarios(nome),
      itens:venda_itens(
        produto_id, quantidade, preco_unitario, subtotal,
        produto:produtos(nome)
      )
    `)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });

  if (!vendas) return [];

  return (vendas as any[]).map((v, idx) => ({
    id: v.id,
    numero: `#${String(idx + 1).padStart(4, '0')}`,
    data: v.created_at,
    total: Number(v.total),
    forma_pagamento: v.forma_pagamento,
    status: v.status,
    operador: v.usuario?.nome || null,
    itens: (v.itens || []).map((i: any) => ({
      produto_id: i.produto_id,
      produto_nome: i.produto?.nome || 'Produto removido',
      quantidade: Number(i.quantidade),
      preco_unitario: Number(i.preco_unitario),
      subtotal: Number(i.subtotal),
    })),
  }));
}

// ============================================
// CLIENTES EM RISCO
// ============================================
export async function getClientesEmRisco(): Promise<ClienteRisco[]> {
  const supabase = await createClient();
  const activeLojaId = await getUserLojaId();

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, telefone, whatsapp, total_compras, total_gasto, ultima_compra, created_at')
    .is('deleted_at', null)
    .eq('status', 'ativo');

  if (!clientes) return [];

  // Merge store-specific statistics
  let mergedClientes = await mergeStoreStats(clientes, activeLojaId) as Cliente[];

  const now = new Date();
  const riscos: ClienteRisco[] = [];

  for (const c of mergedClientes) {
    if (!c.ultima_compra) continue;
    const dias = Math.floor(
      (now.getTime() - new Date(c.ultima_compra).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dias < 30) continue;

    let nivel: ClienteRisco['nivel'];
    if (dias > 120) nivel = 'perdido';
    else if (dias > 90) nivel = 'critico';
    else if (dias > 60) nivel = 'moderado';
    else nivel = 'leve';

    const classificacao = classificarCliente(c, now);
    const ticketMedio = c.total_compras > 0 ? c.total_gasto / c.total_compras : 0;

    riscos.push({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      totalGasto: Number(c.total_gasto),
      totalCompras: Number(c.total_compras),
      ticketMedio,
      ultimaCompra: c.ultima_compra,
      diasSemCompra: dias,
      classificacao,
      nivel,
    });
  }

  return riscos.sort((a, b) => b.diasSemCompra - a.diasSemCompra);
}

// ============================================
// ANIVERSARIANTES
// ============================================
export async function getAniversariantes(): Promise<ClienteAniversariante[]> {
  const supabase = await createClient();
  const activeLojaId = await getUserLojaId();

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, telefone, whatsapp, aniversario, total_gasto, total_compras, ultima_compra, created_at, status, tags')
    .is('deleted_at', null)
    .eq('status', 'ativo')
    .not('aniversario', 'is', null);

  if (!clientes) return [];

  // Merge store-specific statistics
  let mergedClientes = await mergeStoreStats(clientes, activeLojaId) as Cliente[];

  const now = new Date();
  const aniversariantes: ClienteAniversariante[] = [];

  for (const c of mergedClientes) {
    if (!c.aniversario) continue;
    const aniv = new Date(c.aniversario + 'T00:00:00');
    const anivThisYear = new Date(now.getFullYear(), aniv.getMonth(), aniv.getDate());

    // If birthday already passed this year, use next year
    if (anivThisYear < now) {
      anivThisYear.setFullYear(anivThisYear.getFullYear() + 1);
    }

    const diasPara = Math.floor(
      (anivThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isHoje = aniv.getDate() === now.getDate() && aniv.getMonth() === now.getMonth();

    // Only include within 31 days
    if (diasPara <= 31 || isHoje) {
      const classificacao = classificarCliente(c, now);
      aniversariantes.push({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        whatsapp: c.whatsapp,
        aniversario: c.aniversario,
        totalGasto: Number(c.total_gasto),
        totalCompras: Number(c.total_compras),
        classificacao,
        diasParaAniversario: isHoje ? 0 : diasPara,
        isHoje,
      });
    }
  }

  return aniversariantes.sort((a, b) => a.diasParaAniversario - b.diasParaAniversario);
}

// ============================================
// INSIGHTS INTELIGENTES (Estatísticas da Loja Ativa)
// ============================================
export async function getClienteInsights(): Promise<InsightCliente[]> {
  const supabase = await createClient();
  const activeLojaId = await getUserLojaId();

  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .is('deleted_at', null)
    .eq('status', 'ativo');

  if (!clientes || clientes.length === 0) return [];

  // Merge store-specific statistics
  let mergedClientes = await mergeStoreStats(clientes, activeLojaId) as Cliente[];

  const now = new Date();
  const insights: InsightCliente[] = [];

  for (const c of mergedClientes) {
    // Only yield insights if they actually have shopped at this active store
    if (c.total_compras === 0) continue;

    const classificacao = classificarCliente(c, now);
    const ticketMedio = c.total_compras > 0 ? c.total_gasto / c.total_compras : 0;
    const dias = c.ultima_compra
      ? Math.floor((now.getTime() - new Date(c.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // VIP com ticket alto
    if (classificacao === 'vip' && ticketMedio > 200) {
      insights.push({
        tipo: 'vip_ticket_alto',
        titulo: 'Cliente VIP de Alto Valor',
        mensagem: `${c.nome} é VIP e tem ticket médio de R$ ${ticketMedio.toFixed(2)}. Considere ofertas exclusivas.`,
        prioridade: 'baixa',
        clienteId: c.id,
        clienteNome: c.nome,
        icone: '⭐',
      });
    }

    // Potencial VIP
    if (classificacao === 'frequente' && c.total_gasto > 1500) {
      insights.push({
        tipo: 'potencial_vip',
        titulo: 'Próximo de se tornar VIP',
        mensagem: `${c.nome} já gastou R$ ${Number(c.total_gasto).toFixed(2)} e está próximo de se tornar VIP.`,
        prioridade: 'media',
        clienteId: c.id,
        clienteNome: c.nome,
        icone: '🚀',
      });
    }

    // Sem compra recente (em risco)
    if (dias !== null && dias > 60 && c.total_compras > 3) {
      insights.push({
        tipo: 'sem_compra_recente',
        titulo: 'Cliente sem compra recente',
        mensagem: `${c.nome} não compra há ${dias} dias. Tinha ${c.total_compras} compras registradas.`,
        prioridade: dias > 90 ? 'alta' : 'media',
        clienteId: c.id,
        clienteNome: c.nome,
        icone: '⚠️',
      });
    }

    // Aniversariante
    if (c.aniversario) {
      const aniv = new Date(c.aniversario + 'T00:00:00');
      if (aniv.getDate() === now.getDate() && aniv.getMonth() === now.getMonth()) {
        insights.push({
          tipo: 'aniversariante',
          titulo: 'Aniversariante do dia!',
          mensagem: `${c.nome} faz aniversário hoje! Envie uma mensagem ou oferta especial.`,
          prioridade: 'alta',
          clienteId: c.id,
          clienteNome: c.nome,
          icone: '🎂',
        });
      }
    }

    // Frequência alta - cliente novo promissor
    if (classificacao === 'novo' && c.total_compras >= 3) {
      insights.push({
        tipo: 'cliente_novo',
        titulo: 'Cliente novo promissor',
        mensagem: `${c.nome} é novo e já fez ${c.total_compras} compras. Potencial cliente frequente!`,
        prioridade: 'baixa',
        clienteId: c.id,
        clienteNome: c.nome,
        icone: '🌟',
      });
    }
  }

  // Sort by priority
  const prioOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
  return insights.sort((a, b) => prioOrder[a.prioridade] - prioOrder[b.prioridade]).slice(0, 20);
}

// ============================================
// CRM RESUMO (Estatísticas da Loja Ativa)
// ============================================
export async function getCRMResumo(): Promise<CRMResumo> {
  const supabase = await createClient();
  const activeLojaId = await getUserLojaId();

  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .is('deleted_at', null)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!clientes) {
    return {
      ultimosCadastrados: [], maisCompram: [], emRisco: [],
      semComprasRecentes: [], maiorTicket: [],
    };
  }

  // Merge store-specific statistics
  let mergedClientes = await mergeStoreStats(clientes, activeLojaId) as Cliente[];

  const now = new Date();

  const classificados: ClienteClassificado[] = mergedClientes.map(c => {
    const classificacao = classificarCliente(c, now);
    const ticketMedio = c.total_compras > 0 ? c.total_gasto / c.total_compras : 0;
    const diasDesdeUltimaCompra = c.ultima_compra
      ? Math.floor((now.getTime() - new Date(c.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const mesesCriacao = Math.max(1,
      Math.floor((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    );

    let isAniversariante = false;
    if (c.aniversario) {
      const aniv = new Date(c.aniversario + 'T00:00:00');
      isAniversariante = aniv.getDate() === now.getDate() && aniv.getMonth() === now.getMonth();
    }

    return {
      ...c,
      classificacao,
      ticketMedio,
      diasDesdeUltimaCompra,
      primeiraCompra: null,
      frequenciaMensal: c.total_compras / mesesCriacao,
      isAniversariante,
    };
  });

  const ultimosCadastrados = classificados.slice(0, 5);

  const maisCompram = [...classificados]
    .sort((a, b) => b.total_compras - a.total_compras)
    .slice(0, 5);

  const emRisco: ClienteRisco[] = classificados
    .filter(c => c.classificacao === 'em_risco' || c.classificacao === 'perdido')
    .map(c => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      totalGasto: Number(c.total_gasto),
      totalCompras: Number(c.total_compras),
      ticketMedio: c.ticketMedio,
      ultimaCompra: c.ultima_compra,
      diasSemCompra: c.diasDesdeUltimaCompra || 0,
      classificacao: c.classificacao,
      nivel: (c.diasDesdeUltimaCompra || 0) > 120 ? 'perdido' as const
        : (c.diasDesdeUltimaCompra || 0) > 90 ? 'critico' as const
        : (c.diasDesdeUltimaCompra || 0) > 60 ? 'moderado' as const
        : 'leve' as const,
    }))
    .slice(0, 5);

  const semComprasRecentes = classificados
    .filter(c => c.diasDesdeUltimaCompra !== null && c.diasDesdeUltimaCompra > 30)
    .sort((a, b) => (b.diasDesdeUltimaCompra || 0) - (a.diasDesdeUltimaCompra || 0))
    .slice(0, 5);

  const maiorTicket = [...classificados]
    .filter(c => c.total_compras > 0)
    .sort((a, b) => b.ticketMedio - a.ticketMedio)
    .slice(0, 5);

  return { ultimosCadastrados, maisCompram, emRisco, semComprasRecentes, maiorTicket };
}
