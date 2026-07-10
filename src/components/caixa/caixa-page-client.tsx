'use client';

import * as React from 'react';
import type { Caixa, MovimentacaoCaixa } from '@/lib/types/caixa';
import { getCurrentCaixa, getCaixaShellData, getMovimentacoesCaixa } from '@/lib/actions/caixa';
import { formatBRL, getSaldoDinheiroEsperado } from '@/lib/types/caixa';
import { CaixaAberturaDialog } from './caixa-abertura-dialog';
import { CaixaFechamentoDialog } from './caixa-fechamento-dialog';
import { CaixaOperacoesDialog } from './caixa-operacoes-dialog';
import { CaixaMovimentacoesTable } from './caixa-movimentacoes-table';
import { CaixaHistoricoLista } from './caixa-historico-lista';
import { CaixaIAInsights } from './caixa-ia-insights';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/dashboard/kpi-card';
import { toast } from '@/components/ui/toast';
import {
  Calculator,
  Clock,
  Brain,
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  CreditCard,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  PiggyBank,
  FileText,
  Sparkles,
} from 'lucide-react';

export default function CaixaPageClient() {
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'geral' | 'extrato' | 'historico' | 'ia-gerente'>('geral');
  const [caixa, setCaixa] = React.useState<Caixa | null>(null);
  
  // Shell metadata
  const [userRole, setUserRole] = React.useState<string>('caixa');
  const [userName, setUserName] = React.useState<string>('Operador');
  const [operators, setOperators] = React.useState<{ id: string; nome: string }[]>([]);

  // Timeline extrato of active caixa
  const [movimentacoes, setMovimentacoes] = React.useState<MovimentacaoCaixa[]>([]);
  const [loadingMovs, setLoadingMovs] = React.useState(false);

  // Dialog / Modal States
  const [isAberturaOpen, setIsAberturaOpen] = React.useState(false);
  const [isFechamentoOpen, setIsFechamentoOpen] = React.useState(false);
  const [isOperacoesOpen, setIsOperacoesOpen] = React.useState(false);
  const [operacaoTipo, setOperacaoTipo] = React.useState<'sangria' | 'suprimento'>('sangria');

  // Key to force refresh IA insights
  const [iaRefreshKey, setIaRefreshKey] = React.useState(0);

  React.useEffect(() => {
    loadShellAndCaixa();
  }, []);

  const loadShellAndCaixa = async () => {
    setLoading(true);
    try {
      const [resShell, resCaixa] = await Promise.all([
        getCaixaShellData(),
        getCurrentCaixa(),
      ]);

      if (resShell.error) {
        toast.error(`Erro ao carregar perfil: ${resShell.error}`);
      } else if (resShell.data) {
        setUserRole(resShell.data.profile.tipo);
        setUserName(resShell.data.profile.nome);
        setOperators(resShell.data.operators || []);
      }

      if (resCaixa.error) {
        toast.error(`Erro ao carregar caixa: ${resCaixa.error}`);
      } else {
        setCaixa(resCaixa.data);
        if (resCaixa.data) {
          // If caixa is open, fetch its transactions
          loadTransactions(resCaixa.data.id);
        }
      }
    } catch (err) {
      toast.error('Erro na requisição. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (caixaId: string) => {
    setLoadingMovs(true);
    try {
      const res = await getMovimentacoesCaixa(caixaId);
      if (res.error) {
        toast.error(`Erro ao carregar transações: ${res.error}`);
      } else {
        setMovimentacoes(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMovs(false);
    }
  };

  const refreshActiveCaixaData = async () => {
    try {
      const res = await getCurrentCaixa();
      if (res.data) {
        setCaixa(res.data);
        loadTransactions(res.data.id);
        setIaRefreshKey(prev => prev + 1);
      } else {
        setCaixa(null);
        setMovimentacoes([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenOperacao = (tipo: 'sangria' | 'suprimento') => {
    setOperacaoTipo(tipo);
    setIsOperacoesOpen(true);
  };

  const handleIAAction = (action: string) => {
    if (action === 'sangria') {
      handleOpenOperacao('sangria');
    }
  };

  const expectedCash = caixa ? getSaldoDinheiroEsperado(caixa) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted animate-pulse rounded-xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  // SCREEN 1: CAIXA FECHADO (Cash Register Closed)
  if (!caixa) {
    return (
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              🧮 Controle de Caixa
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Abra seu caixa operacional com o fundo de troco para iniciar as vendas do dia.
            </p>
          </div>
        </div>

        {/* Closed Cash Register Immersive Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card text-card-foreground border border-border/80 rounded-2xl p-8 shadow-md flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden min-h-[350px]">
            <div className="absolute inset-0 bg-radial-gradient from-primary/3 to-transparent pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-lg shadow-destructive/5 animate-pulse-glow">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20">
                Caixa Fechado
              </span>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight mt-2">
                Nenhum caixa aberto no momento
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm leading-normal">
                Para registrar vendas, suprimentos ou sangrias, abra o caixa informando o saldo inicial em dinheiro da sua gaveta.
              </p>
            </div>

            <Button
              onClick={() => setIsAberturaOpen(true)}
              className="px-6 py-2.5 shadow-lg shadow-primary/20"
            >
              <Unlock className="w-4 h-4 mr-2" /> Abrir Novo Caixa
            </Button>
          </div>

          {/* Quick Info & Guidelines */}
          <div className="space-y-4">
            <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Auditoria e Histórico
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você ainda pode consultar caixas anteriores, fechamentos e auditorias clicando na aba **Histórico de Caixas**.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('historico')}
                className="w-full text-xs font-semibold"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Ir para Histórico
              </Button>
            </div>

            {/* Smart IA Manager Card (Closed state) */}
            <div className="bg-gradient-to-br from-ia/5 to-primary/5 border border-ia/25 p-5 rounded-2xl shadow-sm space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-ia/20 text-ia flex items-center justify-center shadow-sm shadow-ia/20">
                  <Brain size={14} />
                </div>
                <span className="text-[10px] font-black text-ia uppercase tracking-wider">
                  IA Gerente Integrada
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                A IA Gerente monitora anomalias de suprimento e quebras físicas. Seus insights serão carregados assim que um caixa for iniciado.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Closed status */}
        <div className="border-b border-border">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'historico'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock size={16} />
              Histórico de Caixas
            </button>
          </nav>
        </div>

        <div className="mt-4">
          {activeTab === 'historico' && (
            <CaixaHistoricoLista userRole={userRole} operators={operators} />
          )}
        </div>

        {/* Dialog: Abertura */}
        <CaixaAberturaDialog
          isOpen={isAberturaOpen}
          onClose={() => setIsAberturaOpen(false)}
          onSuccess={loadShellAndCaixa}
        />
      </div>
    );
  }

  // SCREEN 2: CAIXA ATIVO (Open Cash Register)
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            🧮 Caixa Operacional Ativo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sessão iniciada por <strong className="text-foreground">{caixa.usuario_nome}</strong> em {new Date(caixa.aberto_em).toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Quick Cash Register Operations */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenOperacao('suprimento')}
            className="text-xs font-semibold"
          >
            <ArrowUpRight className="w-4 h-4 mr-1.5 text-blue-500" /> Aporte / Suprimento
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenOperacao('sangria')}
            className="text-xs font-semibold"
          >
            <ArrowDownLeft className="w-4 h-4 mr-1.5 text-destructive" /> Sangria / Retirada
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsFechamentoOpen(true)}
            className="text-xs font-bold shadow-lg shadow-destructive/10"
          >
            <Lock className="w-4 h-4 mr-1.5" /> Fechar Caixa
          </Button>
        </div>
      </div>

      {/* Inline security warnings from IA Gerente */}
      {expectedCash > 500 && (
        <div className="bg-warning/10 border border-warning/30 p-3 px-4 rounded-xl flex items-center justify-between gap-3 text-warning">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <span className="text-xs font-bold leading-normal">
              Volume alto de dinheiro físico na gaveta ({formatBRL(expectedCash)}). Recomenda-se realizar uma sangria de segurança.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenOperacao('sangria')}
            className="h-7 text-[10px] font-bold text-warning-foreground hover:bg-warning/20 border border-warning/35 shadow-none"
          >
            Sangria Preventiva
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Status do Caixa"
          value="ABERTO"
          icon={Unlock}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          trend={{ value: caixa.usuario_nome || 'Operador', isPositive: true }}
        />
        
        <KPICard
          title="Dinheiro Físico Esperado"
          value={formatBRL(expectedCash)}
          icon={Coins}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          progress={{
            value: (expectedCash / 500) * 100,
            maxLabel: 'Limite recomendado para Sangria: R$ 500,00',
          }}
        />

        <KPICard
          title="Faturamento em Vendas"
          value={formatBRL(caixa.total_vendas)}
          icon={DollarSign}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          trend={{ value: `${caixa.quantidade_vendas} vendas`, isPositive: true }}
        />

        <KPICard
          title="Abertura + Aportes"
          value={formatBRL(Number(caixa.valor_abertura) + Number(caixa.total_suprimentos))}
          icon={PiggyBank}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-500/10"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-6">
          {[
            { id: 'geral', label: 'Painel Geral', icon: Calculator },
            { id: 'extrato', label: 'Extrato Detalhado', icon: Clock },
            { id: 'historico', label: 'Histórico de Caixas', icon: FileText },
            { id: 'ia-gerente', label: 'IA Gerente insights', icon: Brain, isAI: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? tab.isAI
                      ? 'border-ia text-ia'
                      : 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} className={tab.isAI ? 'text-ia animate-pulse' : ''} />
                {tab.label}
                {tab.isAI && (
                  <span className="flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-ia animate-pulse" />
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column: Sales breakdown and active info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Payment Methods Audit */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Faturamento por Meio de Pagamento
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 border border-border/60 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Dinheiro</span>
                      <span className="text-base font-extrabold text-foreground block mt-1">
                        {formatBRL(caixa.total_dinheiro)}
                      </span>
                    </div>
                    <Coins className="w-5 h-5 text-emerald-500/70" />
                  </div>

                  <div className="bg-muted/30 border border-border/60 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Pix</span>
                      <span className="text-base font-extrabold text-foreground block mt-1">
                        {formatBRL(caixa.total_pix)}
                      </span>
                    </div>
                    <DollarSign className="w-5 h-5 text-indigo-500/70" />
                  </div>

                  <div className="bg-muted/30 border border-border/60 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Cartão Crédito</span>
                      <span className="text-base font-extrabold text-foreground block mt-1">
                        {formatBRL(caixa.total_cartao_credito)}
                      </span>
                    </div>
                    <CreditCard className="w-5 h-5 text-sky-500/70" />
                  </div>

                  <div className="bg-muted/30 border border-border/60 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Cartão Débito</span>
                      <span className="text-base font-extrabold text-foreground block mt-1">
                        {formatBRL(caixa.total_cartao_debito)}
                      </span>
                    </div>
                    <CreditCard className="w-5 h-5 text-teal-500/70" />
                  </div>
                </div>
              </div>

              {/* Transactions summary */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Movimentações Recentes (Dinheiro)
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setActiveTab('extrato')}
                  >
                    Ver Extrato Completo
                  </Button>
                </div>
                <CaixaMovimentacoesTable
                  movimentacoes={movimentacoes.slice(0, 5)}
                  loading={loadingMovs}
                />
              </div>
            </div>

            {/* Right Column: Mini IA Insights & Cash flow summary */}
            <div className="space-y-6">
              {/* Cash Register Ledger audit summary */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Conciliação de Dinheiro Físico
                </h3>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Fundo de Abertura</span>
                    <span className="font-semibold">{formatBRL(caixa.valor_abertura)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Entradas em Dinheiro (+)</span>
                    <span className="text-emerald-600 font-semibold">+{formatBRL(caixa.total_dinheiro)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Suprimentos adicionados (+)</span>
                    <span className="text-blue-600 font-semibold">+{formatBRL(caixa.total_suprimentos)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Sangrias realizadas (-)</span>
                    <span className="text-destructive font-semibold">-{formatBRL(caixa.total_sangrias)}</span>
                  </div>
                  <div className="border-t border-border pt-2.5 flex justify-between items-center font-bold text-sm text-foreground">
                    <span>Saldo Gaveta Estimado</span>
                    <span>{formatBRL(expectedCash)}</span>
                  </div>
                </div>
              </div>

              {/* IA Insights Mini-section */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
                <CaixaIAInsights
                  caixaId={caixa.id}
                  onActionTrigger={handleIAAction}
                  refreshKey={iaRefreshKey}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'extrato' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-foreground">Extrato de Movimentações</h3>
                <p className="text-[10px] text-muted-foreground">Listagem cronológica de todas as entradas, saídas e vendas do caixa ativo.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2"
                onClick={() => loadTransactions(caixa.id)}
              >
                <RefreshCw size={12} className="mr-1" /> Atualizar
              </Button>
            </div>
            <CaixaMovimentacoesTable movimentacoes={movimentacoes} loading={loadingMovs} />
          </div>
        )}

        {activeTab === 'historico' && (
          <CaixaHistoricoLista userRole={userRole} operators={operators} />
        )}

        {activeTab === 'ia-gerente' && (
          <div className="space-y-4">
            <CaixaIAInsights
              caixaId={caixa.id}
              onActionTrigger={handleIAAction}
              refreshKey={iaRefreshKey}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CaixaAberturaDialog
        isOpen={isAberturaOpen}
        onClose={() => setIsAberturaOpen(false)}
        onSuccess={loadShellAndCaixa}
      />

      <CaixaFechamentoDialog
        isOpen={isFechamentoOpen}
        onClose={() => setIsFechamentoOpen(false)}
        caixa={caixa}
        onSuccess={loadShellAndCaixa}
      />

      <CaixaOperacoesDialog
        isOpen={isOperacoesOpen}
        onClose={() => setIsOperacoesOpen(false)}
        caixaId={caixa.id}
        tipo={operacaoTipo}
        currentCashBalance={expectedCash}
        onSuccess={refreshActiveCaixaData}
      />
    </div>
  );
}
