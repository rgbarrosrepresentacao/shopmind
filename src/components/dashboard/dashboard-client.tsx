"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KPICard } from "@/components/dashboard/kpi-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { AIRecommendationCard } from "@/components/dashboard/ai-recommendation-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  DollarSign,
  Monitor,
  Calculator,
  Warehouse,
  BarChart3,
  Brain,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export interface DashboardInsight {
  type: "insight" | "recommendation";
  title: string;
  message: string;
  priority?: "alta" | "media" | "baixa";
  actionLabel?: string;
  recommendationType?: "preco" | "estoque" | "compra";
}

interface DashboardClientProps {
  store: {
    id: string;
    nome_loja: string;
    slug: string;
  };
  productCount: number;
  clientCount: number;
  totalRevenue: number;
  totalSalesCount: number;
  productLimit: number;
  revenueTrend: string;
  isRevenuePositive: boolean;
  salesTrend: string;
  isSalesPositive: boolean;
  salesHistoryData: { name: string; valor: number }[];
  paymentMethodsData: { name: string; value: number }[];
  recentSales: { id: string; client: string; total: string; status: string; date: string }[];
  insights: DashboardInsight[];
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

export const DashboardClient: React.FC<DashboardClientProps> = ({
  store,
  productCount,
  clientCount,
  totalRevenue,
  totalSalesCount,
  productLimit,
  revenueTrend,
  isRevenuePositive,
  salesTrend,
  isSalesPositive,
  salesHistoryData,
  paymentMethodsData,
  recentSales,
  insights,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
    // Display welcome toast
    setTimeout(() => {
      toast.success(`Bem-vindo de volta ao ShopMind, ${store.nome_loja}!`);
    }, 500);
  }, [store.nome_loja]);

  // Product percentage calculation
  const productPercent = Math.min((productCount / productLimit) * 100, 100);

