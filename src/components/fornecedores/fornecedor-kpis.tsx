import * as React from "react";
import { KPICard } from "@/components/dashboard/kpi-card";
import type { FornecedorKPIs } from "@/lib/types/fornecedores";
import { formatBRL } from "@/lib/types/compras";
import {
  Truck, CheckCircle, AlertTriangle, DollarSign,
  Award, Calendar, TrendingUp, ShieldAlert
} from "lucide-react";

interface FornecedorKPIsViewProps {
  kpis: FornecedorKPIs;
}

export function FornecedorKPIsView({ kpis }: FornecedorKPIsViewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <KPICard
        icon={Truck}
        title="Total de Fornecedores"
        value={String(kpis.total)}
        iconColor="text-primary"
        iconBg="bg-primary/10"
      />
      <KPICard
        icon={CheckCircle}
        title="Fornecedores Ativos"
        value={String(kpis.ativos)}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-500/10"
      />
      <KPICard
        icon={ShieldAlert}
        title="Fornecedores Inativos"
        value={String(kpis.inativos)}
        iconColor="text-slate-400"
        iconBg="bg-slate-400/10"
      />
      <KPICard
        icon={DollarSign}
        title="Total Comprado"
        value={formatBRL(kpis.totalComprado)}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-600/10"
      />
      <KPICard
        icon={Award}
        title="Fornecedor Líder"
        value={kpis.fornecedorLider || "Nenhum"}
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10"
      />
      <KPICard
        icon={Calendar}
        title="Última Compra"
        value={kpis.ultimaCompra ? new Date(kpis.ultimaCompra).toLocaleDateString("pt-BR") : "Nunca"}
        iconColor="text-blue-500"
        iconBg="bg-blue-500/10"
      />
      <KPICard
        icon={TrendingUp}
        title="Média por Fornecedor"
        value={formatBRL(kpis.ticketMedio)}
        iconColor="text-violet-500"
        iconBg="bg-violet-500/10"
      />
      <KPICard
        icon={AlertTriangle}
        title="Sem Compras Recentes"
        value={String(kpis.semComprasRecentes)}
        iconColor={kpis.semComprasRecentes > 0 ? "text-red-500" : "text-slate-400"}
        iconBg={kpis.semComprasRecentes > 0 ? "bg-red-500/10" : "bg-slate-400/10"}
      />
    </div>
  );
}
