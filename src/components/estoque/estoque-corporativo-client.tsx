'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type {
  CorporateStockMatrixRow,
  CorporateStockKPIs,
  SmartSuggestion,
} from '@/lib/types/transferencias';
import {
  DollarSign,
  Truck,
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Building2,
  Sparkles,
  Search,
  CheckCircle2,
  ArrowUpRight,
  HelpCircle,
  ShoppingCart,
} from 'lucide-react';

interface EstoqueCorporativoClientProps {
  kpis: CorporateStockKPIs;
  matrix: {
    rows: CorporateStockMatrixRow[];
    lojasList: { id: string; nome_loja: string; tipo_unidade: string }[];
  };
  suggestions: SmartSuggestion[];
  predictiveData: {
    previsoes: any[];
    sugestoes: any[];
    sugestoesCompra: any[];
  };
}

export function EstoqueCorporativoClient({
  kpis,
  matrix,
  suggestions,
  predictiveData,
}: EstoqueCorporativoClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('todos');
  const [activePredictiveTab, setActivePredictiveTab] = React.useState<'rupturas' | 'remanejamentos' | 'compras'>('rupturas');

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Filter matrix rows based on search and status filters
  const filteredRows = React.useMemo(() => {
    return matrix.rows.filter(row => {
      const matchesSearch =
        row.produtoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.produtoSku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.produtoBarcode && row.produtoBarcode.includes(searchTerm));

      if (!matchesSearch) return false;

      if (statusFilter === 'todos') return true;

      // Check if any store has the filtered status
      return Object.values(row.estoquesPorLoja).some(est => {
        if (statusFilter === 'ruptura') return est.estoque_atual <= 0;
        if (statusFilter === 'critico') return est.status_estoque === 'critico';
        if (statusFilter === 'baixo') return est.status_estoque === 'baixo';
        if (statusFilter === 'excesso') return est.status_estoque === 'excesso';
        return true;
      });
    });
  }, [matrix.rows, searchTerm, statusFilter]);

  // Handle suggestion action
  const handleUseSuggestion = (sug: SmartSuggestion) => {
    const params = new URLSearchParams({
      quickstart: 'true',
      origem: sug.lojaOrigemId,
      destino: sug.lojaDestinoId,
      produtoMestre: sug.produtoMestreId,
      produtoNome: sug.produtoNome,
      quantidade: sug.quantidadeSugerida.toString(),
    });
    router.push(`/dashboard/estoque/transferencias?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Estoque Corporativo & Inteligência
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Painel consolidado do grupo empresarial, pivot de filiais e sugestões inteligentes de reposição.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard/estoque/transferencias')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
            <span>Central de Transferências</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Valor Total */}
        <div className="p-5 rounded-2xl bg-slate-900/45 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between hover:border-slate-700/60 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Patrimônio em Estoque</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-100">{formatCurrency(kpis.valorTotalEstoque)}</h3>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              Ativo circulante consolidado das filiais
            </p>
          </div>
        </div>

        {/* KPI 2: Estoque em Trânsito */}
        <div className="p-5 rounded-2xl bg-slate-900/45 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between hover:border-slate-700/60 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Capital em Trânsito</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-100">{formatCurrency(kpis.valorEmTransito)}</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              <span className="font-bold text-amber-400">{kpis.produtosEmTransito} un.</span> em trânsito ({kpis.transferenciasPendentes} remessas)
            </p>
          </div>
        </div>

        {/* KPI 3: Tempo Médio & Atrasos */}
        <div className="p-5 rounded-2xl bg-slate-900/45 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between hover:border-slate-700/60 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Eficiência de Logística</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-100">
              {kpis.tempoMedioTransferencia > 0 ? `${kpis.tempoMedioTransferencia} dia(s)` : 'N/D'}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              {kpis.transferenciasAtrasadas > 0 ? (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                  {kpis.transferenciasAtrasadas} remessas atrasadas
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tempo de trânsito saudável
                </span>
              )}
            </p>
          </div>
        </div>

        {/* KPI 4: Economia de Compra */}
        <div className="p-5 rounded-2xl bg-slate-900/45 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between hover:border-slate-700/60 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Capital Salvo por Giro</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-emerald-400">{formatCurrency(kpis.economiaGerada)}</h3>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 group/tooltip cursor-help">
              Economia gerada por remanejamentos
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span className="absolute hidden group-hover/tooltip:block bg-slate-950 text-slate-200 text-[10px] p-2 rounded-lg border border-slate-800 max-w-xs bottom-12 left-4 z-20 shadow-xl leading-normal">
                Reflete a contenção de custos estimada em 15% ao redistribuir estoque parado em vez de realizar compras emergenciais com novos fornecedores.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Sub-KPIs de Fluxo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/25 border border-slate-800/50 flex flex-wrap justify-between gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-slate-400">Filial mais Ativa (Envios)</p>
            <p className="font-bold text-slate-200 text-sm">{kpis.filialQueMaisEnvia}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400">Filial mais Ativa (Recebimentos)</p>
            <p className="font-bold text-slate-200 text-sm">{kpis.filialQueMaisRecebe}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400">Produtos com Ruptura</p>
            <p className="font-bold text-red-400 text-sm">{kpis.produtosComRuptura} item(ns)</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400">Produtos em Excesso</p>
            <p className="font-bold text-blue-400 text-sm">{kpis.produtosComExcesso} item(ns)</p>
          </div>
        </div>

        {/* AI Quick Insight Box */}
        <div className="p-4 rounded-xl bg-purple-950/10 border border-purple-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 animate-pulse-glow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-300">Dica da IA Gerente</p>
              <p className="text-[11px] text-purple-200/70 mt-0.5 leading-relaxed">
                Você possui {suggestions.length} transferências recomendadas inteligentes para otimizar o giro hoje.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('suggestions-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          >
            Ver Sugestões
          </button>
        </div>
      </div>

      {/* PAINEL DE INTELIGÊNCIA PREDITIVA (ETAPA 7, 8 & 13) */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/65 to-slate-950/45 border border-purple-500/20 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Painel de IA Preditiva & Suprimentos</h2>
                <span className="px-2 py-0.5 text-[9px] bg-purple-500/20 text-purple-300 rounded-full font-extrabold border border-purple-500/30 uppercase tracking-wide">
                  Enterprise IA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Projeção matemática de rupturas para os próximos 10 dias e planos automatizados de remanejamento e compras.
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 self-start sm:self-center">
            <button
              onClick={() => setActivePredictiveTab('rupturas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePredictiveTab === 'rupturas'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rupturas ({predictiveData.previsoes.length})
            </button>
            <button
              onClick={() => setActivePredictiveTab('remanejamentos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePredictiveTab === 'remanejamentos'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Remanejamentos ({predictiveData.sugestoes.length})
            </button>
            <button
              onClick={() => setActivePredictiveTab('compras')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activePredictiveTab === 'compras'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compras Sugeridas ({predictiveData.sugestoesCompra.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activePredictiveTab === 'rupturas' && (
          <div className="space-y-4">
            {predictiveData.previsoes.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800/60 rounded-xl bg-slate-950/25">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800/60">
                      <th className="p-3">Produto</th>
                      <th className="p-3">Filial Carente</th>
                      <th className="p-3 text-center">Estoque Atual</th>
                      <th className="p-3 text-right">Giro Diário (30d)</th>
                      <th className="p-3 text-center">Previsão de Ruptura</th>
                      <th className="p-3 text-right">Ação Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {predictiveData.previsoes.map((prev, idx) => {
                      const isUrgent = prev.diasRestantes <= 3;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/10 text-slate-300 transition-colors">
                          <td className="p-3">
                            <p className="font-bold text-slate-200">{prev.produtoNome}</p>
                            <span className="text-[10px] text-slate-500 font-mono">SKU: {prev.sku}</span>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-medium text-slate-300">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {prev.lojaNome}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              prev.estoqueAtual <= 0
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {prev.estoqueAtual} un.
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium text-slate-400">
                            {prev.mediaDiariaVendas} / dia
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                                isUrgent
                                  ? 'bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                <Clock className="w-3 h-3" />
                                {prev.diasRestantes === 0 ? 'RUPTURA HOJE' : `Em ${prev.diasRestantes} dia(s)`}
                              </span>
                              <span className="text-[9px] text-slate-500">{prev.dataPrevisaoRuptura}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {predictiveData.sugestoes.some(s => s.produtoMestreId === prev.produtoMestreId && s.lojaDestinoId === prev.lojaId) ? (
                              <button
                                onClick={() => setActivePredictiveTab('remanejamentos')}
                                className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-600 hover:text-white text-purple-400 text-[10px] font-bold rounded-lg border border-purple-500/20 transition-all cursor-pointer"
                              >
                                Remanejar Estoque
                              </button>
                            ) : (
                              <button
                                onClick={() => setActivePredictiveTab('compras')}
                                className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20 transition-all cursor-pointer"
                              >
                                Gerar Compra
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-950/25 rounded-xl border border-slate-800/40">
                Excelente! Nenhuma ruptura de estoque prevista para os próximos 10 dias em nenhuma filial do grupo.
              </div>
            )}
          </div>
        )}

        {activePredictiveTab === 'remanejamentos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {predictiveData.sugestoes.length > 0 ? (
              predictiveData.sugestoes.map((sug, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-purple-500/30 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm truncate" title={sug.produtoNome}>
                        {sug.produtoNome}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {sug.produtoSku}</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20 whitespace-nowrap">
                      Salva R$ {sug.economiaObtida}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 items-center bg-slate-900/40 p-3 rounded-lg border border-slate-800/40 text-xs">
                    <div className="col-span-2 text-center">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Doadora</p>
                      <p className="font-bold text-slate-300 truncate mt-0.5">{sug.lojaOrigemNome}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Livre: {sug.estoqueOrigemDisponivel} un.</p>
                    </div>

                    <div className="col-span-1 flex flex-col items-center justify-center text-purple-400">
                      <span className="text-[10px] font-extrabold bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded border border-purple-500/25">
                        {sug.quantidadeSugerida} un.
                      </span>
                      <ArrowRightRightIcon className="w-4 h-4 mt-1 animate-pulse" />
                    </div>

                    <div className="col-span-2 text-center">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Destino</p>
                      <p className="font-bold text-slate-300 truncate mt-0.5">{sug.lojaDestinoNome}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">Estoque: {sug.estoqueDestinoAtual} un.</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/20 p-2.5 rounded-lg border border-slate-800/20">
                    <span className="font-semibold text-purple-400">Motivo:</span> {sug.razao}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>Custo Estimado Frete: {formatCurrency(sug.frete)}</span>
                    <span>Tempo de Trânsito: ~{sug.tempoEstimado} dias</span>
                  </div>

                  <button
                    onClick={() => handleUseSuggestion(sug)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-bold rounded-lg border border-purple-500/30 transition-all cursor-pointer"
                  >
                    <span>Executar Remanejamento IA</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-slate-500 bg-slate-950/20 rounded-xl border border-slate-800/40">
                Nenhum remanejamento preditivo sugerido no momento.
              </div>
            )}
          </div>
        )}

        {activePredictiveTab === 'compras' && (
          <div className="space-y-4">
            {predictiveData.sugestoesCompra.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800/60 rounded-xl bg-slate-950/25">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800/60">
                      <th className="p-3">Produto</th>
                      <th className="p-3">Filial de Destino</th>
                      <th className="p-3 text-right">Sugestão de Compra</th>
                      <th className="p-3 text-right">Preço de Custo Médio</th>
                      <th className="p-3">Fornecedor Sugerido</th>
                      <th className="p-3 text-center">Prazo de Entrega (Lead Time)</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {predictiveData.sugestoesCompra.map((compra, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10 text-slate-300 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-slate-200">{compra.produtoNome}</p>
                          <span className="text-[10px] text-slate-500 font-mono">SKU: {compra.sku}</span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-medium text-slate-300">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {compra.lojaDestinoNome}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-blue-400">
                          {compra.quantidadeSugerida} un.
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-300">
                          {formatCurrency(compra.precoCustoMedio)}
                        </td>
                        <td className="p-3">
                          <span className="text-slate-400 font-medium">{compra.fornecedorSugerido}</span>
                        </td>
                        <td className="p-3 text-center text-slate-400">
                          ~{compra.leadTimeEstimado} dias
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              const params = new URLSearchParams({
                                quickstart: 'true',
                                produtoMestre: compra.produtoMestreId,
                                loja: compra.lojaDestinoId,
                                quantidade: compra.quantidadeSugerida.toString(),
                              });
                              router.push(`/dashboard/compras?${params.toString()}`);
                            }}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[10px] font-bold rounded-lg border border-blue-500/30 transition-all flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Comprar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-950/25 rounded-xl border border-slate-800/40">
                Excelente! Todos os itens com risco de quebra possuem doadores viáveis no grupo. Nenhuma compra externa necessária.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Pivot Stock Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Matriz Pivot de Estoques</h2>
            <p className="text-xs text-slate-400 mt-0.5">Visão cruzada em tempo real de todas as filiais do grupo.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar produto ou SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48 sm:w-60 transition-all"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="todos">Todos os Estoques</option>
              <option value="ruptura">Ruptura (Zerado)</option>
              <option value="critico">Crítico (≤ Mínimo)</option>
              <option value="baixo">Baixo (&lt; 1.5x Mínimo)</option>
              <option value="excesso">Excesso (&gt; 3x Mínimo)</option>
            </select>
          </div>
        </div>

        {/* Pivot Matrix Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] font-bold border-b border-slate-800">
                <th className="p-3 w-[240px]">Produto / SKU</th>
                {matrix.lojasList.map(loja => (
                  <th key={loja.id} className="p-3 text-center truncate">
                    <span className="block truncate" title={loja.nome_loja}>
                      {loja.nome_loja}
                    </span>
                    <span className="block text-[8px] font-normal text-slate-500 mt-0.5 uppercase tracking-wider">
                      {loja.tipo_unidade}
                    </span>
                  </th>
                ))}
                <th className="p-3 text-right w-[100px]">Total Grupo</th>
                <th className="p-3 text-right w-[130px]">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredRows.length > 0 ? (
                filteredRows.map(row => (
                  <tr key={row.produtoMestreId} className="hover:bg-slate-800/20 text-slate-300 transition-colors">
                    {/* Name / SKU */}
                    <td className="p-3 font-semibold">
                      <div className="truncate" title={row.produtoNome}>
                        {row.produtoNome}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>SKU: {row.produtoSku}</span>
                        {row.produtoBarcode && (
                          <>
                            <span className="text-slate-700">•</span>
                            <span>EAN: {row.produtoBarcode}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Stores stocks */}
                    {matrix.lojasList.map(loja => {
                      const est = row.estoquesPorLoja[loja.id];
                      const val = est ? est.estoque_atual : 0;
                      const res = est ? est.estoque_reservado : 0;
                      const min = est ? est.estoque_minimo : 0;
                      const status = est ? est.status_estoque : 'normal';

                      // Badge styles based on status
                      let cellClass = 'bg-transparent text-slate-400';
                      let badgeClass = 'bg-slate-950 text-slate-400';

                      if (val <= 0) {
                        cellClass = 'bg-red-500/5';
                        badgeClass = 'bg-red-500/10 text-red-400 border border-red-500/20 font-bold';
                      } else if (status === 'critico') {
                        cellClass = 'bg-red-500/5';
                        badgeClass = 'bg-red-600/20 text-red-300 border border-red-500/30';
                      } else if (status === 'baixo') {
                        cellClass = 'bg-amber-500/5';
                        badgeClass = 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
                      } else if (status === 'excesso') {
                        cellClass = 'bg-blue-500/5';
                        badgeClass = 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
                      } else if (val > 0) {
                        badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                      }

                      return (
                        <td key={loja.id} className={`p-3 text-center ${cellClass}`}>
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${badgeClass}`}>
                              {val} {row.produtoUnidade}
                            </span>
                            {res > 0 && (
                              <span className="text-[9px] text-amber-500 font-medium" title="Estoque Reservado para transferência">
                                {res} res.
                              </span>
                            )}
                            <span className="text-[8px] text-slate-500">mín: {min}</span>
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Stock */}
                    <td className="p-3 text-right font-bold text-slate-100">
                      {row.estoqueTotalGrupo} {row.produtoUnidade}
                    </td>

                    {/* Total Value */}
                    <td className="p-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(row.valorTotalGrupo)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={matrix.lojasList.length + 3} className="p-8 text-center text-slate-500">
                    Nenhum produto encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Suggestions Section */}
      <div id="suggestions-section" className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Sugestões Inteligentes de Reposição</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sugestões automáticas calculadas localmente ponderando estoque mínimo, giro, trânsito ativo e reservas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {suggestions.length > 0 ? (
            suggestions.map((sug, idx) => (
              <div
                key={`${sug.produtoMestreId}-${sug.lojaOrigemId}-${sug.lojaDestinoId}-${idx}`}
                className="p-5 rounded-xl bg-slate-950/65 border border-slate-800/80 hover:border-purple-500/30 transition-all flex flex-col justify-between gap-4 relative group"
              >
                <div className="absolute top-4 right-4 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold border border-purple-500/20">
                  Economia Inteligente
                </div>

                <div className="space-y-3">
                  {/* Product Info */}
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm truncate" title={sug.produtoNome}>
                      {sug.produtoNome}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {sug.produtoSku}</p>
                  </div>

                  {/* Transfer Route */}
                  <div className="grid grid-cols-5 items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40 text-xs">
                    {/* Origin */}
                    <div className="col-span-2 text-center">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Origem (Doadora)</p>
                      <p className="font-bold text-slate-200 truncate mt-0.5" title={sug.lojaOrigemNome}>
                        {sug.lojaOrigemNome}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Livre: {sug.estoqueOrigemDisponivel} un.</p>
                    </div>

                    {/* Arrow */}
                    <div className="col-span-1 flex flex-col items-center justify-center text-purple-400">
                      <span className="text-[10px] font-extrabold bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                        {sug.quantidadeSugerida} un.
                      </span>
                      <ArrowRightRightIcon className="w-4 h-4 mt-1 animate-pulse" />
                    </div>

                    {/* Destination */}
                    <div className="col-span-2 text-center">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Destino (Carente)</p>
                      <p className="font-bold text-slate-200 truncate mt-0.5" title={sug.lojaDestinoNome}>
                        {sug.lojaDestinoNome}
                      </p>
                      <p className="text-[10px] text-red-400 mt-0.5">Estoque: {sug.estoqueDestinoAtual}/{sug.estoqueDestinoMinimo} un.</p>
                    </div>
                  </div>

                  {/* Reason Text */}
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/20 p-2.5 rounded-lg border border-slate-800/20">
                    {sug.razao}
                  </p>
                </div>

                {/* Trigger Button */}
                <button
                  onClick={() => handleUseSuggestion(sug)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-bold rounded-lg border border-purple-500/30 transition-all cursor-pointer"
                >
                  <span>Solicitar Transferência Sugerida</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-8 text-center text-slate-500 bg-slate-950/20 rounded-xl border border-slate-800/40">
              Nenhuma sugestão de reposição necessária no momento. Todos os estoques estão equilibrados e acima do mínimo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Custom sub-component icon for clean visual
function ArrowRightRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
