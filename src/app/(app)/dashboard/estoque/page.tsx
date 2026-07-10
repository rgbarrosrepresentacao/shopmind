import { EstoquePageClient } from '@/components/estoque/estoque-page-client';
import {
  getEstoqueKPIs,
  getEstoqueAlertas,
  listMovimentacoes,
  getProdutosGiro,
  getProdutosParados,
  getValorEstoque,
  getMovimentacoesChart,
} from '@/lib/actions/estoque';

export const metadata = {
  title: 'ShopMind — Estoque Inteligente',
  description: 'Controle de estoque com alertas, giro, movimentações e inteligência comercial.',
};

export default async function EstoquePage() {
  // Fetch all data in parallel
  const [
    kpis,
    alertas,
    movimentacoesResult,
    giro,
    parados,
    valorEstoque,
    chartData,
  ] = await Promise.all([
    getEstoqueKPIs(),
    getEstoqueAlertas(),
    listMovimentacoes({ page: 1, perPage: 20 }),
    getProdutosGiro(),
    getProdutosParados(30),
    getValorEstoque(),
    getMovimentacoesChart(),
  ]);

  return (
    <EstoquePageClient
      kpis={kpis}
      alertas={alertas}
      movimentacoes={movimentacoesResult.data}
      movimentacoesCount={movimentacoesResult.count}
      giro={giro}
      parados={parados}
      valorEstoque={valorEstoque}
      chartData={chartData}
    />
  );
}
