"use client";

import * as React from "react";
import { Users, Gift, Coins, Award, Clock, Percent, TrendingUp, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/types/produtos";

interface FidelidadeKPIsProps {
  kpis: {
    participantes: number;
    pontosEmitidos: number;
    pontosResgatados: number;
    cashbackGerado: number;
    cashbackUtilizado: number;
    clientesVIP: number;
    clientesInativos: number;
    taxaRetencao: number;
  };
}

export const FidelidadeKPIs: React.FC<FidelidadeKPIsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
      {/* Participantes */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial-gradient from-primary/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Clientes Engajados</span>
            <p className="text-2xl font-black text-foreground mt-1">{kpis.participantes}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" /> Clientes com saldo ativo de fidelidade
        </p>
      </div>

      {/* Pontos Emitidos vs Resgatados */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-violet-500/20 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial-gradient from-violet-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Pontos Emitidos</span>
            <p className="text-2xl font-black text-foreground mt-1">{kpis.pontosEmitidos}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 font-semibold">
          <span className="text-violet-600 font-black">{kpis.pontosResgatados}</span> resgatados (Taxa: {kpis.pontosEmitidos > 0 ? ((kpis.pontosResgatados / kpis.pontosEmitidos) * 100).toFixed(1) : 0}%)
        </p>
      </div>

      {/* Cashback Gerado vs Utilizado */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/20 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial-gradient from-emerald-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Cashback Gerado</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatBRL(kpis.cashbackGerado)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 font-semibold">
          <span className="text-emerald-600 font-black">{formatBRL(kpis.cashbackUtilizado)}</span> utilizados no caixa
        </p>
      </div>

      {/* Clientes VIP & Taxa Retenção */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-pink-500/20 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial-gradient from-pink-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Taxa de Retenção</span>
            <p className="text-2xl font-black text-foreground mt-1">{kpis.taxaRetencao}%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 font-semibold">
          <span className="text-pink-600 font-black">{kpis.clientesVIP}</span> clientes VIP ativos (Prata, Ouro, Diamante, VIP)
        </p>
      </div>
    </div>
  );
};
