'use client';

import * as React from 'react';
import type { Caixa, CaixaFilter, MovimentacaoCaixa } from '@/lib/types/caixa';
import { listCaixas, getMovimentacoesCaixa } from '@/lib/actions/caixa';
import { formatBRL, getSaldoDinheiroEsperado, getDiferencaFechamento } from '@/lib/types/caixa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { Pagination } from '@/components/ui/pagination';
import { CaixaMovimentacoesTable } from './caixa-movimentacoes-table';
import { Search, Calendar, User, FileText, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Eye } from 'lucide-react';

interface CaixaHistoricoListaProps {
  userRole: string; // 'dono' | 'gerente' | 'caixa'
  operators: { id: string; nome: string }[];
}

export const CaixaHistoricoLista: React.FC<CaixaHistoricoListaProps> = ({
  userRole,
  operators,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [caixas, setCaixas] = React.useState<Caixa[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);

  // Filters State
  const [status, setStatus] = React.useState<'todos' | 'aberto' | 'fechado'>('todos');
  const [operatorId, setOperatorId] = React.useState<string>('todos');
  const [dataInicio, setDataInicio] = React.useState<string>('');
  const [dataFim, setDataFim] = React.useState<string>('');

  // Audit Detail Modal
  const [selectedCaixa, setSelectedCaixa] = React.useState<Caixa | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [detailMovs, setDetailMovs] = React.useState<MovimentacaoCaixa[]>([]);
  const [loadingDetails, setLoadingDetails] = React.useState(false);

  const isManager = userRole === 'dono' || userRole === 'gerente';

  React.useEffect(() => {
    loadCaixas();
  }, [page, status, operatorId, dataInicio, dataFim]);

  const loadCaixas = async () => {
    setLoading(true);
    try {
      const filters: CaixaFilter = {
        status,
        usuario_id: operatorId === 'todos' ? 'todos' : operatorId,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        page,
        perPage: 8,
      };

      const res = await listCaixas(filters);
      if (res.error) {
        toast.error(`Erro ao carregar histórico: ${res.error}`);
      } else {
        setCaixas(res.data);
        setCount(res.count);
      }
    } catch (e) {
      toast.error('Erro na requisição.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (caixa: Caixa) => {
    setSelectedCaixa(caixa);
    setIsModalOpen(true);
    setLoadingDetails(true);
    try {
      const res = await getMovimentacoesCaixa(caixa.id);
      if (res.error) {
        toast.error(`Erro ao carregar detalhes: ${res.error}`);
      } else {
        setDetailMovs(res.data);
      }
    } catch (err) {
      toast.error('Erro ao buscar transações do caixa.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleClearFilters = () => {
    setStatus('todos');
    setOperatorId('todos');
    setDataInicio('');
    setDataFim('');
    setPage(1);
  };

  const totalPages = Math.ceil(count / 8);

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-card p-4 rounded-xl border border-border/80">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
          <Select value={status} onChange={(e: any) => setStatus(e.target.value)}>
            <option value="todos">Todos os Status</option>
            <option value="aberto">Aberto</option>
            <option value="fechado">Fechado</option>
          </Select>
        </div>

        {isManager && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Operador</label>
            <Select value={operatorId} onChange={(e: any) => setOperatorId(e.target.value)}>
              <option value="todos">Todos os Operadores</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nome}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Data Início</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="date"
              className="pl-8 text-xs h-9"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Data Fim</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="date"
              className="pl-8 text-xs h-9"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <Button size="sm" onClick={loadCaixas} className="flex-1 h-9">
            Filtrar
          </Button>
          {(status !== 'todos' || operatorId !== 'todos' || dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-9 px-3">
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* History Grid / Table */}
      {loading ? (
        <div className="space-y-3 py-6">
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
      ) : caixas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/80 rounded-xl bg-card/40">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Nenhum caixa localizado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-normal">
            Não há registros de caixas que correspondam aos filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-border/60 rounded-xl bg-card shadow-sm">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="py-3 px-4">Abertura / Fechamento</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Abertura</th>
                  <th className="py-3 px-4">Vendas Dinheiro</th>
                  <th className="py-3 px-4">Aportes / Sangrias</th>
                  <th className="py-3 px-4">Fechamento Real</th>
                  <th className="py-3 px-4">Diferença / Quebra</th>
                  <th className="py-3 px-4 w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {caixas.map((c) => {
                  const expected = getSaldoDinheiroEsperado(c);
                  const diff = getDiferencaFechamento(c);
                  const isOpen = c.status === 'aberto';

                  // Difference badge styles
                  let diffColor = 'text-foreground font-semibold';
                  let diffLabel = formatBRL(diff);

                  if (!isOpen) {
                    if (diff === 0) {
                      diffColor = 'text-success font-bold flex items-center gap-1';
                      diffLabel = 'OK';
                    } else if (diff < 0) {
                      diffColor = 'text-destructive font-bold';
                      diffLabel = `${formatBRL(diff)}`;
                    } else {
                      diffColor = 'text-warning font-bold';
                      diffLabel = `+${formatBRL(diff)}`;
                    }
                  } else {
                    diffLabel = 'Caixa Aberto';
                    diffColor = 'text-primary/70 italic';
                  }

                  return (
                    <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex flex-col">
                          <span>{new Date(c.aberto_em).toLocaleString('pt-BR')}</span>
                          {c.fechado_em && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              Até {new Date(c.fechado_em).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground/80">
                          <User className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                          <span>{c.usuario_nome}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isOpen
                              ? 'bg-primary/10 text-primary border border-primary/25'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {isOpen ? 'Aberto' : 'Fechado'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold">{formatBRL(c.valor_abertura)}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">+{formatBRL(c.total_dinheiro)}</td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex flex-col">
                          <span className="text-blue-600 font-semibold">+{formatBRL(c.total_suprimentos)}</span>
                          <span className="text-destructive mt-0.5 font-semibold">-{formatBRL(c.total_sangrias)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-extrabold text-foreground">
                        {isOpen ? '—' : formatBRL(c.valor_fechamento || 0)}
                      </td>

                      <td className={`py-3.5 px-4 font-mono ${diffColor}`}>
                        {diff === 0 && !isOpen ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-success/15 text-success rounded-md font-bold">
                            <CheckCircle2 size={10} />
                            Sem Quebras
                          </span>
                        ) : (
                          diffLabel
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleOpenDetails(c)}
                          title="Ver Auditoria do Caixa"
                        >
                          <Eye size={14} className="mr-1" /> Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Sub-modal: Consolidated Audit Report */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Relatório de Auditoria — Caixa de ${selectedCaixa?.usuario_nome}`}
        description={`Sessão aberta em: ${
          selectedCaixa ? new Date(selectedCaixa.aberto_em).toLocaleString('pt-BR') : ''
        }`}
        size="xl"
      >
        {selectedCaixa && (
          <div className="space-y-6">
            {/* Header Audit Result */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border/80 p-4 rounded-xl shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Faturado</span>
                <span className="text-lg font-black text-foreground block mt-1.5">
                  {formatBRL(selectedCaixa.total_vendas)}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-1">
                  {selectedCaixa.quantidade_vendas} vendas concluídas
                </span>
              </div>

              <div className="bg-card border border-border/80 p-4 rounded-xl shadow-sm text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Saldo Dinheiro Estimado</span>
                <span className="text-lg font-black text-foreground block mt-1.5">
                  {formatBRL(getSaldoDinheiroEsperado(selectedCaixa))}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-1">
                  Abertura ({formatBRL(selectedCaixa.valor_abertura)}) + Vendas ({formatBRL(selectedCaixa.total_dinheiro)}) + Aportes ({formatBRL(selectedCaixa.total_suprimentos)}) - Sangrias ({formatBRL(selectedCaixa.total_sangrias)})
                </span>
              </div>

              {selectedCaixa.status === 'fechado' ? (
                <div
                  className={`border p-4 rounded-xl shadow-sm text-center ${
                    getDiferencaFechamento(selectedCaixa) === 0
                      ? 'bg-success/5 border-success/35 text-success'
                      : getDiferencaFechamento(selectedCaixa) < 0
                      ? 'bg-destructive/5 border-destructive/35 text-destructive'
                      : 'bg-warning/5 border-warning/35 text-warning'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">
                    Conferência física ({formatBRL(selectedCaixa.valor_fechamento || 0)})
                  </span>
                  
                  <span className="text-lg font-black block mt-1.5">
                    {getDiferencaFechamento(selectedCaixa) === 0 ? (
                      'Valores Batem'
                    ) : (
                      <>
                        {getDiferencaFechamento(selectedCaixa) > 0 ? '+' : ''}
                        {formatBRL(getDiferencaFechamento(selectedCaixa))}
                      </>
                    )}
                  </span>
                  
                  <span className="text-[10px] block mt-1 font-semibold flex items-center justify-center gap-1">
                    {getDiferencaFechamento(selectedCaixa) === 0 ? (
                      <>
                        <CheckCircle2 size={12} />
                        Diferença: R$ 0,00
                      </>
                    ) : getDiferencaFechamento(selectedCaixa) < 0 ? (
                      <>
                        <AlertCircle size={12} />
                        Falta na Gaveta (Quebra)
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} />
                        Sobra na Gaveta
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/25 p-4 rounded-xl shadow-sm text-center text-primary">
                  <span className="text-[10px] uppercase font-bold">Caixa Ativo</span>
                  <span className="text-lg font-black block mt-1.5 animate-pulse">Sessão em Andamento</span>
                  <span className="text-[10px] block mt-1">Valores provisórios</span>
                </div>
              )}
            </div>

            {/* Split Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Desdobramento Financeiro (Meios de Pagamento)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 border border-border/80 p-4 rounded-xl">
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold block">Dinheiro</span>
                  <span className="text-sm font-extrabold text-foreground mt-1 block">
                    {formatBRL(selectedCaixa.total_dinheiro)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold block">Pix</span>
                  <span className="text-sm font-extrabold text-foreground mt-1 block">
                    {formatBRL(selectedCaixa.total_pix)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold block">Cartão Crédito</span>
                  <span className="text-sm font-extrabold text-foreground mt-1 block">
                    {formatBRL(selectedCaixa.total_cartao_credito)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold block">Cartão Débito</span>
                  <span className="text-sm font-extrabold text-foreground mt-1 block">
                    {formatBRL(selectedCaixa.total_cartao_debito)}
                  </span>
                </div>
              </div>
            </div>

            {/* Operator Observation */}
            {selectedCaixa.observacao && (
              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Notas de Observação / Justificativa
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed font-semibold italic">
                  "{selectedCaixa.observacao}"
                </p>
              </div>
            )}

            {/* History of operations in session */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Extrato Detalhado da Sessão (Histórico)
              </h4>
              <CaixaMovimentacoesTable movimentacoes={detailMovs} loading={loadingDetails} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Fechar Auditoria
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
