'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { GrupoEmpresarial, LojaFilial, UsuarioLoja, CriarFilialInput, PerfilUsuarioLoja } from '@/lib/types/multilojas'

// Helper: check if current user is owner (dono) of their active store/group
async function checkIsOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('tipo, loja_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tipo !== 'dono') {
    throw new Error('Acesso negado. Apenas o proprietário pode realizar esta ação.')
  }

  const { data: loja } = await supabase
    .from('lojas')
    .select('grupo_id')
    .eq('id', profile.loja_id)
    .single()

  if (!loja || !loja.grupo_id) {
    throw new Error('Loja atual não está vinculada a um grupo empresarial.')
  }

  return { userId: user.id, grupoId: loja.grupo_id, lojaId: profile.loja_id }
}

// ============================================
// 1. OBTER GRUPO ATUAL DO USUÁRIO
// ============================================
export async function getGrupoAtual(): Promise<GrupoEmpresarial | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('usuarios')
      .select('loja_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.loja_id) return null

    const { data: loja } = await supabase
      .from('lojas')
      .select('grupo_id')
      .eq('id', profile.loja_id)
      .single()

    if (!loja || !loja.grupo_id) return null

    const { data: grupo } = await supabase
      .from('grupos_empresariais')
      .select('*')
      .eq('id', loja.grupo_id)
      .single()

    return grupo as GrupoEmpresarial
  } catch (error) {
    console.error('Error in getGrupoAtual:', error)
    return null
  }
}

// ============================================
// 2. OBTER TODAS AS LOJAS QUE O USUÁRIO TEM ACESSO
// ============================================
export async function getLojasDoUsuario(): Promise<LojaFilial[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // 1. Fetch direct relationships
    const { data: vinculos, error: vinculosError } = await supabase
      .from('usuario_lojas')
      .select('loja_id, acesso_todas_lojas')
      .eq('usuario_id', user.id)
      .eq('ativo', true)

    if (vinculosError || !vinculos || vinculos.length === 0) {
      // Fallback: if they have a loja_id in usuarios, let's at least return that
      const { data: profile } = await supabase
        .from('usuarios')
        .select('loja_id')
        .eq('id', user.id)
        .single()
      
      if (!profile || !profile.loja_id) return []
      
      const { data: loja } = await supabase
        .from('lojas')
        .select('*')
        .eq('id', profile.loja_id)
        .single()
      
      return loja ? [loja as LojaFilial] : []
    }

    const lojaIds = vinculos.map(v => v.loja_id)
    const hasGlobalAccess = vinculos.some(v => v.acesso_todas_lojas)

    if (hasGlobalAccess) {
      // Get the group of the first store to find all stores in that group
      const { data: firstStore } = await supabase
        .from('lojas')
        .select('grupo_id')
        .in('id', lojaIds)
        .limit(1)
        .single()

      if (firstStore && firstStore.grupo_id) {
        const { data: allLojas } = await supabase
          .from('lojas')
          .select('*')
          .eq('grupo_id', firstStore.grupo_id)
          .order('tipo_unidade', { ascending: false }) // Matriz first
          .order('ordem', { ascending: true })
          .order('nome_loja', { ascending: true })

        return (allLojas || []) as LojaFilial[]
      }
    }

    // Otherwise return only specific stores
    const { data: stores } = await supabase
      .from('lojas')
      .select('*')
      .in('id', lojaIds)
      .order('tipo_unidade', { ascending: false })
      .order('ordem', { ascending: true })

    return (stores || []) as LojaFilial[]
  } catch (error) {
    console.error('Error in getLojasDoUsuario:', error)
    return []
  }
}

// ============================================
// 3. TROCAR LOJA ATIVA DO USUÁRIO
// ============================================
export async function trocarLojaAtiva(lojaId: string): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient()
    
    // Call the RPC function set_user_loja_ativa
    const { data, error } = await supabase.rpc('set_user_loja_ativa', {
      p_loja_id: lojaId
    })

    if (error) {
      console.error('RPC Error set_user_loja_ativa:', error)
      return { success: false, error: error.message }
    }

    const res = data as any
    if (!res || !res.success) {
      return { success: false, error: res?.error || 'Não foi possível alternar de loja.' }
    }

    // Revalidate paths to clear Next.js caches
    revalidatePath('/', 'layout')
    revalidatePath('/dashboard')

    return { success: true, data: res }
  } catch (error: any) {
    console.error('Error in trocarLojaAtiva:', error)
    return { success: false, error: error.message || 'Erro inesperado ao alternar loja.' }
  }
}

