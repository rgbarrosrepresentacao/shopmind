import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { garantirGrupoEmpresarial, getLojasDoUsuario, getUsuariosDoGrupo } from '@/lib/actions/multilojas'
import { UsuariosClient } from '@/components/usuarios/usuarios-client'

export const metadata = {
  title: 'Gestão de Colaboradores — ShopMind',
  description: 'Gerencie os usuários, permissões e acessos das filiais do seu grupo empresarial.'
}

export default async function UsuariosPage() {
  const supabase = await createClient()

  // 1. Verificar sessão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Bloqueio RBAC a nível de servidor (apenas Dono pode gerenciar a equipe da holding)
  const { data: profile } = await supabase
    .from('usuarios')
    .select('tipo, loja_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tipo !== 'dono') {
    redirect('/dashboard')
  }

  // 3. Obter dados da equipe e filiais
  const grupo = await garantirGrupoEmpresarial()
  const lojas = await getLojasDoUsuario()
  const equipe = await getUsuariosDoGrupo()

  if (!grupo) {
    redirect('/dashboard/multilojas')
  }

  return (
    <UsuariosClient 
      grupo={grupo} 
      lojas={lojas} 
      equipe={equipe} 
      activeStoreId={profile.loja_id}
    />
  )
}
