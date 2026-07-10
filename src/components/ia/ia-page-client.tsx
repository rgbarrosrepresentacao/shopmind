"use client";

import * as React from "react";
import type { 
  IACreditos, 
  IALog, 
  IAPacoteCreditos, 
  IAAdminMetrics 
} from "@/lib/types/ia";
import { 
  getStoreIACreditos, 
  askIAGerente, 
  getRecentIALogs, 
  getIAPacotesDisponiveis, 
  comprarPacoteCreditosSimulado, 
  getIAAdminMetrics,
  getFreeStoreInsights
} from "@/lib/actions/ia";
import { IAUsageCard } from "./ia-usage-card";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { 
  Brain, Sparkles, Send, RefreshCw, AlertTriangle, 
  Clock, Landmark, Package, Truck, BarChart3, 
  TrendingUp, HelpCircle, Coins, ShieldAlert, 
  CheckCircle, Database, ChevronRight, BarChart
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, 
  YAxis, Tooltip, CartesianGrid 
} from "recharts";

interface IAPageClientProps {
  userTipo: string;
}

export default function IAPageClient({ userTipo }: IAPageClientProps) {
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"chat" | "insights" | "monitoramento">("chat");
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  
  // Data states
  const [credits, setCredits] = React.useState<IACreditos | null>(null);
  const [recentLogs, setRecentLogs] = React.useState<IALog[]>([]);
  const [freeInsights, setFreeInsights] = React.useState<{
    estoqueBaixo: number;
    estoqueZerado: number;
    contasAtrasadas: number;
    fornecedoresInativos: number;
    caixasAbertos: number;
  } | null>(null);
  const [adminMetrics, setAdminMetrics] = React.useState<IAAdminMetrics | null>(null);
  const [packages, setPackages] = React.useState<IAPacoteCreditos[]>([]);

  // Chat states
  const [chatMessages, setChatMessages] = React.useState<{
    role: "user" | "assistant" | "system";
    content: string;
    isCached?: boolean;
    timestamp: Date;
  }[]>([]);
  const [inputMessage, setInputMessage] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = React.useState("geral");

  // Dialog / Modal states
  const [isStoreOpen, setIsStoreOpen] = React.useState(false);
  const [isPurchasing, setIsPurchasing] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-redirect if estoquista opens chat as first view
  React.useEffect(() => {
    if (userTipo === "estoquista") {
      setActiveTab("insights");
    }
  }, [userTipo]);

  React.useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [resCredits, resLogs, resFree, resPackages] = await Promise.all([
        getStoreIACreditos(),
        getRecentIALogs(),
        getFreeStoreInsights(),
        getIAPacotesDisponiveis(),
      ]);

      if (resCredits.data) setCredits(resCredits.data);
      if (resLogs.data) setRecentLogs(resLogs.data);
      if (resFree) setFreeInsights(resFree);
      setPackages(resPackages);

      // Dono/Gerente admin monitoring metrics
      if (userTipo !== "estoquista") {
        const resMetrics = await getIAAdminMetrics();
        if (resMetrics.data) setAdminMetrics(resMetrics.data);
      }
    } catch (err) {
      toast.error("Erro ao carregar dados do módulo de IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const query = text || inputMessage.trim();
    if (!query) return;

    if (credits && (credits.consultas_utilizadas >= (credits.consultas_incluidas + credits.consultas_extras))) {
      toast.error("Limite mensal de consultas atingido. Adquira créditos adicionais.");
      return;
    }

    // Add user message
    setChatMessages(prev => [...prev, {
      role: "user",
      content: query,
      timestamp: new Date()
    }]);
    
    setInputMessage("");
    setIsTyping(true);

    try {
      const res = await askIAGerente(query, selectedAnalysisType);
      if (res.success && res.content) {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: res.content!,
          isCached: res.isCached,
          timestamp: new Date()
        }]);
        
        // Triggers refresh of credits usage count and logs
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(res.error || "Erro na resposta da IA.");
        setChatMessages(prev => [...prev, {
          role: "system",
          content: `⚠️ Erro ao processar a resposta: ${res.error || "Tente novamente."}`,
          timestamp: new Date()
        }]);
      }
    } catch {
      toast.error("Falha ao comunicar com a IA Gerente.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSimulatePurchase = async (pkgId: string) => {
    setIsPurchasing(pkgId);
    try {
      const res = await comprarPacoteCreditosSimulado(pkgId);
      if (res.success) {
        toast.success("Créditos adicionais creditados na sua conta!");
        setIsStoreOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast.error(res.error || "Erro na simulação de compra.");
      }
    } catch {
      toast.error("Erro ao realizar transação.");
    } finally {
      setIsPurchasing(null);
    }
  };

  if (loading && !credits) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-muted rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-muted rounded-2xl" />
          <div className="h-96 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-600 animate-pulse-glow" /> IA Gerente Inteligente
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Diagnósticos em tempo real, análises preditivas sob demanda e controle de cotas de IA.
          </p>
        </div>
        
        <button
          onClick={() => setRefreshTrigger(p => p + 1)}
          className="p-2.5 bg-white border border-border hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          title="Atualizar Dados"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="overflow-x-auto flex-shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 bg-slate-100/80 rounded-2xl p-1.5 w-max border border-slate-200/40 shadow-inner">
          
          {userTipo !== "estoquista" && (
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "px-4 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                {
                  "bg-white text-indigo-700 shadow-md border border-slate-200/30": activeTab === "chat",
                  "text-muted-foreground hover:text-foreground": activeTab !== "chat",
                }
              )}
            >
              <Brain className="w-3.5 h-3.5" /> Chat Inteligente
            </button>
          )}

          <button
            onClick={() => setActiveTab("insights")}
            className={cn(
              "px-4 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
              {
                "bg-white text-indigo-700 shadow-md border border-slate-200/30": activeTab === "insights",
                "text-muted-foreground hover:text-foreground": activeTab !== "insights",
              }
            )}
          >
            <Sparkles className="w-3.5 h-3.5" /> Insights Gratuitos (Zero Custo)
          </button>

          {userTipo !== "estoquista" && (
            <button
              onClick={() => setActiveTab("monitoramento")}
              className={cn(
                "px-4 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                {
                  "bg-white text-indigo-700 shadow-md border border-slate-200/30": activeTab === "monitoramento",
                  "text-muted-foreground hover:text-foreground": activeTab !== "monitoramento",
                }
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Monitoramento & Métricas
            </button>
          )}

        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Area - Main Panels */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: CHAT IA (Dono & Gerente Only) */}
          {activeTab === "chat" && userTipo !== "estoquista" && (
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px]">
              
              {/* Chat Header */}
              <div className="px-5 py-3.5 border-b border-border bg-slate-50/20 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                    Painel de Análise Estratégica
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Respostas sob demanda baseadas no contexto completo da sua loja.</p>
                </div>
                
                {/* Selector of Analysis Module */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mr-1">Foco:</span>
                  <select
                    value={selectedAnalysisType}
                    onChange={(e) => setSelectedAnalysisType(e.target.value)}
                    className="text-[10px] font-black bg-white border border-border rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:border-indigo-500"
                  >
                    <option value="geral">🌐 Visão Geral</option>
                    <option value="financeiro">💰 Financeiro & Caixa</option>
                    <option value="estoque">📦 Estoque & Compras</option>
                    <option value="clientes">👥 Clientes & Devedores</option>
                    <option value="produtos">🏷️ Margens & Catálogo</option>
                  </select>
                </div>
              </div>

              {/* Chat Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/10">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-4 shadow-sm animate-pulse-glow">
                      <Brain className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-800">Olá! Sou a IA Gerente do ShopMind</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                      Selecione uma das sugestões rápidas abaixo ou digite sua pergunta para que eu faça um diagnóstico real da sua loja.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn("flex", {
                        "justify-end": msg.role === "user",
                        "justify-start": msg.role === "assistant" || msg.role === "system",
                      })}
                    >
                      <div
                        className={cn("max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm border", {
                          "bg-indigo-600 text-white border-indigo-700 rounded-br-none shadow-indigo-600/5": msg.role === "user",
                          "bg-white text-slate-800 border-border/60 rounded-bl-none": msg.role === "assistant",
                          "bg-amber-50 text-amber-800 border-amber-200/50 rounded-md w-full": msg.role === "system",
                        })}
                      >
                        {/* Markdown Formatting Emulator */}
                        {msg.content.split("\n").map((line, i) => (
                          <p key={i} className={i > 0 ? "mt-2" : ""}>
                            {line.split("**").map((part, j) => 
                              j % 2 === 1 ? <strong key={j} className="font-black">{part}</strong> : part
                            )}
                          </p>
                        ))}

                        {/* Cache tag */}
                        {msg.isCached && (
                          <span className="mt-2 inline-flex items-center gap-0.5 text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded">
                            <Database className="w-2.5 h-2.5" /> Cache (0 Crédito)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-border/60 text-slate-500 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-border bg-slate-50/30">
                <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3.5 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all shadow-inner">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Ex: Como está a saúde financeira da minha loja?"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    disabled={isTyping}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isTyping}
                    className={cn(
                      "p-1.5 rounded-lg transition-all cursor-pointer",
                      inputMessage.trim() && !isTyping
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10"
                        : "text-muted-foreground/60 cursor-not-allowed"
                    )}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INSIGHTS GRATUITOS (Todos os perfis) */}
          {activeTab === "insights" && (
            <div className="space-y-5">
              
              {/* Explanatory Header */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm bg-gradient-to-r from-emerald-50/10 to-teal-50/10">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Alertas Contínuos sem Custo</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      Esses insights analíticos são extraídos de forma direta do banco de dados através de regras locais do ShopMind. 
                      Eles auxiliam nas operações da loja e **não consomem créditos** do seu saldo OpenAI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Insight Cards List */}
              {freeInsights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Estoque Crítico Card */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800">Alerta de Reposição de Estoque</h4>
                        <p className="text-[10px] text-slate-600 leading-normal mt-1">
                          Você tem <strong className="font-bold text-slate-800">{freeInsights.estoqueBaixo} produtos</strong> abaixo do estoque mínimo e <strong className="font-bold text-red-600">{freeInsights.estoqueZerado} produtos</strong> com estoque totalmente zerado.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/dashboard/estoque"
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 self-end"
                    >
                      Gerenciar Estoque <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Contas Vencidas Card */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800">Alertas Financeiros em Atraso</h4>
                        <p className="text-[10px] text-slate-600 leading-normal mt-1">
                          Existem <strong className="font-bold text-rose-600">{freeInsights.contasAtrasadas} títulos vencidos</strong> e não pagos na carteira. Efetue cobranças ativas para melhorar o fluxo de caixa.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/dashboard/financeiro"
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 self-end"
                    >
                      Ir para Financeiro <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Fornecedores Inativos Card */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800">Fornecedores sem Compra</h4>
                        <p className="text-[10px] text-slate-600 leading-normal mt-1">
                          Há <strong className="font-bold text-slate-800">{freeInsights.fornecedoresInativos} fornecedores</strong> sem compras nos últimos 60 dias. Considere renegociar estoques ou buscar novas cotações.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/dashboard/fornecedores"
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 self-end"
                    >
                      Visualizar Fornecedores <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Caixa Fisico Card */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <Coins className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800">Status dos Caixas Operacionais</h4>
                        <p className="text-[10px] text-slate-600 leading-normal mt-1">
                          No momento, sua loja conta com <strong className="font-bold text-purple-700">{freeInsights.caixasAbertos} sessões de caixas</strong> abertas ativamente para atendimento de vendas.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/dashboard/pdv"
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 self-end"
                    >
                      Acessar PDV <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: MONITORAMENTO & ADMIN IA (Dono & Gerente Only) */}
          {activeTab === "monitoramento" && userTipo !== "estoquista" && adminMetrics && (
            <div className="space-y-6">
              
              {/* Executive Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block">Total de Consultas</span>
                  <span className="text-lg font-black text-slate-800 block mt-1">{adminMetrics.totalConsultas}</span>
                  <span className="text-[8px] text-muted-foreground block mt-0.5">acumuladas no mês</span>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block">Cache Hit Rate</span>
                  <span className="text-lg font-black text-emerald-600 block mt-1">{adminMetrics.cacheHitRate}%</span>
                  <span className="text-[8px] text-emerald-600 font-semibold block mt-0.5">
                    {adminMetrics.consultasCached} consultas gratuitas
                  </span>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block">Consumo de Tokens</span>
                  <span className="text-lg font-black text-slate-800 block mt-1">
                    {new Intl.NumberFormat().format(adminMetrics.totalTokens)}
                  </span>
                  <span className="text-[8px] text-muted-foreground block mt-0.5">tokens entrada/saída</span>
                </div>

                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block">Custo Estimado</span>
                  <span className="text-lg font-black text-indigo-600 block mt-1">
                    ${adminMetrics.custoEstimadoTotal.toFixed(4)}
                  </span>
                  <span className="text-[8px] text-muted-foreground block mt-0.5">em dólares (USD)</span>
                </div>

              </div>

              {/* Recharts area graph of consumption */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Histórico de Volume de Chamadas</h3>
                  <p className="text-[9px] text-muted-foreground">Cronograma de consultas ativas (OpenAI) vs consultas em cache dos últimos 15 dias.</p>
                </div>
                
                <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={adminMetrics.consumoDiarioTimeline}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCached" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="data" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#ffffff", 
                          borderRadius: "12px", 
                          border: "1px solid #e2e8f0", 
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" 
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="qtd" 
                        name="Consultas OpenAI" 
                        stroke="#4f46e5" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cached" 
                        name="Consultas em Cache" 
                        stroke="#10b981" 
                        strokeWidth={1.5}
                        fillOpacity={1} 
                        fill="url(#colorCached)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Consumo por Tipo */}
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Distribuição por Categoria</h4>
                  <div className="space-y-2.5">
                    {adminMetrics.consumoPorTipo.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">Sem registros no período.</p>
                    ) : (
                      adminMetrics.consumoPorTipo.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-600 capitalize">📁 {item.tipo}</span>
                          <span className="font-bold text-slate-800">{item.qtd} consultas</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Consumo por Modelo */}
                <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Modelos de IA Ativos</h4>
                  <div className="space-y-2.5">
                    {adminMetrics.consumoPorModelo.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">Sem chamadas reais OpenAI.</p>
                    ) : (
                      adminMetrics.consumoPorModelo.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-600 font-mono">🤖 {item.modelo}</span>
                          <span className="font-bold text-indigo-600">{item.qtd} chamadas</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Quick suggestions grid (Only shown in Chat tab) */}
          {activeTab === "chat" && userTipo !== "estoquista" && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-indigo-500" /> Sugestões de Perguntas Rápidas
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { q: "Como está a saúde financeira da minha loja hoje?", type: "financeiro", label: "📊 Diagnóstico Geral" },
                  { q: "O que devo comprar de mercadorias esta semana?", type: "estoque", label: "📦 Sugestão de Compras" },
                  { q: "Quais produtos estão com estoque baixo?", type: "estoque", label: "⚠️ Estoque Crítico" },
                  { q: "Quais produtos dão maior margem de lucro?", type: "produtos", label: "📈 Ranking de Lucro" },
                  { q: "Quais clientes possuem faturas em atraso?", type: "clientes", label: "👥 Cobrança Ativa" },
                  { q: "Onde minha loja está perdendo mais dinheiro?", type: "financeiro", label: "🛑 Gargalos Financeiros" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAnalysisType(item.type);
                      handleSendMessage(item.q);
                    }}
                    disabled={isTyping}
                    className="p-3 bg-white border border-border hover:border-indigo-500/30 text-left rounded-xl transition-all hover:bg-indigo-50/20 cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0">
                      <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded block w-fit mb-1 leading-none">
                        {item.label}
                      </span>
                      <p className="text-[10px] font-medium text-slate-700 truncate">{item.q}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estoquista warning replacement card */}
          {userTipo === "estoquista" && activeTab === "chat" && (
            <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-sm max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-sm font-black text-slate-800">Chat Estratégico Bloqueado</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Olá! Como <strong className="font-bold">Estoquista</strong>, o seu perfil não possui acesso ao chat de inteligência artificial completa devido a restrições de RLS e exibição de dados de faturamento sensíveis. 
                Você pode monitorar os <strong className="font-bold">Insights Operacionais</strong> na aba ao lado para visualizar alertas de produtos sem estoque e compras de reposição.
              </p>
            </div>
          )}

        </div>

        {/* Right Area - Credits & Feed Sidebar */}
        <div className="space-y-6">
          
          {/* Usage credits progress card */}
          {credits && (
            <IAUsageCard
              credits={credits}
              onBuyClick={() => setIsStoreOpen(true)}
            />
          )}

          {/* Recent Queries / History Feed */}
          {userTipo !== "estoquista" && (
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-slate-50/20">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-4 h-4 text-slate-400" /> Histórico Recente
                </h3>
              </div>
              
              <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto">
                {recentLogs.length === 0 ? (
                  <div className="p-5 text-center text-[10px] text-muted-foreground italic">
                    Nenhuma consulta realizada.
                  </div>
                ) : (
                  recentLogs.map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-slate-50/30 transition-colors">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded leading-none">
                          {log.tipo || "geral"}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-semibold">
                          {new Date(log.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-800 mt-1.5 line-clamp-1">
                        {log.pergunta}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {log.resposta}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL SIMULADOR DE PREÇOS / PACOTES */}
      {isStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsStoreOpen(false)}
          />
          
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up p-6 space-y-5">
            <div className="text-center">
              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2.5 py-1 rounded uppercase tracking-wider">
                ShopMind Credits Store
              </span>
              <h3 className="text-base font-black text-slate-800 mt-2 flex items-center justify-center gap-1">
                Adquirir Pacotes de Consultas IA <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed max-w-sm mx-auto">
                Selecione um dos pacotes abaixo para reabastecer seu saldo. Em ambiente de homologação, a transação é simulada instantaneamente de forma gratuita.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packages.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="border border-border rounded-2xl p-4 text-center flex flex-col justify-between gap-4 bg-slate-50/40 relative group hover:border-indigo-500/40 transition-all"
                >
                  <div>
                    <span className="text-[9px] font-black text-slate-500 block">PACOTE</span>
                    <span className="text-sm font-black text-slate-800 block mt-1">{pkg.nome}</span>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">consultas extras</span>
                  </div>
                  
                  <div>
                    <span className="text-base font-black text-indigo-600 block">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(pkg.valor)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSimulatePurchase(pkg.id)}
                    disabled={isPurchasing !== null}
                    className="w-full py-1.5 text-[10px] font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-sm disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {isPurchasing === pkg.id ? (
                      <RefreshCw className="w-3.5 h-3.5 mx-auto animate-spin" />
                    ) : (
                      "Comprar"
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Warning footer about Asaas */}
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200/50 text-[9px] font-medium text-slate-600 text-center leading-relaxed">
              ⚠️ <strong className="font-bold text-slate-700">Nota comercial:</strong> O fluxo de checkout real via Asaas (PIX / Boleto / Cartão) está sendo homologado. Ao clicar em Comprar na demonstração acima, os créditos são adicionados instantaneamente sem custo real.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