// ============================================
// 4. CRIAR FILIAL (DONO APENAS)
// ============================================
export async function criarFilial(input: CriarFilialInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { grupoId, userId } = await checkIsOwner()

    // Check limit
    const { data: grupo } = await supabase
      .from('grupos_empresariais')
      .select('max_lojas')
      .eq('id', grupoId)
      .single()

    const { count } = await supabase
      .from('lojas')
      .select('id', { count: 'exact', head: true })
      .eq('grupo_id', grupoId)

    if (grupo && count !== null && count >= grupo.max_lojas) {
      return { success: false, error: `Limite de filiais atingido (${grupo.max_lojas}). Entre em contato para expandir.` }
    }

    // Insert new store
    const { data: novaLoja, error: storeError } = await supabase
      .from('lojas')
      .insert({
        nome_loja: input.nome_loja.trim(),
        slug: input.slug.trim().toLowerCase(),
        cnpj: input.cnpj?.trim() || null,
        telefone: input.telefone?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
        email: input.email?.trim() || null,
        codigo_interno: input.codigo_interno?.trim() || null,
        cor_primaria: input.cor_primaria || '#8b5cf6',
        cor_secundaria: input.cor_secundaria || '#3b82f6',
        grupo_id: grupoId,
        tipo_unidade: input.tipo_unidade || 'filial',
        logo_url: input.logo_url?.trim() || null,
        endereco: input.endereco || null,
        status: input.status || 'ativo',
        ordem: (count || 0) + 1
      })
      .select()
      .single()

    if (storeError || !novaLoja) {
      return { success: false, error: storeError?.message || 'Erro ao criar filial no banco de dados.' }
    }

    // Link the owner to the new branch as owner
    await supabase.from('usuario_lojas').insert({
      usuario_id: userId,
      loja_id: novaLoja.id,
      perfil: 'dono',
      ativo: true,
      loja_padrao: false,
      acesso_todas_lojas: true
    })

    // Create default configuration (configuracoes_loja)
    await supabase.from('configuracoes_loja').insert({
      loja_id: novaLoja.id,
      limite_usuarios: 5,
      permitir_estoque_negativo: false,
      exigir_cpf_venda: false,
      permitir_desconto_caixa: true,
      desconto_maximo_percentual: 10.00
    })

    // Create default fiscal configuration
    await supabase.from('configuracoes_fiscais').insert({
      loja_id: novaLoja.id,
      regime_tributario: 'simples_nacional',
      aliquota_credito_sn: 0,
      proximo_numero_recibo: 1,
      proximo_numero_comprovante: 1,
      proximo_numero_pedido: 1,
      proximo_numero_orcamento: 1,
      proximo_numero_ordem: 1,
      serie_padrao: '1'
    })

    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (error: any) {
    console.error('Error in criarFilial:', error)
    return { success: false, error: error.message || 'Erro inesperado ao criar filial.' }
  }
}

// ============================================
// 5. EDITAR FILIAL (DONO APENAS)
// ============================================
export async function editarFilial(id: string, input: Partial<CriarFilialInput>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { grupoId } = await checkIsOwner()

    // Ensure the store is in the user's group
    const { data: store } = await supabase
      .from('lojas')
      .select('id')
      .eq('id', id)
      .eq('grupo_id', grupoId)
      .single()

    if (!store) {
      return { success: false, error: 'Filial não encontrada ou não pertence ao seu grupo.' }
    }

    const updateData: any = {}
    if (input.nome_loja !== undefined) updateData.nome_loja = input.nome_loja.trim()
    if (input.slug !== undefined) updateData.slug = input.slug.trim().toLowerCase()
    if (input.cnpj !== undefined) updateData.cnpj = input.cnpj?.trim() || null
    if (input.telefone !== undefined) updateData.telefone = input.telefone?.trim() || null
    if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp?.trim() || null
    if (input.email !== undefined) updateData.email = input.email?.trim() || null
    if (input.codigo_interno !== undefined) updateData.codigo_interno = input.codigo_interno?.trim() || null
    if (input.cor_primaria !== undefined) updateData.cor_primaria = input.cor_primaria
    if (input.cor_secundaria !== undefined) updateData.cor_secundaria = input.cor_secundaria
    if (input.tipo_unidade !== undefined) updateData.tipo_unidade = input.tipo_unidade
    if (input.logo_url !== undefined) updateData.logo_url = input.logo_url?.trim() || null
    if (input.endereco !== undefined) updateData.endereco = input.endereco || null
    if (input.status !== undefined) updateData.status = input.status

    const { error } = await supabase
      .from('lojas')
      .update(updateData)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (error: any) {
    console.error('Error in editarFilial:', error)
    return { success: false, error: error.message || 'Erro inesperado ao editar filial.' }
  }
}

