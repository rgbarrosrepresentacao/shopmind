import { TransferenciasClient } from '@/components/estoque/transferencias-client';
import { listTransferencias } from '@/lib/actions/transferencias';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'ShopMind — Central de Transferências',
  description: 'Gerenciamento de transferências de estoque entre filiais com controle patrimonial e auditoria.',
};

interface PageProps {
  searchParams: {
    status?: string;
    origem?: string;
    destino?: string;
    search?: string;
    page?: string;
  };
}

export default async function TransferenciasPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch active user profile
  const { data: profile } = await supabase
    .from('usuarios')
    .select('id, nome, tipo, loja_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Deny access to vendedor and caixa roles
  if (profile.tipo === 'vendedor' || profile.tipo === 'caixa') {
    redirect('/dashboard');
  }

  // Fetch group details of the active store to find all filiais
  const { data: activeLoja } = await supabase
    .from('lojas')
    .select('grupo_id')
    .eq('id', profile.loja_id)
    .single();

  if (!activeLoja) {
    redirect('/dashboard');
  }

  // Fetch all active stores in the group
  const { data: lojas } = await supabase
    .from('lojas')
    .select('id, nome_loja, tipo_unidade')
    .eq('grupo_id', activeLoja.grupo_id)
    .eq('status', 'ativo')
    .order('nome_loja', { ascending: true });

  const status = searchParams?.status || 'todos';
  const origem = searchParams?.origem || undefined;
  const destino = searchParams?.destino || undefined;
  const search = searchParams?.search || undefined;
  const page = parseInt(searchParams?.page || '1', 10);

  // Fetch transfers list from database
  const res = await listTransferencias({
    status,
    lojaOrigemId: origem,
    lojaDestinoId: destino,
    search,
    page,
    perPage: 30,
  });

  if (res.error) {
    console.error('Erro ao listar transferências no servidor:', res.error);
  }

  return (
    <TransferenciasClient
      initialTransfs={res.data || []}
      initialCount={res.count || 0}
      lojasList={lojas || []}
      profile={profile}
    />
  );
}
