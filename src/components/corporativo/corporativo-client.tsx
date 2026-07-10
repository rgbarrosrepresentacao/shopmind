"use client"

import * as React from "react"
import {
  TrendingUp,
  Award,
  RefreshCw,
  Sparkles,
  Brain,
  Send,
  Target,
  Download,
  DollarSign,
  Package,
  Users,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  MapPin,
  Plus,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Building2,
  Clock,
  UserCheck,
  Percent,
  CheckSquare,
  BarChart3,
  Truck,
  AlertTriangle,
  FileText,
  User,
  Shield,
  Briefcase,
  HelpCircle
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils/cn"
import { createClient } from "@/lib/supabase/client"
import {
  getCEODashboardData,
  resolverSolicitacaoAprovacao,
  salvarMetaCorporativa,
  askIACEO,
  getProactiveSummary
} from "@/lib/actions/corporativo"
import type {
  CEODashboardDossier,
  KPIsCorporativos,
  FilialCardExecutivo,
  RankingsCorporativos,
  BenchmarkItem,
  SolicitacaoAprovacao,
  MetaCorporativa,
  AlertaCorporativo,
  CEOActivityEvent
} from "@/lib/types/corporativo"

interface CorporativoClientProps {
  lojasGrupo: {
    id: string;
    nome_loja: string;
    tipo_unidade: string;
    status: string;
  }[];
  initialDossier: CEODashboardDossier;
}

const COLORS_CHART = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"]

export const CorporativoClient: React.FC<CorporativoClientProps> = ({
  lojasGrupo,
  initialDossier
}) => {
  // 1. Estados
  const [mounted, setMounted] = React.useState(false)
  const [selectedFilial, setSelectedFilial] = React.useState<string>("todos")
  const [activeTab, setActiveTab] = React.useState<
    | "visao_geral"
    | "holding_mapa"
    | "aprovacoes_alertas"
    | "timeline_rh"
    | "metas_comercial"
    | "previsoes_logistica"
    | "ia_ceo"
  >("visao_geral")
  const [loadingSilently, setLoadingSilently] = React.useState(false)

  // Dados reativos consolidados da holding
  const [dossier, setDossier] = React.useState<CEODashboardDossier>(initialDossier)
  
  // Destuturação dos dados do dossiê
  const { kpis, filiais, rankings, benchmark, aprovacoes, alertas, timeline, metas, comercial, logistico, rh, previsoes, sangriasHoje = [], descontosHoje = [] } = dossier

  // Estado da IA CEO
  const [iaSummary, setIaSummary] = React.useState<string>("")
  const [chatQuestion, setChatQuestion] = React.useState("")
  const [chatMessages, setChatMessages] = React.useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Olá, CEO! Sou a sua IA Corporativa de suporte contábil e de negócios. Analisei em profundidade os balanços, DRE, ruptura de estoque e o benchmark das filiais em tempo real. Em que decisão de alta governança posso lhe auxiliar hoje?" }
  ])
  const [iaThinking, setIaThinking] = React.useState(false)

  // Estado dos Filtros da Timeline
  const [timelineFilialFilter, setTimelineFilialFilter] = React.useState<string>("todos")
  const [timelineTypeFilter, setTimelineTypeFilter] = React.useState<string>("todos")

  // Estado do formulário de metas
  const [metaForm, setMetaForm] = React.useState({
    loja_id: "",
    tipo: "filial" as MetaCorporativa["tipo"],
    referencia_nome: "",
    metrica: "faturamento" as MetaCorporativa["metrica"],
    valor_alvo: "",
    periodo: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  })
  const [savingMeta, setSavingMeta] = React.useState(false)

  // Estado do formulário de aprovações
  const [selectedAprovacao, setSelectedAprovacao] = React.useState<SolicitacaoAprovacao | null>(null)
  const [aprovacaoObs, setAprovacaoObs] = React.useState("")
  const [resolvingAprovacao, setResolvingAprovacao] = React.useState(false)

  // 2. Sincronização e Refresh de Dados
  const refreshData = React.useCallback(async (storeId: string) => {
    setLoadingSilently(true)
    try {
      const newDossier = await getCEODashboardData(storeId)
      setDossier(newDossier)
    } catch (err) {
      console.error("Erro ao sincronizar dados corporativos:", err)
    } finally {
      setLoadingSilently(false)
    }
  }, [])

  // Carregamento inicial e Realtime com controle de performance (Debounce)
  React.useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    let debounceTimer: NodeJS.Timeout

    // Obter boletim proativo inicial real
    getProactiveSummary().then(summary => setIaSummary(summary))

    const handleDatabaseChange = () => {
      clearTimeout(debounceTimer)
      // Debounce de 2 segundos para consolidar eventos e evitar requests excessivos
      debounceTimer = setTimeout(() => {
        refreshData(selectedFilial)
      }, 2000)
    }

    const handleVendaInsert = (payload: any) => {
      const newVenda = payload.new
      if (newVenda && newVenda.status === "concluida") {
        const loja = lojasGrupo.find(l => l.id === newVenda.loja_id)
        const nomeLoja = loja ? loja.nome_loja : "Filial"
        const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(newVenda.total))
        toast.success(`[Tempo Real] Nova venda na filial "${nomeLoja}": ${valor}.`)
      }
      handleDatabaseChange()
    }

    // Inscrição em tempo real para tabelas estratégicas
    const channel = supabase
      .channel("ceo-command-center-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendas" }, handleVendaInsert)
      .on("postgres_changes", { event: "*", schema: "public", table: "financeiro" }, handleDatabaseChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, handleDatabaseChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "aprovacoes_solicitacoes" }, handleDatabaseChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "metas" }, handleDatabaseChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "logs_atividade" }, handleDatabaseChange)
      .subscribe()

    return () => {
      clearTimeout(debounceTimer)
      channel.unsubscribe()
    }
  }, [selectedFilial, refreshData, lojasGrupo])

  const handleFilialFilterChange = (val: string) => {
    setSelectedFilial(val)
    refreshData(val)
  }

  // 3. IA CEO Chat
  const handleAskIA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatQuestion.trim() || iaThinking) return

    const userText = chatQuestion.trim()
    setChatMessages(prev => [...prev, { role: "user", text: userText }])
    setChatQuestion("")
    setIaThinking(true)

    try {
      const res = await askIACEO(userText, selectedFilial)
      if (res.success && res.content) {
        setChatMessages(prev => [...prev, { role: "assistant", text: res.content! }])
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", text: `Desculpe, tive uma oscilação na análise contábil: ${res.error || 'Erro interno'}.` }])
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", text: "Não consegui obter a resposta no momento. Conexão oscilando." }])
    } finally {
      setIaThinking(false)
    }
  }

  // 4. Criação de Meta
  const handleCreateMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!metaForm.valor_alvo || Number(metaForm.valor_alvo) <= 0 || savingMeta) {
      toast.error("Insira um valor de meta válido.")
      return
    }

    setSavingMeta(true)
    try {
      const targetLojaId = metaForm.loja_id === "todos" || metaForm.loja_id === "" ? null : metaForm.loja_id
      const lojaNome = targetLojaId ? lojasGrupo.find(l => l.id === targetLojaId)?.nome_loja || "Filial" : "Grupo Consolidado"

      const res = await salvarMetaCorporativa({
        loja_id: targetLojaId,
        tipo: targetLojaId ? "filial" : "grupo",
        referencia_nome: metaForm.referencia_nome.trim() || `Meta Faturamento - ${lojaNome}`,
        metrica: metaForm.metrica,
        valor_alvo: Number(metaForm.valor_alvo),
        periodo: metaForm.periodo
      })

      if (res.success) {
        toast.success("Meta corporativa cadastrada!")
        setMetaForm(prev => ({ ...prev, valor_alvo: "", referencia_nome: "" }))
        refreshData(selectedFilial)
      } else {
        toast.error(res.error || "Erro ao registrar meta.")
      }
    } catch (err) {
      toast.error("Erro interno ao salvar meta.")
    } finally {
      setSavingMeta(false)
    }
  }

  // 5. Resolução de Aprovações
  const handleResolverAprovacao = async (status: "aprovado" | "reprovado") => {
    if (!selectedAprovacao || resolvingAprovacao) return

    setResolvingAprovacao(true)
    try {
      const res = await resolverSolicitacaoAprovacao(selectedAprovacao.id, status, aprovacaoObs)
      if (res.success) {
        toast.success(`Solicitação ${status === 'aprovado' ? 'aprovada' : 'reprovada'} com sucesso!`)
        setSelectedAprovacao(null)
        setAprovacaoObs("")
        refreshData(selectedFilial)
      } else {
        toast.error(res.error || "Erro ao processar governança.")
      }
    } catch (err) {
      toast.error("Erro na transação de rede.")
    } finally {
      setResolvingAprovacao(false)
    }
  }

  // 6. Exportação CSV (Regra 10: botões não estão quebrados, realizam a ação real de exportação do dossiê)
  const handleExportCSV = () => {
    try {
      const hojeStr = new Date().toISOString().split("T")[0]
      let csvContent = "data:text/csv;charset=utf-8,"
      csvContent += "Metrica,Valor Real\n"
      csvContent += `Faturamento Mensal,${kpis.faturamentoMes.toFixed(2)}\n`
      csvContent += `Lucro Liquido,${kpis.lucroLiquido.toFixed(2)}\n`
      csvContent += `CMV do Grupo,${(kpis.faturamentoMes - kpis.lucroBruto).toFixed(2)}\n`
      csvContent += `Margem Operacional %,${kpis.margemLucro.toFixed(2)}\n`
      csvContent += `Capital em Estoque,${kpis.valorEstoque.toFixed(2)}\n`
      csvContent += `Capital em Transito,${kpis.capitalEmTransito.toFixed(2)}\n`
      csvContent += `Capital Reservado,${kpis.capitalReservado.toFixed(2)}\n`
      csvContent += `Capital Parado,${kpis.capitalParado.toFixed(2)}\n`
      csvContent += `Contas a Pagar,${kpis.contasPagar.toFixed(2)}\n`
      csvContent += `Contas a Receber,${kpis.contasReceber.toFixed(2)}\n`
      csvContent += `Health Score Holding,${kpis.healthScore}\n`

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Holding_CEO_Dossier_${hojeStr}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("CSV exportado com sucesso!")
    } catch (err) {
      toast.error("Erro ao gerar planilha CSV.")
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val)
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return "emerald"
    if (score >= 60) return "amber"
    return "rose"
  }

  const getHealthBadge = (score: number) => {
    if (score >= 80) return "Excelente"
    if (score >= 60) return "Atenção"
    return "Crítico"
  }

  // Filtragem da Timeline
  const filteredTimeline = timeline.filter(event => {
    const matchFilial = timelineFilialFilter === "todos" || event.lojaId === timelineFilialFilter
    const matchType = timelineTypeFilter === "todos" || event.tipo === timelineTypeFilter
    return matchFilial && matchType
  })

  // Dados para gráficos de Benchmark e DRE
  const chartBenchmarkData = benchmark.map(b => ({
    name: b.lojaNome,
    Faturamento: b.receita,
    Lucro: b.lucro,
    Margem: Number(b.margem.toFixed(1))
  }))

  const chartShareData = benchmark.map(b => ({
    name: b.lojaNome,
    value: b.receita
  }))

  return (
    <div className="space-y-6 select-none">
      {/* 1. Header do Centro de Comando */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Centro de Comando Executivo
              </h1>
              <p className="text-xs text-slate-400">
                Governança e Inteligência Preditiva em Tempo Real do Grupo Empresarial
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Status Realtime */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-[10px] font-bold text-emerald-400">
            <span className={cn("w-1.5 h-1.5 rounded-full bg-emerald-400", { "animate-ping": !loadingSilently, "animate-spin": loadingSilently })} />
            {loadingSilently ? "Sincronizando..." : "Tempo Real Ativo"}
          </div>

          {/* Export button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-semibold gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Dados
          </Button>

          {/* Selector Filial */}
          <select
            value={selectedFilial}
            onChange={(e) => handleFilialFilterChange(e.target.value)}
            className="text-xs font-bold bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none cursor-pointer text-slate-200 focus:border-indigo-500 transition-all min-w-[170px]"
          >
            <option value="todos">🏢 Grupo Consolidado</option>
            {lojasGrupo.map(l => (
              <option key={l.id} value={l.id}>
                📍 {l.nome_loja}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Top Banner: Saúde Holding & Proactive Bulletins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Gauge */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col justify-between items-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-slate-800/50 pb-3 mb-2">
            <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              Saúde da Holding
            </h3>
            <Badge variant="outline" className="text-[9px] font-bold bg-slate-950/40 border-slate-800">
              Score Geral
            </Badge>
          </div>

          <div className="flex flex-col items-center mt-3 select-none">
            <div className="relative flex items-center justify-center">
              <svg className="w-44 h-24" viewBox="0 0 100 50">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                <path
                  d="M 10 45 A 35 35 0 0 1 90 45"
                  fill="none"
                  stroke="url(#gaugeGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="126"
                  strokeDashoffset={126 - (126 * kpis.healthScore) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute bottom-1 flex flex-col items-center">
                <span className={cn("text-3xl font-extrabold tracking-tight", {
                  "text-emerald-400": kpis.healthScore >= 80,
                  "text-amber-400": kpis.healthScore >= 60 && kpis.healthScore < 80,
                  "text-rose-500": kpis.healthScore < 60
                })}>
                  {kpis.healthScore}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {getHealthBadge(kpis.healthScore)}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-2 text-center border-t border-slate-800/40 pt-3 mt-4 text-[9px] font-semibold text-slate-400">
            <div>
              <span className="block text-slate-200 font-bold">25%</span>
              Financeiro
            </div>
            <div>
              <span className="block text-slate-200 font-bold">20%</span>
              Estoque
            </div>
            <div>
              <span className="block text-slate-200 font-bold">15%</span>
              Clientes
            </div>
          </div>
        </div>

        {/* Boletim IA CEO Proativa */}
        <div className="lg:col-span-2 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-[-10%] top-[-20%] w-[220px] h-[220px] bg-radial-gradient from-violet-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="z-10 flex items-center justify-between border-b border-slate-800/50 pb-3 mb-3">
            <div className="flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
              <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
                Conselho da IA CEO Proativa (Dados Reais)
              </h3>
            </div>
            <Badge className="text-[9px] font-bold bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> IA Copiloto
            </Badge>
          </div>

          <div className="z-10 flex-1 overflow-y-auto max-h-36 pr-1 text-xs text-slate-300 leading-relaxed space-y-2.5 font-medium whitespace-pre-wrap">
            {iaSummary ? iaSummary : (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full bg-slate-800/50" />
                <Skeleton className="h-4 w-[90%] bg-slate-800/50" />
                <Skeleton className="h-4 w-[95%] bg-slate-800/50" />
                <Skeleton className="h-4 w-[80%] bg-slate-800/50" />
              </div>
            )}
          </div>

          <div className="z-10 mt-3 pt-3 border-t border-slate-800/40 flex items-center justify-between">
            <span className="text-[9px] text-slate-400">
              Gerado automaticamente a partir de balanços do grupo
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("ia_ceo")}
              className="text-[10px] py-1 px-2.5 h-auto font-bold gap-1 border-violet-500/20 text-violet-400 hover:bg-violet-500/10 bg-transparent"
            >
              Consultar IA CEO interativa
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Abas Estratégicas CEO */}
      <div className="flex border border-slate-800 bg-slate-900/20 backdrop-blur-md overflow-x-auto gap-2 p-1 rounded-xl">
        {[
          { id: "visao_geral", label: "📈 Painel Executivo & DRE" },
          { id: "holding_mapa", label: "🏢 Visão Holding & Mapa" },
          { id: "aprovacoes_alertas", label: "⚖️ Aprovações & Alertas", count: aprovacoes.filter(a => a.status === 'pendente').length },
          { id: "timeline_rh", label: "⏳ Timeline & Auditoria RH" },
          { id: "metas_comercial", label: "🎯 Metas & Comercial" },
          { id: "previsoes_logistica", label: "🚚 Logística & Previsões" },
          { id: "ia_ceo", label: "🧠 Copiloto IA CEO", isAi: true }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5",
              activeTab === tab.id
                ? tab.isAi
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
            )}
          >
            {tab.isAi && <Brain className="w-3.5 h-3.5" />}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.2 text-[8px] bg-rose-500 text-white font-bold rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Conteúdo das Abas */}
      <div className="min-h-[450px]">
        
        {/* =========================================================================
            ABA 1: PAINEL EXECUTIVO & DRE CONSOLIDADA
            ========================================================================= */}
        {activeTab === "visao_geral" && (
          <div className="space-y-6">
            {/* Cards Grid de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Faturamento (Hoje)", val: kpis.faturamentoHoje, color: "emerald", icon: DollarSign, subtitle: `Ontem: ${formatCurrency(kpis.faturamentoOntem)}` },
                { title: "Faturamento (Mês)", val: kpis.faturamentoMes, color: "indigo", icon: ShoppingBag, subtitle: `Ano: ${formatCurrency(kpis.faturamentoAno)}` },
                { 
                  title: "Lucro Líquido (Mês)", 
                  val: kpis.lucroLiquido, 
                  color: "teal", 
                  icon: TrendingUp, 
                  subtitle: `Margem: ${kpis.margemLucro.toFixed(1)}%`,
                  warning: kpis.isCustoFallback ? "Fallback: Custo contábil atual de produtos aplicado." : undefined
                },
                { title: "Capital em Estoque", val: kpis.valorEstoque, color: "amber", icon: Package, subtitle: `Parado: ${formatCurrency(kpis.capitalParado)}` },
                { title: "Capital em Trânsito", val: kpis.capitalEmTransito, color: "blue", icon: Truck, subtitle: `Reservado: ${formatCurrency(kpis.capitalReservado)}` },
                { title: "Saldo Caixa Consolidado", val: kpis.saldoBancario, color: "emerald", icon: CheckCircle2, subtitle: "Saldo líquido da holding" },
                { title: "Contas a Receber", val: kpis.contasReceber, color: "violet", icon: ArrowUpRight, subtitle: "Títulos pendentes/atrasados" },
                { title: "Contas a Pagar", val: kpis.contasPagar, color: "rose", icon: ArrowDownRight, subtitle: "Despesas pendentes/atrasadas" }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-700/80 transition-all">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.title}</span>
                    <span className={cn(`p-1.5 rounded-lg bg-${kpi.color}-500/10 text-${kpi.color}-400`)}>
                      <kpi.icon className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xl font-extrabold text-slate-100">{formatCurrency(kpi.val)}</h3>
                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      {kpi.subtitle}
                      {kpi.warning && (
                        <span className="text-amber-500 font-bold flex items-center cursor-help" title={kpi.warning}>
                          <AlertTriangle className="w-3 h-3 ml-0.5" />
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* DRE Simplificada e Gráfico de Faturamento vs Lucro */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Demonstração de Resultado do Exercício (DRE) REAL */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-4">
                  <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
                    Demonstrativo de Resultado Consolidado (DRE)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Balanço proporcional contábil do mês corrente</p>
                </div>

                <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                  {[
                    { label: "(+) Faturamento Bruto (Vendas)", val: kpis.faturamentoMes, isBold: true },
                    { label: "(-) Custo de Mercadorias Vendidas (CMV)", val: kpis.faturamentoMes - kpis.lucroBruto, isNegative: true },
                    { label: "(=) Lucro Bruto", val: kpis.lucroBruto, isBold: true, isHighlight: true },
                    { label: "(-) Despesas Operacionais (Pagas)", val: kpis.despesasPagasMes, isNegative: true },
                    { label: "(+) Receitas Financeiras (Pagas)", val: kpis.receitasPagasMes - kpis.faturamentoMes > 0 ? kpis.receitasPagasMes - kpis.faturamentoMes : 0 },
                    { label: "(=) Lucro Líquido do Grupo", val: kpis.lucroLiquido, isBold: true, isFinal: true }
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex justify-between text-xs py-1 px-1.5 rounded transition-all",
                        row.isHighlight && "bg-indigo-500/10 text-indigo-300 font-bold",
                        row.isFinal && "bg-emerald-500/10 text-emerald-300 font-extrabold text-sm border border-emerald-500/20",
                        !row.isHighlight && !row.isFinal && "text-slate-300"
                      )}
                    >
                      <span className={cn(row.isBold && "font-bold")}>{row.label}</span>
                      <span className={cn(row.isNegative && "text-rose-400", !row.isNegative && !row.isFinal && !row.isHighlight && "text-slate-100")}>
                        {row.isNegative ? "-" : ""}{formatCurrency(row.val)}
                      </span>
                    </div>
                  ))}
                  {kpis.isCustoFallback && (
                    <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 flex gap-1.5 items-start mt-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[9px] text-amber-300 leading-normal">
                        <strong>Nota Contábil:</strong> Custo histórico indisponível no snapshot da venda. Utilizando o custo atual dos produtos como fallback para a margem de lucro.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Area Chart: Faturamento e Lucro por Filial */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col">
                <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
                      Comparativo de Performance Financeira por Unidade
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Faturamento bruto contra lucro líquido operacional</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-slate-950/40 border-slate-800">Gráfico Executivo</Badge>
                </div>

                <div className="h-64 w-full flex-1">
                  {chartBenchmarkData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">Nenhum dado financeiro para exibir.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartBenchmarkData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "#f8fafc",
                          }}
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Area type="monotone" dataKey="Faturamento" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamento)" name="Faturamento" />
                        <Area type="monotone" dataKey="Lucro" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLucro)" name="Lucro Operacional" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Grid de Sangrias e Descontos do Dia */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              
              {/* Sangrias Realizadas Hoje */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col">
                <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                      <ArrowDownRight className="w-4 h-4 text-rose-400" /> Sangrias do Dia (Retiradas)
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Retiradas de dinheiro em espécie registradas hoje</p>
                  </div>
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    Total: {formatCurrency(sangriasHoje.reduce((acc, s) => acc + s.valor, 0))}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-60 min-h-[200px]">
                  {sangriasHoje.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                      <p className="text-xs font-bold text-slate-400">Nenhuma sangria hoje</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Todas as gavetas de caixas operando normalmente.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-950/20 border-b border-slate-800">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-bold text-slate-400">Filial</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400">Operador</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400">Motivo</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400 text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sangriasHoje.map((s) => (
                          <TableRow key={s.id} className="border-b border-slate-800/45 hover:bg-slate-850/20 transition-colors">
                            <TableCell className="py-2 text-[11px] text-slate-300 font-bold">{s.lojaNome}</TableCell>
                            <TableCell className="py-2 text-[11px] text-slate-400">{s.usuarioNome} <span className="text-[9px] text-slate-600 block">{s.hora}</span></TableCell>
                            <TableCell className="py-2 text-[11px] text-slate-400 max-w-[150px] truncate" title={s.motivo}>{s.motivo}</TableCell>
                            <TableCell className="py-2 text-[11px] text-rose-400 font-extrabold text-right">-{formatCurrency(s.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              {/* Descontos Concedidos Hoje */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col">
                <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-amber-400" /> Descontos do Dia (Vendas)
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Descontos concedidos em itens vendidos hoje</p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Total: {formatCurrency(descontosHoje.reduce((acc, d) => acc + d.valorDesconto, 0))}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto max-h-60 min-h-[200px]">
                  {descontosHoje.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                      <p className="text-xs font-bold text-slate-400">Nenhum desconto hoje</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Vendas faturadas sem reduções de margem.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-950/20 border-b border-slate-800">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-bold text-slate-400">Produto</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400">Operador</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400 text-right">Orig. (Venda)</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400 text-right">Desconto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {descontosHoje.map((d, idx) => (
                          <TableRow key={idx} className="border-b border-slate-800/45 hover:bg-slate-850/20 transition-colors">
                            <TableCell className="py-2 text-[11px] text-slate-300 font-bold max-w-[150px] truncate" title={d.produtoNome}>{d.produtoNome}</TableCell>
                            <TableCell className="py-2 text-[11px] text-slate-400">{d.usuarioNome} <span className="text-[9px] text-slate-600 block">{d.lojaNome} • {d.hora}</span></TableCell>
                            <TableCell className="py-2 text-[11px] text-slate-400 text-right">{formatCurrency(d.valorOriginal)} <span className="text-[9px] text-slate-500 block">(Venda #{d.vendaNumero})</span></TableCell>
                            <TableCell className="py-2 text-[11px] text-amber-400 font-extrabold text-right">-{formatCurrency(d.valorDesconto)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: VISÃO HIERÁRQUICA DA HOLDING & MAPA EXECUTIVO
            ========================================================================= */}
        {activeTab === "holding_mapa" && (
          <div className="space-y-8">
            {/* Estrutura de Hierarquia Corporativa */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="border-b border-slate-800 pb-3 mb-6">
                <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
                  Organograma e Hierarquia Operacional da Holding
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Estrutura organizacional de distribuição e filiais do grupo</p>
              </div>

              {/* Hierarquia Visual Matriz -> Filiais -> Depósitos */}
              <div className="flex flex-col items-center justify-center space-y-6">
                {/* Matriz */}
                {filiais.filter(f => f.status === 'ativo').slice(0, 1).map(matriz => (
                  <div key={matriz.id} className="flex flex-col items-center">
                    <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 border border-indigo-500/30 shadow-lg text-center min-w-[200px]">
                      <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[8px] font-bold mb-1">
                        MATRIZ CORPORATIVA
                      </Badge>
                      <h4 className="text-xs font-extrabold text-slate-100">{matriz.nome}</h4>
                      <p className="text-[10px] text-emerald-400 font-bold mt-1">{formatCurrency(matriz.faturamentoMes)}</p>
                    </div>
                    <div className="w-0.5 h-6 bg-slate-700/80 mt-2" />
                  </div>
                ))}

                {/* Linha horizontal conectando as filiais */}
                <div className="w-[80%] border-t-2 border-slate-800 relative">
                  <div className="absolute top-[-4px] left-[50%] transform -translate-x-1/2 w-2 h-2 rounded-full bg-slate-800" />
                </div>

                {/* Grid de Filiais Operacionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {filiais.map(filial => (
                    <div key={filial.id} className="flex flex-col items-center">
                      <div className="w-0.5 h-4 bg-slate-800 mb-2" />
                      <div className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3 text-center transition-all">
                        <Badge className="bg-slate-800 text-slate-400 text-[8px] font-bold mb-1.5">
                          FILIAL OPERACIONAL
                        </Badge>
                        <h4 className="text-xs font-bold text-slate-200">{filial.nome}</h4>
                        
                        <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-slate-800/40 text-[9px] font-semibold text-slate-400 text-left">
                          <div>
                            Faturamento: <span className="block text-slate-200 font-bold">{formatCurrency(filial.faturamentoMes)}</span>
                          </div>
                          <div>
                            Estoque: <span className="block text-slate-200 font-bold">{formatCurrency(filial.estoqueValor)}</span>
                          </div>
                          <div>
                            Funcionários: <span className="block text-slate-200 font-bold">{filial.funcionariosCount} online</span>
                          </div>
                          <div>
                            Caixa: <span className={cn("block font-bold", filial.caixaAberto ? "text-emerald-400" : "text-slate-400")}>
                              {filial.caixaAberto ? "Aberto" : "Fechado"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mapa Executivo de Saúde (Grid Visual) */}
            <div className="space-y-4">
              <div className="border-b border-slate-800/60 pb-2">
                <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
                  Mapa de Saúde e Performance das Filiais
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Indicadores de rentabilidade e risco operacional de cada unidade</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filiais.map(filial => {
                  const healthColor = getHealthColor(filial.healthScore)
                  return (
                    <div
                      key={filial.id}
                      className={cn(
                        "bg-slate-900/30 backdrop-blur-md border rounded-xl p-4 flex flex-col justify-between transition-all hover:translate-y-[-2px] shadow-sm",
                        `border-${healthColor}-500/20 hover:border-${healthColor}-500/40`
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/40 pb-2.5 mb-3">
                        <span className="text-xs font-bold text-slate-200">{filial.nome}</span>
                        <Badge className={cn(`bg-${healthColor}-500/10 text-${healthColor}-400 border border-${healthColor}-500/20 text-[9px] font-bold`)}>
                          Saúde: {filial.healthScore} ({getHealthBadge(filial.healthScore)})
                        </Badge>
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex justify-between text-[10px] font-medium text-slate-400">
                          <span>Atingimento Meta:</span>
                          <span className="text-slate-200 font-bold">{filial.percentualMeta.toFixed(1)}%</span>
                        </div>
                        {/* Progress bar meta */}
                        <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-1000", `bg-${healthColor}-500`)}
                            style={{ width: `${Math.min(100, filial.percentualMeta)}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 text-[9px] font-semibold text-slate-400">
                          <div>
                            Lucro Líquido: <span className="block text-slate-200 font-bold">{formatCurrency(filial.lucroMes)}</span>
                          </div>
                          <div>
                            Ticket Médio: <span className="block text-slate-200 font-bold">{formatCurrency(filial.ticketMedioMes)}</span>
                          </div>
                          <div>
                            Atendimentos: <span className="block text-slate-200 font-bold">{filial.clientesAtendidosHoje} hoje</span>
                          </div>
                          <div>
                            Alertas Ativos: <span className={cn("block font-bold", filial.alertasCount > 0 ? "text-rose-400 animate-pulse" : "text-slate-300")}>
                              {filial.alertasCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 3: CENTRAL DE APROVAÇÕES & ALERTAS CORPORATIVOS
            ========================================================================= */}
        {activeTab === "aprovacoes_alertas" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Central de Aprovações Pendentes */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  Fila Única de Aprovações Corporativas
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Liberação de descontos, preços, cancelamentos e movimentações de filiais</p>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 pr-1">
                {aprovacoes.filter(a => a.status === 'pendente').length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-1 text-center">
                    <CheckCircle2 className="w-8 h-8 text-slate-600" />
                    <p className="text-xs font-semibold">Nenhuma solicitação de aprovação pendente.</p>
                    <p className="text-[10px] text-slate-600">A governança da holding está totalmente em ordem.</p>
                  </div>
                ) : (
                  aprovacoes.filter(a => a.status === 'pendente').map(aprov => (
                    <div key={aprov.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-0.5">
                          <Badge className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-bold tracking-wide">
                            {aprov.tipo.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <h4 className="text-xs font-bold text-slate-200 mt-1">{aprov.loja_nome}</h4>
                        </div>
                        <span className="text-[9px] font-semibold text-slate-400">
                          {new Date(aprov.solicitado_em).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{aprov.descricao}</p>
                      {aprov.valor && (
                        <p className="text-xs font-extrabold text-emerald-400 mt-1.5">
                          Valor envolvido: {formatCurrency(aprov.valor)}
                        </p>
                      )}

                      <div className="mt-3 flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedAprovacao(aprov)}
                          className="text-[10px] font-semibold py-1 px-3 bg-slate-900 border-slate-800 hover:bg-slate-850 h-auto"
                        >
                          Decidir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Central de Alertas Críticos em Tempo Real */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                    Central de Alertas e Segurança
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Monitoramento ativo de caixas, estoques, vencimentos e riscos</p>
                </div>
                {alertas.length > 0 && (
                  <Badge className="bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[9px]">
                    {alertas.length} Ativos
                  </Badge>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2.5 pr-1">
                {alertas.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-1 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-xs font-semibold text-emerald-400">Zero riscos operacionais encontrados.</p>
                    <p className="text-[10px] text-slate-600">Holding operando sob segurança máxima.</p>
                  </div>
                ) : (
                  alertas.map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border flex gap-3 items-start transition-all",
                        alert.tipo === 'critico' 
                          ? "bg-rose-950/20 border-rose-500/20 text-rose-300 hover:border-rose-500/40" 
                          : "bg-amber-950/20 border-amber-500/20 text-amber-300 hover:border-amber-500/40"
                      )}
                    >
                      <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", alert.tipo === 'critico' ? "text-rose-400 animate-pulse" : "text-amber-400")} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wide">{alert.titulo}</span>
                          <span className="text-[8px] opacity-75 font-bold">({alert.lojaNome})</span>
                        </div>
                        <p className="text-[11px] font-medium leading-relaxed">{alert.mensagem}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal de Decisão de Aprovação */}
            {selectedAprovacao && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-100">Avaliar Solicitação de Aprovação</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedAprovacao.loja_nome} — {selectedAprovacao.tipo.replace(/_/g, ' ').toUpperCase()}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {selectedAprovacao.descricao}
                    </p>
                    {selectedAprovacao.valor && (
                      <p className="text-xs font-extrabold text-emerald-400">
                        Valor: {formatCurrency(selectedAprovacao.valor)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Observações / Parecer Executivo</label>
                    <textarea
                      value={aprovacaoObs}
                      onChange={(e) => setAprovacaoObs(e.target.value)}
                      placeholder="Insira as justificativas ou observações contábeis..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none h-20 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedAprovacao(null)
                        setAprovacaoObs("")
                      }}
                      className="text-xs font-semibold bg-slate-850 border-slate-800 text-slate-400"
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={resolvingAprovacao}
                      onClick={() => handleResolverAprovacao("reprovado")}
                      className="text-xs font-bold border-rose-500/30 text-rose-400 hover:bg-rose-500/10 bg-transparent"
                    >
                      Recusar
                    </Button>
                    <Button
                      variant="ai"
                      size="sm"
                      disabled={resolvingAprovacao}
                      onClick={() => handleResolverAprovacao("aprovado")}
                      className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      Autorizar Operação
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ABA 4: TIMELINE DE NEGÓCIOS & AUDITORIA RH
            ========================================================================= */}
        {activeTab === "timeline_rh" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Timeline Corporativa */}
            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div className="border-b border-slate-800 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Timeline Corporativa e Auditoria CEO
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fluxo de auditoria de vendas, logins e atividades críticas</p>
                </div>
                
                {/* Timeline Filters */}
                <div className="flex gap-2">
                  <select
                    value={timelineFilialFilter}
                    onChange={(e) => setTimelineFilialFilter(e.target.value)}
                    className="text-[10px] font-bold bg-slate-950 border border-slate-800 rounded px-2 py-1 outline-none text-slate-300"
                  >
                    <option value="todos">🏢 Todas Lojas</option>
                    {lojasGrupo.map(l => (
                      <option key={l.id} value={l.id}>{l.nome_loja}</option>
                    ))}
                  </select>
                  <select
                    value={timelineTypeFilter}
                    onChange={(e) => setTimelineTypeFilter(e.target.value)}
                    className="text-[10px] font-bold bg-slate-950 border border-slate-800 rounded px-2 py-1 outline-none text-slate-300"
                  >
                    <option value="todos">🎯 Todos Eventos</option>
                    <option value="venda">Vendas</option>
                    <option value="abertura_caixa">Abertura Caixa</option>
                    <option value="fechamento_caixa">Fechamento Caixa</option>
                    <option value="transferencia">Transferências</option>
                    <option value="usuario">Auditoria/Usuários</option>
                    <option value="acesso_negado">Acesso Negado</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4 pr-1 relative pl-4 border-l border-slate-800">
                {filteredTimeline.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-1 text-center border-l-0">
                    <FileText className="w-8 h-8 text-slate-600" />
                    <p className="text-xs font-semibold">Nenhum evento registrado com estes filtros.</p>
                  </div>
                ) : (
                  filteredTimeline.map(event => (
                    <div key={event.id} className="relative space-y-1">
                      {/* Ponto na timeline */}
                      <div className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-slate-950" />
                      
                      <div className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400">
                        <span className="text-indigo-400 uppercase tracking-wide">{event.tipo}</span>
                        <span>•</span>
                        <span>{event.lojaNome}</span>
                        <span>•</span>
                        <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                        {event.descricao}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        Autor: <span className="font-bold text-slate-300">{event.usuarioNome}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Diretório de RH e Caixas Ativos */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Diretório RH & Auditoria de Colaboradores
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Gestão de acessos ativos e operadores de caixa em tempo real</p>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto max-h-[380px] pr-1">
                {/* Caixas Ativos */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Sessões de Caixas Ativas
                  </h4>
                  {rh.caixasAtivos.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Nenhum caixa aberto neste momento nas filiais.</p>
                  ) : (
                    <div className="space-y-2">
                      {rh.caixasAtivos.map((cx, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-850 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="font-bold text-slate-200">{cx.operadorNome}</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            📍 {cx.lojaNome}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Usuários Ativos no Grupo */}
                <div className="space-y-2 border-t border-slate-800/40 pt-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Colaboradores do Grupo
                  </h4>
                  <div className="space-y-2">
                    {rh.usuariosAtivos.map(user => (
                      <div key={user.id} className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-850 text-xs">
                        <div>
                          <p className="font-bold text-slate-200">{user.nome}</p>
                          <p className="text-[9px] text-slate-400 font-medium">Cargo: {user.cargo.toUpperCase()} • {user.email}</p>
                        </div>
                        <Badge className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold uppercase">
                          {user.ultimaLoja}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 5: METAS CORPORATIVAS & PERFORMANCE COMERCIAL
            ========================================================================= */}
        {activeTab === "metas_comercial" && (
          <div className="space-y-6">
            
            {/* Cadastro de Metas e Lista de Metas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Cadastro Meta */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-4">
                  <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    Estipular Nova Meta Comercial
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cadastrar alvos de faturamento para filiais ou holding</p>
                </div>

                <form onSubmit={handleCreateMeta} className="space-y-3 flex-1 flex flex-col justify-center">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Unidade Alvo</label>
                    <select
                      value={metaForm.loja_id}
                      onChange={(e) => setMetaForm(prev => ({ ...prev, loja_id: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="todos">🏢 Grupo Consolidado</option>
                      {lojasGrupo.map(l => (
                        <option key={l.id} value={l.id}>📍 {l.nome_loja}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Título de Referência</label>
                    <input
                      type="text"
                      value={metaForm.referencia_nome}
                      onChange={(e) => setMetaForm(prev => ({ ...prev, referencia_nome: e.target.value }))}
                      placeholder="Ex: Meta Faturamento Junho"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Métrica</label>
                      <select
                        value={metaForm.metrica}
                        onChange={(e) => setMetaForm(prev => ({ ...prev, metrica: e.target.value as any }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 outline-none"
                      >
                        <option value="faturamento">Faturamento (R$)</option>
                        <option value="vendas_qtd">Qtd Vendas</option>
                        <option value="novos_clientes">Novos Clientes</option>
                        <option value="margem">Margem (%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Mês Período</label>
                      <input
                        type="month"
                        value={metaForm.periodo}
                        onChange={(e) => setMetaForm(prev => ({ ...prev, periodo: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Valor Alvo (Target)</label>
                    <input
                      type="number"
                      value={metaForm.valor_alvo}
                      onChange={(e) => setMetaForm(prev => ({ ...prev, valor_alvo: e.target.value }))}
                      placeholder="Ex: 50000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="ai"
                    disabled={savingMeta}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs mt-2"
                  >
                    {savingMeta ? "Salvando meta..." : "Cadastrar Meta"}
                  </Button>
                </form>
              </div>

              {/* Lista de Metas e Projeções */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-4">
                  <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
                    Acompanhamento de Metas Comerciais e Tendência
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Alvos contra faturado real e estimativas estatísticas de fechamento</p>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[320px] space-y-4 pr-1">
                  {metas.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-1 text-center">
                      <Target className="w-8 h-8 text-slate-600" />
                      <p className="text-xs font-semibold">Nenhuma meta estipulada para o mês.</p>
                      <p className="text-[10px] text-slate-600">Utilize o formulário lateral para criar metas.</p>
                    </div>
                  ) : (
                    metas.map(meta => {
                      // Projeção linear simples de fechamento
                      const diaCorrente = new Date().getDate() || 1
                      const diasNoMes = 30
                      const forecastFechamento = (meta.valor_atual / diaCorrente) * diasNoMes
                      const atingimentoProjetadoPct = meta.valor_alvo > 0 ? (forecastFechamento / meta.valor_alvo) * 100 : 0
                      
                      return (
                        <div key={meta.id} className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-850 space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-200">{meta.referencia_nome}</h4>
                              <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">📍 {meta.loja_name} • Período: {meta.periodo}</p>
                            </div>
                            <Badge className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-bold text-[10px]">
                              Realizado: {meta.percentual.toFixed(0)}%
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, meta.percentual)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 font-semibold pt-1">
                              <span>Alvo: {meta.metrica === 'faturamento' ? formatCurrency(meta.valor_alvo) : meta.valor_alvo}</span>
                              <span>Real: {meta.metrica === 'faturamento' ? formatCurrency(meta.valor_atual) : meta.valor_atual}</span>
                            </div>
                          </div>

                          {/* Tendência de Fechamento */}
                          <div className="pt-2.5 border-t border-slate-800/40 grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-400">
                            <div>
                              Projeção Fechamento: <span className="block text-slate-200 font-bold">{meta.metrica === 'faturamento' ? formatCurrency(forecastFechamento) : forecastFechamento.toFixed(0)} un.</span>
                            </div>
                            <div>
                              Tendência: <span className={cn("block font-bold", atingimentoProjetadoPct >= 100 ? "text-emerald-400" : "text-rose-400")}>
                                {atingimentoProjetadoPct >= 100 ? "✓ Baterá a Meta" : `⚠ Fechará em ${atingimentoProjetadoPct.toFixed(0)}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Curva ABC Comercial */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase">
                  Classificação Curva ABC de Produtos da Holding
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Agrupamento contábil e share de faturamento acumulado por item</p>
              </div>

              {comercial.curvaABC.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-xs text-slate-500">
                  Nenhum faturamento registrado para computação da curva ABC.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-slate-800">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase">Produto</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-right">Faturamento</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-right">Share (%)</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-right">Share Acumulado (%)</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-400 uppercase text-center">Classificação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comercial.curvaABC.map((item, idx) => (
                      <TableRow key={idx} className="border-slate-800/40 hover:bg-slate-900/20">
                        <TableCell className="text-xs font-bold text-slate-200">{item.nome}</TableCell>
                        <TableCell className="text-xs text-slate-300 text-right">{formatCurrency(item.receita)}</TableCell>
                        <TableCell className="text-xs text-slate-300 text-right">{item.percentualShare.toFixed(1)}%</TableCell>
                        <TableCell className="text-xs text-slate-300 text-right">{item.percentualAcumulado.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={cn(
                              "text-[9px] font-bold py-0.5 px-2 rounded border",
                              item.classe === 'A' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                              item.classe === 'B' && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                              item.classe === 'C' && "bg-slate-800 border-slate-700 text-slate-400"
                            )}
                          >
                            Classe {item.classe}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 6: LOGÍSTICA & PREVISÕES PREDITIVAS
            ========================================================================= */}
        {activeTab === "previsoes_logistica" && (
          <div className="space-y-6">
            
            {/* Gráficos de Previsão de Receita e Sazonalidade */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Previsão Preditiva 30 Dias */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-4">
                  <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                    Projeções Financeiras 30 Dias (IA Preditiva)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Velocidade diária de vendas e algoritmos de regressão linear</p>
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-center">
                  {[
                    { label: "Receita Projetada 30 dias", val: previsoes.receitaProjetada30Dias, color: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" },
                    { label: "Lucro Líquido Projetado", val: previsoes.lucroProjetado30Dias, color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
                    { label: "Fluxo Caixa Projetado (Títulos)", val: previsoes.fluxoCaixaProjetado30Dias, color: "text-blue-300 bg-blue-500/10 border-blue-500/20" },
                    { label: "Demanda Compra Suprimentos", val: previsoes.comprasSugeridasValor, color: "text-amber-300 bg-amber-500/10 border-amber-500/20" }
                  ].map((row, idx) => (
                    <div key={idx} className={cn("p-3 rounded-lg border flex justify-between items-center text-xs font-bold", row.color)}>
                      <span>{row.label}</span>
                      <span>{formatCurrency(row.val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Métricas Logísticas de Estoque e Transferências */}
              <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col">
                <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1">
                      <Truck className="w-4 h-4 text-indigo-400" />
                      Eficiência Logística e Trânsito
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Indicadores de transferências e saúde de saldo de filiais</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-slate-950/40 border-slate-800">Métricas Reais</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                  {[
                    { label: "Transferências Realizadas", value: logistico.transferenciasCount, desc: "Envios no mês" },
                    { label: "Produtos em Trânsito", value: logistico.produtosEmTransito, desc: "Remessas ativas" },
                    { label: "Capital em Trânsito", value: formatCurrency(logistico.capitalEmTransito), desc: "Ativo circulante contábil" },
                    { label: "Tempo Médio de Viagem", value: `${logistico.tempoMedioTransito} dias`, desc: "Velocidade logística" },
                    { label: "Custo Acumulado de Frete", value: formatCurrency(logistico.custoFreteAcumulado), desc: "Despesas com transporte" },
                    { label: "Rupturas Críticas", value: logistico.rupturasCount, desc: "Filiais desabastecidas" }
                  ].map((metric, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950/40 border border-slate-850 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{metric.label}</span>
                      <div className="my-2">
                        <h4 className="text-lg font-extrabold text-slate-100">{metric.value}</h4>
                        <p className="text-[9px] text-slate-500 font-medium mt-0.5">{metric.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Histórico de Sazonalidade (Alertas do Banco) */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-md">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Alertas de Sazonalidade e Compra de Suprimentos
              </h4>
              <div className="space-y-2">
                {previsoes.alertasSazonalidade.map((alerta, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950/40 border border-slate-850 text-xs text-slate-300 leading-relaxed flex gap-2 items-start">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p>{alerta}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 7: COPILOTO IA CEO (CHAT INTERATIVO E INTELIGENTE)
            ========================================================================= */}
        {activeTab === "ia_ceo" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Boletim Proativo Executivo (Estatísticas Contábeis Reais) */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Boletim de Oportunidades CEO
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Pontos cruciais compilados dinamicamente</p>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[360px] text-xs text-slate-300 leading-relaxed space-y-3 whitespace-pre-wrap font-medium">
                {iaSummary ? iaSummary : "Gerando boletim estratégico real..."}
              </div>
            </div>

            {/* Chat de Consultoria Executiva IA CEO */}
            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-md flex flex-col h-[480px]">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
                  Consultoria de Alta Performance — IA CEO
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Analise balanços, decida investimentos e otimize estoques de filiais</p>
              </div>

              {/* Chat Message History */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-xl max-w-[85%] text-xs leading-relaxed transition-all",
                      msg.role === "user"
                        ? "bg-indigo-600 text-white ml-auto rounded-tr-none shadow-md font-semibold"
                        : "bg-slate-950/60 border border-slate-850 text-slate-300 rounded-tl-none whitespace-pre-wrap font-medium"
                    )}
                  >
                    {msg.text}
                  </div>
                ))}
                {iaThinking && (
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl rounded-tl-none max-w-[85%] text-xs text-slate-400 italic flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                    <span>IA CEO analisando dossiê contábil da holding...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleAskIA} className="flex gap-2 border-t border-slate-800/60 pt-3">
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  placeholder="Pergunte sobre rentabilidade, filiais críticas ou Curva ABC..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-violet-500 outline-none"
                />
                <Button
                  type="submit"
                  variant="ai"
                  disabled={iaThinking || !chatQuestion.trim()}
                  className="px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold h-auto rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