// ============================================
// 6. DESATIVAR / ATIVAR FILIAL (DONO APENAS)
// ============================================
export async function alterarStatusFilial(id: string, status: 'ativo' | 'inativo'): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { grupoId } = await checkIsOwner()

    // Ensure store belongs to group and is not Matriz (cannot disable Matriz)
    const { data: store } = await supabase
      .from('lojas')
      .select('tipo_unidade')
      .eq('id', id)
      .eq('grupo_id', grupoId)
      .single()

    if (!store) {
      return { success: false, error: 'Filial não encontrada ou não pertence ao seu grupo.' }
    }

    if (store.tipo_unidade === 'matriz' && status === 'inativo') {
      return { success: false, error: 'A loja matriz não pode ser desativada.' }
    }

    const { error } = await supabase
      .from('lojas')
      .update({ status })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (error: any) {
    console.error('Error in alterarStatusFilial:', error)
    return { success: false, error: error.message || 'Erro inesperado.' }
  }
}

// ============================================
// 7. LISTAR EQUIPE / USUÁRIOS DO GRUPO (DONO APENAS)
// ============================================
export async function getUsuariosDoGrupo(): Promise<UsuarioLoja[]> {
  try {
    const supabase = await createClient()
    const { grupoId } = await checkIsOwner()

    // Get all store IDs in group
    const { data: stores } = await supabase
      .from('lojas')
      .select('id')
      .eq('grupo_id', grupoId)

    if (!stores || stores.length === 0) return []
    const storeIds = stores.map(s => s.id)

    // Fetch user links
    const { data: vinculos, error } = await supabase
      .from('usuario_lojas')
      .select(`
        *,
        loja:lojas(nome_loja, tipo_unidade),
        usuario:usuarios(nome, email, status)
      `)
      .in('loja_id', storeIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching group users:', error)
      return []
    }

    return (vinculos || []) as unknown as UsuarioLoja[]
  } catch (error) {
    console.error('Error in getUsuariosDoGrupo:', error)
    return []
  }
}

