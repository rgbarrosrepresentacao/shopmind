import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { garantirGrupoEmpresarial, getLojasDoUsuario, getUsuariosDoGrupo } from '@/lib/actions/multilojas'
import { MultilojasClient } from '@/components/multilojas/multilojas-client'

export const metadata = {
  title: 'Painel Corporativo Multi-Lojas — ShopMind',
  description: 'Gerencie suas filiais, equipe e configurações corporativas.'
}

export default async function MultilojasPage() {
  const supabase = await createClient()

  // 1. Verify session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch user profile and ensure they are the owner (dono)
  const { data: profile } = await supabase
    .from('usuarios')
    .select('tipo, loja_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tipo !== 'dono') {
    // Only owners can manage multi-store settings
    redirect('/dashboard')
  }

  // 3. Fetch corporate data
  const grupo = await garantirGrupoEmpresarial()
  const lojas = await getLojasDoUsuario()
  const equipe = await getUsuariosDoGrupo()

  if (!grupo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-slate-900/50 border border-border/60 rounded-2xl backdrop-blur-md">
        <h2 className="text-xl font-bold text-slate-200">Estrutura corporativa não encontrada</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          Sua loja atual não está vinculada a um grupo empresarial. Entre em contato com o suporte para habilitar o módulo Multi-Lojas.
        </p>
      </div>
    )
  }

  return (
    <MultilojasClient 
      grupo={grupo} 
      lojas={lojas} 
      equipe={equipe} 
      activeStoreId={profile.loja_id}
    />
  )
}
