import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCEODashboardData } from '@/lib/actions/corporativo'
import { CorporativoClient } from '@/components/corporativo/corporativo-client'

export const metadata = {
  title: "ShopMind — Centro de Comando Corporativo",
  description: "Painel Executivo de alta governança contábil, comercial, logística e RH com IA CEO integrada.",
}

export default async function CorporativoPage() {
  const supabase = await createClient()

  // 1. Obter usuário ativo no servidor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Bloquear acesso a qualquer perfil diferente de 'dono' (Segurança RBAC)
  const { data: profile } = await supabase
    .from('usuarios')
    .select('tipo, loja_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tipo !== 'dono') {
    redirect('/dashboard')
  }

  // 3. Obter dados da loja do dono para buscar o grupo holding correto
  const { data: loja } = await supabase
    .from('lojas')
    .select('grupo_id')
    .eq('id', profile.loja_id)
    .single()

  if (!loja || !loja.grupo_id) {
    redirect('/dashboard')
  }

  // 4. Obter as lojas pertencentes ao grupo empresarial (Holding)
  const { data: lojasGrupo } = await supabase
    .from('lojas')
    .select('id, nome_loja, tipo_unidade, status')
    .eq('grupo_id', loja.grupo_id)
    .eq('status', 'ativo')

  const mappedLojasGrupo = (lojasGrupo || []).map(l => ({ ...l, cidade: null }))

  // 5. Carregar dossiê completo consolidado de alta performance
  const dossier = await getCEODashboardData('todos')

  return (
    <CorporativoClient
      lojasGrupo={mappedLojasGrupo}
      initialDossier={dossier}
    />
  )
}