// ============================================
// 8. VINCULAR USUÁRIO A UMA LOJA
// ============================================
export async function vincularUsuarioLoja(
  email: string,
  lojaId: string,
  perfil: PerfilUsuarioLoja,
  acessoTodasLojas = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { grupoId } = await checkIsOwner()

    // Validate store in group
    const { data: store } = await supabase
      .from('lojas')
      .select('id')
      .eq('id', lojaId)
      .eq('grupo_id', grupoId)
      .single()

    if (!store) {
      return { success: false, error: 'Loja não encontrada ou não pertence ao seu grupo.' }
    }

    // Find the user by email in public.usuarios
    const { data: userProfile } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (!userProfile) {
      return {
        success: false,
        error: 'Usuário não encontrado. Peça para ele criar uma conta no ShopMind primeiro.'
      }
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('usuario_lojas')
      .select('id, ativo')
      .eq('usuario_id', userProfile.id)
      .eq('loja_id', lojaId)
      .maybeSingle()

    if (existingLink) {
      if (existingLink.ativo) {
        return { success: false, error: 'Este usuário já está vinculado a esta loja.' }
      }
      // Re-enable and update profile
      const { error } = await supabase
        .from('usuario_lojas')
        .update({
          ativo: true,
          perfil,
          acesso_todas_lojas: acessoTodasLojas
        })
        .eq('id', existingLink.id)

      if (error) return { success: false, error: error.message }
    } else {
      // Create new link
      const { error } = await supabase
        .from('usuario_lojas')
        .insert({
          usuario_id: userProfile.id,
          loja_id: lojaId,
          perfil,
          ativo: true,
          loja_padrao: false,
          acesso_todas_lojas: acessoTodasLojas
        })

      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (error: any) {
    console.error('Error in vincularUsuarioLoja:', error)
    return { success: false, error: error.message || 'Erro inesperado.' }
  }
}

// ============================================
// 9. DESVINCULAR USUÁRIO DA LOJA
// ============================================
export async function desvincularUsuarioLoja(userId: string, lojaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { grupoId, userId: ownerId } = await checkIsOwner()

    if (userId === ownerId) {
      return { success: false, error: 'Você não pode se desvincular da sua própria loja.' }
    }

    // Ensure store is in owner's group
    const { data: store } = await supabase
      .from('lojas')
      .select('id')
      .eq('id', lojaId)
      .eq('grupo_id', grupoId)
      .single()

    if (!store) {
      return { success: false, error: 'Ação não permitida.' }
    }

    // Delete relation
    const { error } = await supabase
      .from('usuario_lojas')
      .delete()
      .eq('usuario_id', userId)
      .eq('loja_id', lojaId)

    if (error) return { success: false, error: error.message }

    // If the user's active store was this one, switch their active store to their default or another store they have access to
    const { data: profile } = await supabase
      .from('usuarios')
      .select('loja_id')
      .eq('id', userId)
      .single()

    if (profile && profile.loja_id === lojaId) {
      // Find another store they have access to
      const { data: anotherLink } = await supabase
        .from('usuario_lojas')
        .select('loja_id, perfil')
        .eq('usuario_id', userId)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle()

      if (anotherLink) {
        await supabase
          .from('usuarios')
          .update({
            loja_id: anotherLink.loja_id,
            tipo: anotherLink.perfil
          })
          .eq('id', userId)
      }
    }

    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (error: any) {
    console.error('Error in desvincularUsuarioLoja:', error)
    return { success: false, error: error.message || 'Erro inesperado.' }
  }
}

// ============================================
// 10. EDITAR DADOS DO GRUPO EMPRESARIAL
// ============================================
export async function editarGrupo(nome: string, logoUrl?: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { grupoId } = await checkIsOwner()

    if (!nome || nome.trim().length < 3) {
      return { success: false, error: 'O nome do grupo deve ter pelo menos 3 caracteres.' }
    }

    const { error } = await supabase
      .from('grupos_empresariais')
      .update({
        nome: nome.trim(),
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', grupoId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (error: any) {
    console.error('Error in editarGrupo:', error)
    return { success: false, error: error.message || 'Erro inesperado.' }
  }
}

// ============================================
// 11. GARANTIR / AUTOCRIAR GRUPO EMPRESARIAL (AUTOCORREÇÃO)
// ============================================
export async function garantirGrupoEmpresarial(): Promise<GrupoEmpresarial | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 1. Obter perfil do usuário
    const { data: profile } = await supabase
      .from('usuarios')
      .select('id, tipo, loja_id, nome')
      .eq('id', user.id)
      .single()

    if (!profile || profile.tipo !== 'dono' || !profile.loja_id) return null

    // 2. Obter a loja
    const { data: loja } = await supabase
      .from('lojas')
      .select('id, grupo_id, nome_loja, slug')
      .eq('id', profile.loja_id)
      .single()

    if (!loja) return null

    // 3. Se a loja já tiver um grupo, retorna ele
    if (loja.grupo_id) {
      const { data: grupo } = await supabase
        .from('grupos_empresariais')
        .select('*')
        .eq('id', loja.grupo_id)
        .maybeSingle()

      if (grupo) return grupo as GrupoEmpresarial
    }

    // 4. Se não tiver grupo ou o grupo não existir no banco, criamos um novo!
    console.log('Autocorreção: Criando grupo empresarial para o dono', user.id)
    
    const grupoNome = `Grupo ${loja.nome_loja || profile.nome || 'Empresarial'}`
    const grupoSlug = `grupo-${loja.slug || profile.nome?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'corp'}`

    // Inserir grupo
    const { data: novoGrupo, error: grupoError } = await supabase
      .from('grupos_empresariais')
      .insert({
        nome: grupoNome,
        slug: grupoSlug,
        dono_id: user.id,
        max_lojas: 5,
        status: 'ativo'
      })
      .select()
      .single()

    if (grupoError || !novoGrupo) {
      console.error('Erro ao autocriar grupo empresarial:', grupoError)
      return null
    }

    // 5. Vincular a loja atual ao grupo criado
    const { error: updateError } = await supabase
      .from('lojas')
      .update({ grupo_id: novoGrupo.id })
      .eq('id', loja.id)

    if (updateError) {
      console.error('Erro ao vincular loja ao novo grupo:', updateError)
      return null
    }

    // 6. Garantir vínculo do dono em usuario_lojas
    const { data: existingLink } = await supabase
      .from('usuario_lojas')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('loja_id', loja.id)
      .maybeSingle()

    if (!existingLink) {
      await supabase.from('usuario_lojas').insert({
        usuario_id: user.id,
        loja_id: loja.id,
        perfil: 'dono',
        ativo: true,
        loja_padrao: true,
        acesso_todas_lojas: true
      })
    } else {
      await supabase
        .from('usuario_lojas')
        .update({
          perfil: 'dono',
          ativo: true,
          acesso_todas_lojas: true
        })
        .eq('id', existingLink.id)
    }

    console.log('Autocorreção concluída com sucesso para o grupo:', novoGrupo.id)
    return novoGrupo as GrupoEmpresarial
  } catch (err) {
    console.error('Erro em garantirGrupoEmpresarial:', err)
    return null
  }
}

// ============================================
// 12. GESTÃO CORPORATIVA DE COLABORADORES
// ============================================
export async function criarColaborador(dados: {
  nome: string
  email: string
  telefone?: string
  senhaProvisoria: string
  cargo: PerfilUsuarioLoja
  lojaId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { grupoId, userId: ownerId, lojaId: ownerLojaId } = await checkIsOwner()

    const emailClean = dados.email.trim().toLowerCase()

    // 1. Verificar se o usuário já existe na tabela public.usuarios pelo e-mail
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('email', emailClean)
      .maybeSingle()

    if (existingUser) {
      // O usuário já existe no sistema! Apenas vinculamos à loja
      const { data: existingLink } = await supabase
        .from('usuario_lojas')
        .select('id, ativo')
        .eq('usuario_id', existingUser.id)
        .eq('loja_id', dados.lojaId)
        .maybeSingle()

      if (existingLink) {
        if (existingLink.ativo) {
          return { success: false, error: 'Este usuário já está vinculado a esta filial como colaborador ativo.' }
        }
        // Reativar o vínculo existente
        const { error: reactivateError } = await supabase
          .from('usuario_lojas')
          .update({
            ativo: true,
            perfil: dados.cargo
          })
          .eq('id', existingLink.id)

        if (reactivateError) throw reactivateError
      } else {
        // Criar novo vínculo em usuario_lojas
        const { error: linkError } = await supabase
          .from('usuario_lojas')
          .insert({
            usuario_id: existingUser.id,
            loja_id: dados.lojaId,
            perfil: dados.cargo,
            ativo: true,
            loja_padrao: false,
            acesso_todas_lojas: false
          })

        if (linkError) throw linkError
      }

      // Log de atividade
      await supabase.from('logs_atividade').insert({
        loja_id: dados.lojaId,
        usuario_id: ownerId,
        acao: 'criar',
        entidade: 'usuario',
        dados_novos: { usuario_vinculado: existingUser.nome, email: emailClean, cargo: dados.cargo }
      })

      revalidatePath('/dashboard/usuarios')
      revalidatePath('/dashboard/multilojas')
      return { success: true }
    }

    // 2. Se o usuário não existir no sistema, criamos no Supabase Auth de forma isolada
    const tempSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
      email: emailClean,
      password: dados.senhaProvisoria,
      options: {
        data: {
          nome: dados.nome.trim(),
          tipo: dados.cargo,
          loja_id: dados.lojaId
        }
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError)
      return { success: false, error: authError.message || 'Erro ao registrar usuário no Supabase Auth.' }
    }

    const newUserId = authData.user?.id
    if (!newUserId) {
      return { success: false, error: 'Não foi possível recuperar o ID do usuário criado.' }
    }

    // O triggerfn_on_auth_user_created() no Supabase roda automaticamente no INSERT de auth.users,
    // criando o perfil em public.usuarios e o vínculo em public.usuario_lojas.
    // Atualizamos detalhes adicionais como telefone se fornecidos.
    if (dados.telefone) {
      await supabase
        .from('usuarios')
        .update({
          avatar_url: null,
          status: 'ativo'
        })
        .eq('id', newUserId)
    }

    // Log de atividade
    await supabase.from('logs_atividade').insert({
      loja_id: dados.lojaId,
      usuario_id: ownerId,
      acao: 'criar',
      entidade: 'usuario',
      dados_novos: { nome: dados.nome, email: emailClean, cargo: dados.cargo }
    })

    revalidatePath('/dashboard/usuarios')
    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao criar colaborador:', err)
    return { success: false, error: err.message || 'Erro inesperado ao criar colaborador.' }
  }
}

