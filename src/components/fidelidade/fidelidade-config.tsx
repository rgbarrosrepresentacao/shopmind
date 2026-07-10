"use client";

import * as React from "react";
import { Settings, Save, AlertCircle, Sparkles, HelpCircle, ShieldAlert } from "lucide-react";
import { salvarFidelidadeConfig } from "@/lib/actions/fidelidade";
import { toast } from "@/components/ui/toast";

interface FidelidadeConfigProps {
  initialConfig: {
    fidelidade_ativo: boolean;
    fidelidade_pontos_conversao: number;
    fidelidade_cashback_percentual: number;
    fidelidade_dias_expiracao: number | null;
    fidelidade_vip_bronze_min_gasto: number;
    fidelidade_vip_prata_min_gasto: number;
    fidelidade_vip_ouro_min_gasto: number;
    fidelidade_vip_diamante_min_gasto: number;
    fidelidade_vip_vip_min_gasto: number;
  } | null;
  userTipo: string;
  onRefresh: () => void;
}

export const FidelidadeConfig: React.FC<FidelidadeConfigProps> = ({
  initialConfig,
  userTipo,
  onRefresh,
}) => {
  const [loading, setLoading] = React.useState(false);
  
  // Settings Form State
  const [ativo, setAtivo] = React.useState(false);
  const [conversao, setConversao] = React.useState(1);
  const [cashback, setCashback] = React.useState(0);
  const [expiracao, setExpiracao] = React.useState<string>("null"); // "null", "30", "60", "90", "180", "365"
  
  // VIP levels State
  const [bronze, setBronze] = React.useState(0);
  const [prata, setPrata] = React.useState(1500);
  const [ouro, setOuro] = React.useState(3000);
  const [diamante, setDiamante] = React.useState(6000);
  const [vip, setVip] = React.useState(10000);

  const isReadOnly = userTipo === "estoquista";

  // Sync initial config
  React.useEffect(() => {
    if (initialConfig) {
      setAtivo(initialConfig.fidelidade_ativo);
      setConversao(Number(initialConfig.fidelidade_pontos_conversao || 1));
      setCashback(Number(initialConfig.fidelidade_cashback_percentual || 0));
      setExpiracao(initialConfig.fidelidade_dias_expiracao === null ? "null" : String(initialConfig.fidelidade_dias_expiracao));
      
      setBronze(Number(initialConfig.fidelidade_vip_bronze_min_gasto || 0));
      setPrata(Number(initialConfig.fidelidade_vip_prata_min_gasto || 1500));
      setOuro(Number(initialConfig.fidelidade_vip_ouro_min_gasto || 3000));
      setDiamante(Number(initialConfig.fidelidade_vip_diamante_min_gasto || 6000));
      setVip(Number(initialConfig.fidelidade_vip_vip_min_gasto || 10000));
    }
  }, [initialConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (conversao <= 0) {
      toast.error("O valor de conversão de pontos deve ser maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fidelidade_ativo: ativo,
        fidelidade_pontos_conversao: conversao,
        fidelidade_cashback_percentual: cashback,
        fidelidade_dias_expiracao: expiracao === "null" ? null : parseInt(expiracao),
        fidelidade_vip_bronze_min_gasto: bronze,
        fidelidade_vip_prata_min_gasto: prata,
        fidelidade_vip_ouro_min_gasto: ouro,
        fidelidade_vip_diamante_min_gasto: diamante,
        fidelidade_vip_vip_min_gasto: vip,
      };

      const res = await salvarFidelidadeConfig(payload);
      if (res.success) {
        toast.success("Configurações de fidelidade salvas!");
        onRefresh();
      } else {
        toast.error(`Erro ao salvar: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Falha: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5 select-none text-left">
      
      {/* Read Only Banner */}
      {isReadOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold p-4 rounded-2xl flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>Modo de Leitura: Você tem permissão para visualizar, mas apenas Donos ou Gerentes podem alterar as configurações do programa de fidelidade.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Card: Main rules */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
              <Settings className="w-4 h-4 text-muted-foreground" /> Regras Gerais de Acúmulo
            </h4>

            {/* Toggle Ativo */}
            <div className="flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl p-4">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-foreground block">Programa de Fidelidade Ativo</span>
                <span className="text-[10px] text-muted-foreground font-semibold">Ative para permitir o acúmulo de pontos e cashback no PDV.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pontos Conversão */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  Conversão de Pontos
                  <span title="Exemplo: Se colocar R$ 1,00, a cada R$ 1 o cliente ganha 1 ponto. Se colocar R$ 10,00, a cada R$ 10 ele ganha 1 ponto.">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    disabled={isReadOnly || !ativo}
                    value={conversao}
                    onChange={(e) => setConversao(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500"> = 1 Ponto</span>
                </div>
              </div>

              {/* Cashback Padrão */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  Taxa de Cashback Padrão
                  <span title="Percentual da venda que retorna como crédito de cashback para o cliente usar em compras futuras.">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    disabled={isReadOnly || !ativo}
                    value={cashback}
                    onChange={(e) => setCashback(parseFloat(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2.5 bg-slate-50 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:bg-white focus:border-primary disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              {/* Expiração */}
              <div className="space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  Validade de Pontos e Cashback
                  <span title="Tempo em dias antes que os pontos/cashback acumulados de uma compra expirem automaticamente.">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </span>
                <select
                  disabled={isReadOnly || !ativo}
                  value={expiracao}
                  onChange={(e) => setExpiracao(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-border rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-primary cursor-pointer disabled:opacity-50"
                >
                  <option value="null">Nunca expiram (Recomendado)</option>
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                  <option value="180">180 dias</option>
                  <option value="365">365 dias (1 ano)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: VIP Tier limits */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
              <Sparkles className="w-4 h-4 text-violet-600" /> Regras de Faixas VIP (Ano Móvel)
            </h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed font-semibold">
              Defina o valor mínimo em compras acumuladas nos **últimos 365 dias** para que o cliente atinja cada faixa de fidelidade:
            </p>

            <div className="space-y-3">
              {/* Bronze */}
              <div className="flex items-center justify-between gap-3 bg-slate-50/60 p-2.5 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-600 w-24">🥉 Bronze</span>
                <div className="relative flex-1 max-w-[120px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    disabled
                    value={bronze}
                    className="w-full pl-7 pr-2 py-1 bg-slate-100 border border-border rounded-lg text-xs font-bold text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Prata */}
              <div className="flex items-center justify-between gap-3 bg-slate-50/60 p-2.5 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-600 w-24">🥈 Prata</span>
                <div className="relative flex-1 max-w-[120px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    min="0"
                    disabled={isReadOnly || !ativo}
                    value={prata}
                    onChange={(e) => setPrata(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-2 py-1 bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Ouro */}
              <div className="flex items-center justify-between gap-3 bg-slate-50/60 p-2.5 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-600 w-24">🥇 Ouro</span>
                <div className="relative flex-1 max-w-[120px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    min="0"
                    disabled={isReadOnly || !ativo}
                    value={ouro}
                    onChange={(e) => setOuro(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-2 py-1 bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Diamante */}
              <div className="flex items-center justify-between gap-3 bg-slate-50/60 p-2.5 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-600 w-24">💎 Diamante</span>
                <div className="relative flex-1 max-w-[120px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    min="0"
                    disabled={isReadOnly || !ativo}
                    value={diamante}
                    onChange={(e) => setDiamante(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-2 py-1 bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>

              {/* VIP */}
              <div className="flex items-center justify-between gap-3 bg-slate-50/60 p-2.5 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-600 w-24">👑 VIP Master</span>
                <div className="relative flex-1 max-w-[120px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    min="0"
                    disabled={isReadOnly || !ativo}
                    value={vip}
                    onChange={(e) => setVip(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-2 py-1 bg-white border border-border rounded-lg text-xs font-bold text-foreground outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Action footer */}
      {!isReadOnly && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-lg shadow-primary/15 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      )}

    </form>
  );
};