  const handleAction = (message: string) => {
    switch (message) {
      case "Nova Venda (PDV)":
        router.push("/dashboard/pdv");
        break;
      case "Abrir Caixa":
        router.push("/dashboard/caixa");
        break;
      case "Novo Produto":
        router.push("/dashboard/produtos/novo");
        break;
      case "Gerenciar Estoque":
        router.push("/dashboard/estoque");
        break;
      case "Relatórios de Gestão":
      case "Ver Relatórios":
        router.push("/dashboard/relatorios");
        break;
      case "Falar com a IA":
      case "Falar com IA":
      case "Falar com IA Gerente":
        router.push("/dashboard/ia");
        break;
      case "Configurações":
        router.push("/dashboard/configuracoes");
        break;
      default:
        toast.info(`Ação executada: ${message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-border/80 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
        {/* Glow circle overlay */}
        <div className="absolute right-[-10%] top-[-20%] w-[350px] h-[350px] bg-radial-gradient from-primary/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute left-[30%] bottom-[-20%] w-[250px] h-[250px] bg-radial-gradient from-ia/10 to-transparent blur-2xl pointer-events-none" />

        <div className="z-10 space-y-3">
          <Badge variant="ai" className="px-3 py-1 font-bold">
            Inteligência Ativa
          </Badge>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Olá, {store.nome_loja}!
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm max-w-xl leading-relaxed">
            Seu painel ShopMind está pronto. A IA Gerente identificou <span className="text-ia font-bold">3 novos insights</span> comerciais para impulsionar suas vendas hoje.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5 z-10">
          <Button
            variant="ai"
            size="sm"
            onClick={() => handleAction("Falar com a IA")}
            className="text-xs font-semibold gap-1.5"
          >
            <Brain className="w-3.5 h-3.5" />
            Falar com IA Gerente
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAction("Configurações")}
            className="text-xs font-semibold"
          >
            Ver Configurações
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Faturamento Hoje"
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalRevenue)}
          icon={DollarSign}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          trend={{ value: revenueTrend, isPositive: isRevenuePositive }}
        />
        
        <KPICard
          title="Vendas Hoje"
          value={totalSalesCount}
          icon={ShoppingBag}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          trend={{ value: salesTrend, isPositive: isSalesPositive }}
        />

        <KPICard
          title="Produtos Cadastrados"
          value={productCount}
          icon={Package}
          iconColor="text-ia"
          iconBg="bg-ia/10"
          progress={{ value: productPercent, maxLabel: `Limite: ${productCount}/${productLimit}` }}
        />

        <KPICard
          title="Clientes Cadastrados"
          value={clientCount}
          icon={Users}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          trend={{ value: "Estável", isPositive: true }}
        />
      </div>

      {/* Row 2: Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales History Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Vendas dos Últimos 7 Dias
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Evolução diária de receitas geradas no PDV
              </p>
            </div>
            
            <Badge variant="outline" className="text-[10px] font-bold">
              Semanal
            </Badge>
          </div>

          <div className="h-64 w-full flex-1">
            {!mounted ? (
              <Skeleton variant="card" className="h-full border-0 bg-transparent p-0" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Methods Donut Chart */}
        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Métodos de Pagamento
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Distribuição de meios preferidos
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center flex-1 relative">
            {!mounted ? (
              <Skeleton variant="circle" className="h-40 w-40" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#f8fafc",
                      }}
                      formatter={(value) => `${value}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend list custom styled below */}
                <div className="absolute bottom-1.5 inset-x-0 flex items-center justify-center gap-3.5 flex-wrap">
                  {paymentMethodsData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: IA Insights & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Col: Recent Sales Activity */}
        <div className="bg-card border border-border/60 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Atividades Recentes
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Últimas operações de vendas concluídas no PDV
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("Ver Todas Vendas")}
                className="text-xs text-primary hover:bg-primary/5 hover:text-primary/95 flex items-center gap-1"
              >
                <span>Ver Todas</span>
                <ArrowRight size={12} />
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs text-primary font-bold">
                      {sale.id}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {sale.client}
                    </TableCell>
                    <TableCell className="font-bold text-xs">
                      {sale.total}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sale.status === "concluida" ? "success" : "error"} showDot>
                        {sale.status === "concluida" ? "Concluída" : "Cancelada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[10px] text-muted-foreground font-medium">
                      {sale.date}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Col: IA Gerente Insights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-ia animate-pulse-glow" />
                <span>Insights da IA Gerente</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Análises inteligentes em tempo real sobre seu negócio
              </p>
            </div>
            
            <Badge variant="ai" className="text-[10px] font-bold">
              Recomendações
            </Badge>
          </div>

          {/* List of Insight Cards */}
          <div className="grid grid-cols-1 gap-3.5">
            {insights.map((ins, index) => {
              if (ins.type === "insight") {
                return (
                  <InsightCard
                    key={index}
                    title={ins.title}
                    message={ins.message}
                    priority={ins.priority || "media"}
                    actionLabel={ins.actionLabel || "Ver Detalhes"}
                    onAction={() => handleAction(ins.actionLabel || "Detalhes")}
                  />
                )
              } else {
                return (
                  <AIRecommendationCard
                    key={index}
                    type={ins.recommendationType || "estoque"}
                    title={ins.title}
                    description={ins.message}
                    onAccept={() => {
                      toast.success(`Sugestão de ${ins.title.toLowerCase()} aplicada com sucesso!`)
                    }}
                    onIgnore={() => {
                      toast.info("Sugestão arquivada.")
                    }}
                  />
                )
              }
            })}
          </div>
        </div>
      </div>

      {/* Row 4: Quick Action Shortcuts */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-md">
        <h3 className="text-sm font-bold text-foreground tracking-tight mb-4">
          Atalhos Rápidos de Operação
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Button
            variant="secondary"
            onClick={() => handleAction("Nova Venda (PDV)")}
            className="flex-col gap-2 p-4 h-auto text-xs font-bold bg-muted/40 hover:bg-muted"
          >
            <Monitor className="w-5 h-5 text-primary" />
            Nova Venda (PDV)
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleAction("Abrir Caixa")}
            className="flex-col gap-2 p-4 h-auto text-xs font-bold bg-muted/40 hover:bg-muted"
          >
            <Calculator className="w-5 h-5 text-emerald-500" />
            Abrir Caixa
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleAction("Novo Produto")}
            className="flex-col gap-2 p-4 h-auto text-xs font-bold bg-muted/40 hover:bg-muted"
          >
            <Package className="w-5 h-5 text-ia" />
            Novo Produto
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleAction("Gerenciar Estoque")}
            className="flex-col gap-2 p-4 h-auto text-xs font-bold bg-muted/40 hover:bg-muted"
          >
            <Warehouse className="w-5 h-5 text-amber-500" />
            Gerenciar Estoque
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleAction("Relatórios de Gestão")}
            className="flex-col gap-2 p-4 h-auto text-xs font-bold bg-muted/40 hover:bg-muted"
          >
            <BarChart3 className="w-5 h-5 text-sky-500" />
            Ver Relatórios
          </Button>

          <Button
            variant="ai"
            onClick={() => handleAction("Falar com a IA")}
            className="flex-col gap-2 p-4 h-auto text-xs font-bold hover:shadow-glow-purple"
          >
            <Brain className="w-5 h-5 animate-pulse-glow" />
            Falar com IA
          </Button>
        </div>
      </div>
    </div>
  );
};