export async function alterarStatusColaborador(
  colaboradorId: string,
  status: 'ativo' | 'inativo'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { userId: ownerId, lojaId: ownerLojaId } = await checkIsOwner()

    if (colaboradorId === ownerId) {
      return { success: false, error: 'Você não pode desativar o seu próprio perfil de dono.' }
    }

    // 1. Atualizar a tabela usuarios
    const { error: userError } = await supabase
      .from('usuarios')
      .update({ status })
      .eq('id', colaboradorId)

    if (userError) throw userError

    // 2. Atualizar todos os vínculos em usuario_lojas
    const { error: linksError } = await supabase
      .from('usuario_lojas')
      .update({ ativo: status === 'ativo' })
      .eq('usuario_id', colaboradorId)

    if (linksError) throw linksError

    // Registrar log
    await supabase.from('logs_atividade').insert({
      loja_id: ownerLojaId,
      usuario_id: ownerId,
      acao: 'editar',
      entidade: 'usuario',
      dados_novos: { colaborador_id: colaboradorId, status_novo: status }
    })

    revalidatePath('/dashboard/usuarios')
    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao alterar status do colaborador:', err)
    return { success: false, error: err.message || 'Erro inesperado.' }
  }
}

export async function alterarCargoColaboradorLoja(
  colaboradorId: string,
  lojaId: string,
  cargo: PerfilUsuarioLoja
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { userId: ownerId, lojaId: ownerLojaId } = await checkIsOwner()

    if (colaboradorId === ownerId) {
      return { success: false, error: 'Você não pode alterar o seu próprio cargo de dono.' }
    }

    // 1. Atualizar o vínculo na filial
    const { error: linkError } = await supabase
      .from('usuario_lojas')
      .update({ perfil: cargo })
      .eq('usuario_id', colaboradorId)
      .eq('loja_id', lojaId)

    if (linkError) throw linkError

    // 2. Se a loja ativa atual do usuário for essa loja, precisamos atualizar também o tipo dele na tabela usuarios
    const { data: profile } = await supabase
      .from('usuarios')
      .select('loja_id')
      .eq('id', colaboradorId)
      .single()

    if (profile && profile.loja_id === lojaId) {
      await supabase
        .from('usuarios')
        .update({ tipo: cargo })
        .eq('id', colaboradorId)
    }

    // Registrar log
    await supabase.from('logs_atividade').insert({
      loja_id: lojaId,
      usuario_id: ownerId,
      acao: 'editar',
      entidade: 'usuario',
      dados_novos: { colaborador_id: colaboradorId, cargo_novo: cargo, loja_id: lojaId }
    })

    revalidatePath('/dashboard/usuarios')
    revalidatePath('/dashboard/multilojas')
    return { success: true }
  } catch (err: any) {
    console.error('Erro ao alterar cargo do colaborador:', err)
    return { success: false, error: err.message || 'Erro inesperado.' }
  }
}

export async function redefinirSenhaColaborador(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    await checkIsOwner()

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_DOMAIN ? 'http://' + process.env.NEXT_PUBLIC_APP_DOMAIN : 'http://localhost:3000'}/auth/callback?next=/dashboard/perfil`
    })

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Erro ao redefinir senha do colaborador:', err)
    return { success: false, error: err.message || 'Erro ao disparar e-mail de redefinição.' }
  }
}

