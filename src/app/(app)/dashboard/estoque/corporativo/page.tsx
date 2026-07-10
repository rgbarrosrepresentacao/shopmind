import { EstoqueCorporativoClient } from '@/components/estoque/estoque-corporativo-client';
import {
  getEstoqueCorporativoKPIs,
  getEstoqueCorporativoMatrix,
  getSmartTransferSuggestions,
  getSmartForecastingAndSuggestions,
} from '@/lib/actions/transferencias';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'ShopMind — Estoque Corporativo',
  description: 'Visão de estoque consolidada do grupo empresarial, pivot de filiais e sugestões inteligentes.',
};

export default async function EstoqueCorporativoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user role to ensure only authorized roles access the corporate dashboard
  const { data: profile } = await supabase
    .from('usuarios')
    .select('tipo')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.tipo !== 'dono' && profile.tipo !== 'financeiro')) {
    // Redirect to the regular store-level inventory page if not authorized for corporate holding view
    redirect('/dashboard/estoque');
  }

  // Fetch all data in parallel
  const [kpis, matrix, suggestions, predictiveData] = await Promise.all([
    getEstoqueCorporativoKPIs(),
    getEstoqueCorporativoMatrix(),
    getSmartTransferSuggestions(),
    getSmartForecastingAndSuggestions(),
  ]);

  if (matrix.error) {
    console.error('Erro ao carregar matriz de estoque corporativo:', matrix.error);
  }

  return (
    <EstoqueCorporativoClient
      kpis={kpis}
      matrix={{
        rows: matrix.rows || [],
        lojasList: matrix.lojasList || [],
      }}
      suggestions={suggestions}
      predictiveData={{
        previsoes: predictiveData.previsoes || [],
        sugestoes: predictiveData.sugestoes || [],
        sugestoesCompra: predictiveData.sugestoesCompra || [],
      }}
    />
  );
}
