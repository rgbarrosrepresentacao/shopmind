import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppLayoutClient } from '@/components/layout/app-layout-client';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verify auth session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('[Layout] Auth user check:', { userId: user?.id, error: authError?.message });
  if (authError || !user) {
    console.log('[Layout] Redirecting to login because no auth user');
    redirect('/login');
  }

  // Fetch user profile info
  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('nome, email, tipo, loja_id')
    .eq('id', user.id)
    .single();

  console.log('[Layout] Profile check:', { profile, error: profileError?.message });

  if (profileError || !profile) {
    console.log('[Layout] Redirecting to login because no profile found, signing out');
    // If auth user exists but no profile, sign out to clear cookies
    await supabase.auth.signOut({ scope: 'local' });
    redirect('/login');
  }

  console.log('[Layout] Fetching store with id:', profile.loja_id);
  // Fetch store info
  const { data: store, error: storeError } = await supabase
    .from('lojas')
    .select('*') // Get all fields including group_id, tipo_unidade, etc.
    .eq('id', profile.loja_id)
    .single();

  console.log('[Layout] Store check:', { store, error: storeError?.message });

  if (storeError || !store) {
    console.log('[Layout] Redirecting to login because no store found, signing out');
    await supabase.auth.signOut({ scope: 'local' });
    redirect('/login');
  }

  // Fetch business group info
  let grupo = null;
  if (store.grupo_id) {
    const { data: grupoData } = await supabase
      .from('grupos_empresariais')
      .select('*')
      .eq('id', store.grupo_id)
      .single();
    grupo = grupoData;
  }

  // Fetch all stores the user has access to
  let lojas: any[] = [];
  const { data: vinculos } = await supabase
    .from('usuario_lojas')
    .select('loja_id, acesso_todas_lojas, perfil')
    .eq('usuario_id', user.id)
    .eq('ativo', true);

  if (vinculos && vinculos.length > 0) {
    const hasGlobalAccess = vinculos.some((v: any) => v.acesso_todas_lojas);
    
    if (hasGlobalAccess && store.grupo_id) {
      // Owner or global user has access to all stores in this group
      const { data: allLojas } = await supabase
        .from('lojas')
        .select('*')
        .eq('grupo_id', store.grupo_id)
        .order('tipo_unidade', { ascending: false }) // Matriz first
        .order('ordem', { ascending: true })
        .order('nome_loja', { ascending: true });
      lojas = allLojas || [];
    } else {
      // Get only specifically linked stores
      const lojaIds = vinculos.map((v: any) => v.loja_id);
      const { data: specificLojas } = await supabase
        .from('lojas')
        .select('*')
        .in('id', lojaIds)
        .order('tipo_unidade', { ascending: false })
        .order('ordem', { ascending: true });
      lojas = specificLojas || [];
    }
  } else {
    // Fallback: if no relation table exists yet, return at least the active store
    lojas = [store];
  }

  // Get active role for the current store, default to profile type
  const activeVinculo = vinculos?.find((v: any) => v.loja_id === profile.loja_id);
  const perfilAtivo = activeVinculo?.perfil || profile.tipo;

  return (
    <AppLayoutClient 
      store={store} 
      profile={{
        ...profile,
        tipo: perfilAtivo // Use the role active in this store
      }}
      grupo={grupo}
      lojas={lojas}
      lojaAtiva={store}
      perfil={perfilAtivo}
    >
      {children}
    </AppLayoutClient>
  );
}
