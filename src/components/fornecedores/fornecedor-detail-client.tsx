"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { FornecedorPerfil } from "@/lib/types/fornecedores";
import { getFornecedorPerfilCompleto } from "@/lib/actions/fornecedores";
import { FornecedorDialog } from "./fornecedor-dialogs";
import { formatBRL, getStatusColor, getStatusLabel } from "@/lib/types/compras";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import {
  ArrowLeft, Edit2, Phone, Mail, FileText, ShoppingBag,
  Calendar, DollarSign, TrendingUp, Sparkles, Award,
  Clock, Package, Shield, User, History
} from "lucide-react";

interface FornecedorDetailClientProps {
  fornecedorId: string;
  userTipo?: string;
}

export default function FornecedorDetailClient({
  fornecedorId,
  userTipo = "caixa",
}: FornecedorDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [perfil, setPerfil] = React.useState<FornecedorPerfil | null>(null);
  const [activeTab, setActiveTab] = React.useState<"visao-geral" | "compras" | "produtos">("visao-geral");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    loadPerfil();
  }, [fornecedorId]);

  const loadPerfil = async () => {
    setLoading(true);
    try {
      const res = await getFornecedorPerfilCompleto(fornecedorId);
      if (res.error) {
        toast.error(res.error);
        router.push("/dashboard/fornecedores");
      } else {
        setPerfil(res.data);
      }
    } catch {
      toast.error("Erro ao carregar perfil do fornecedor.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3" />
        <div className="h-40 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!perfil) return null;
  const { fornecedor } = perfil;

  // Determinar cores do score
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (score >= 45) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/dashboard/fornecedores"
            className="p-2 bg-white border border-border hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2 flex-wrap">
              {fornecedor.nome}
              <span className={cn("text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border ml-2", getScoreColor(perfil.score))}>
                Score: {perfil.score} pts
              </span>
              <span className="text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                Rank: {perfil.ranking}º Lugar
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Cadastrado em {new Date(fornecedor.created_at).toLocaleDateString("pt-BR")} | Status: {fornecedor.status === "ativo" ? "Ativo" : "Inativo"}
            </p>
          </div>
        </div>

        {/* Edit Button (Only if not caixa) */}
        {userTipo !== "caixa" && (
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="shadow-lg shadow-primary/20 font-bold rounded-xl px-5 py-2.5 text-xs w-full sm:w-auto"
          >
            <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar Cadastro
          </Button>
        )}
      </div>

      {/* Rapid Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Comprado */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider">Total Comprado</span>
            <span className="text-sm font-black text-foreground">{formatBRL(perfil.valor_total_comprado)}</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider">Ticket Médio</span>
            <span className="text-sm font-black text-foreground">{formatBRL(perfil.ticket_medio)}</span>
          </div>
        </div>

        {/* Qtd Compras */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider">Qtd Compras</span>
            <span className="text-sm font-black text-foreground">{perfil.qtd_compras} concluídas</span>
          </div>
        </div>

        {/* Recência */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider">Recência</span>
            <span className="text-sm font-black text-foreground">
              {perfil.recencia !== null 
                ? perfil.recencia === 0 ? "Hoje" : `${perfil.recencia} dias atrás`
                : "Sem compras"}
            </span>
          </div>
        </div>

      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 rounded-2xl p-1.5 w-fit border border-slate-200/40 shadow-inner">
        {[
          { id: "visao-geral", label: "📄 Visão Geral", icon: FileText },
          { id: "compras", label: `🛒 Compras (${perfil.compras.length})`, icon: ShoppingBag },
          { id: "produtos", label: `📦 Produtos Fornecidos (${perfil.produtos.length})`, icon: Package },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer",
                {
                  "bg-white text-foreground shadow-md border border-slate-200/30": activeTab === tab.id,
                  "text-muted-foreground hover:text-foreground hover:bg-white/40": activeTab !== tab.id,
                }
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        
        {/* Tab 1: Visão Geral */}
        {activeTab === "visao-geral" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Dados Cadastrais */}
            <div className="md:col-span-2 bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Informações Cadastrais</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Detalhes fiscais e de contato direto.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">Razão Social</span>
                  <span className="font-bold text-foreground block mt-0.5">{fornecedor.nome}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">CNPJ / Cadastro Fiscal</span>
                  <span className="font-semibold text-foreground block mt-0.5 font-mono">{fornecedor.cnpj || "Não cadastrado"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">Pessoa de Contato</span>
                  <span className="font-bold text-foreground block mt-0.5">{fornecedor.contato || "Não cadastrado"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">Email de Vendas</span>
                  <span className="font-semibold text-foreground block mt-0.5">
                    {fornecedor.email ? (
                      <a href={`mailto:${fornecedor.email}`} className="text-primary hover:underline">{fornecedor.email}</a>
                    ) : "Não cadastrado"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">Telefone</span>
                  <span className="font-semibold text-foreground block mt-0.5">{fornecedor.telefone || "Não cadastrado"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground block">WhatsApp</span>
                  <span className="font-bold text-primary block mt-0.5">
                    {fornecedor.whatsapp ? (
                      <a href={`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" /> {fornecedor.whatsapp}
                      </a>
                    ) : "Não cadastrado"}
                  </span>
                </div>
                
                {/* Observações */}
                <div className="sm:col-span-2 border-t border-border/50 pt-4">
                  <span className="text-[10px] font-bold text-muted-foreground block flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-500" /> Notas Comerciais e Observações</span>
                  <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-700 font-medium leading-relaxed italic">
                    {fornecedor.observacao ? `"${fornecedor.observacao}"` : "Nenhuma nota registrada."}
                  </div>
                </div>
              </div>
            </div>

            {/* Auditoria Timeline */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
              <div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Histórico de Auditoria</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Rastreabilidade de alterações cadastrais.</p>
              </div>

              {/* Timeline Container */}
              <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-4">
                {perfil.logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8 italic">Nenhum log registrado para este parceiro.</p>
                ) : (
                  perfil.logs.map((log, idx) => (
                    <div key={log.id} className="flex gap-2.5 items-start">
                      {/* Timeline dot */}
                      <div className="relative flex flex-col items-center">
                        <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-white z-10", {
                          "bg-emerald-500": log.acao === "criacao" || log.acao === "reativacao",
                          "bg-red-500": log.acao === "desativacao",
                          "bg-primary": log.acao === "edicao",
                        })}>
                          <Clock className="w-2 h-2" />
                        </div>
                        {idx < perfil.logs.length - 1 && (
                          <div className="w-0.5 bg-slate-200 absolute top-3.5 bottom-[-16px]" />
                        )}
                      </div>
                      
                      {/* Log details */}
                      <div className="space-y-0.5 text-[9px]">
                        <span className="font-bold text-foreground block">
                          {log.acao === "criacao" ? "Fornecedor Cadastrado" :
                           log.acao === "edicao" ? "Cadastro Atualizado" :
                           log.acao === "desativacao" ? "Fornecedor Desativado" :
                           log.acao === "reativacao" ? "Fornecedor Reativado" : log.acao}
                        </span>
                        <span className="text-[8px] text-muted-foreground flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> {log.usuario_nome} | {new Date(log.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Histórico de Compras */}
        {activeTab === "compras" && (
          <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/20">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Histórico de Compras Concluídas</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Notas fiscais e pedidos de compra finalizados.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
                    <th className="text-left px-4 py-3 font-bold">Número</th>
                    <th className="text-left px-4 py-3 font-bold">NF / Recibo</th>
                    <th className="text-left px-4 py-3 font-bold">Data</th>
                    <th className="text-right px-4 py-3 font-bold">Qtd Itens</th>
                    <th className="text-right px-4 py-3 font-bold">Total Pago</th>
                    <th className="text-center px-4 py-3 font-bold">Status</th>
                    <th className="text-left px-4 py-3 font-bold">Comprador</th>
                    <th className="text-center px-4 py-3 font-bold w-20">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {perfil.compras.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
                        <p className="font-bold">Nenhuma compra concluída para este fornecedor.</p>
                      </td>
                    </tr>
                  ) : (
                    perfil.compras.map(c => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-foreground">Compra #{c.numero}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">{c.numero_nf || "S/N"}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{new Date(c.data_compra).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-600">{c.itens_count}</td>
                        <td className="px-4 py-3.5 text-right font-black text-foreground">{formatBRL(c.total)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded-full border", getStatusColor(c.status as any))}>
                            {getStatusLabel(c.status as any)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{c.usuario_nome}</td>
                        <td className="px-4 py-3.5 text-center">
                          <Link
                            href={`/dashboard/compras/${c.id}`}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg inline-flex transition-colors"
                            title="Ver detalhes da compra"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Produtos Fornecidos */}
        {activeTab === "produtos" && (
          <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/20">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Produtos Adquiridos do Fornecedor</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Indicadores de custo unitário e estoque atual.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
                    <th className="text-left px-4 py-3 font-bold">Produto</th>
                    <th className="text-right px-4 py-3 font-bold w-20">Estoque</th>
                    <th className="text-right px-4 py-3 font-bold w-24">Venda Unit.</th>
                    <th className="text-right px-4 py-3 font-bold w-28">Último Custo</th>
                    <th className="text-right px-4 py-3 font-bold w-28">Menor Custo</th>
                    <th className="text-right px-4 py-3 font-bold w-28">Maior Custo</th>
                    <th className="text-right px-4 py-3 font-bold w-28">Custo Médio</th>
                    <th className="text-left px-4 py-3 font-bold w-24">Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {perfil.produtos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Package className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
                        <p className="font-bold">Nenhum produto cadastrado para este fornecedor.</p>
                      </td>
                    </tr>
                  ) : (
                    perfil.produtos.map(p => (
                      <tr key={p.produto_id} className="border-b border-border/50 hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-foreground">{p.nome}</p>
                          {p.sku && <p className="text-[9px] text-muted-foreground font-mono mt-0.5">SKU: {p.sku}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-700">{p.estoque_atual}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-600">{formatBRL(p.preco_venda)}</td>
                        <td className="px-4 py-3.5 text-right font-black text-foreground">{formatBRL(p.ultimo_custo)}</td>
                        <td className="px-4 py-3.5 text-right text-emerald-600 font-semibold">{formatBRL(p.min_custo)}</td>
                        <td className="px-4 py-3.5 text-right text-red-500 font-semibold">{formatBRL(p.max_custo)}</td>
                        <td className="px-4 py-3.5 text-right text-violet-600 font-bold">{formatBRL(p.avg_custo)}</td>
                        <td className="px-4 py-3.5 text-muted-foreground font-medium">
                          {new Date(p.ultima_compra).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Edit Dialog */}
      <FornecedorDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={loadPerfil}
        fornecedor={fornecedor as any}
        userTipo={userTipo}
      />

    </div>
  );
}
