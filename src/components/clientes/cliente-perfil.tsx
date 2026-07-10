'use client';

import * as React from 'react';
import type { ClienteClassificado, CompraCliente } from '@/lib/types/clientes';
import {
  formatTelefone,
  formatCPF,
  formatBRL,
  getBgClassificacao,
  getLabelClassificacao,
} from '@/lib/types/clientes';
import { getComprasCliente } from '@/lib/actions/clientes';
import { getClienteFidelidadeInfo, getMovimentacoesFidelidade } from '@/lib/actions/fidelidade';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Tag,
  MessageCircle,
  FileText,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Gift,
  Coins,
  Award,
  History,
  Sparkles,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils/cn';
import { FiscalPrintLayout } from '../fiscal/fiscal-print-layout';
import { getFiscalConfig, getDocumentosFiscaisList, getDocumentoFichaCompleta, registrarHistoricoDocumento } from '@/lib/actions/fiscal';

interface ClientePerfilProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteClassificado | null;
  onEdit: (cliente: ClienteClassificado) => void;
}

export const ClientePerfil: React.FC<ClientePerfilProps> = ({
  isOpen,
  onClose,
  cliente,
  onEdit,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [compras, setCompras] = React.useState<CompraCliente[]>([]);
  const [expandedCompraId, setExpandedCompraId] = React.useState<string | null>(null);

  // --- Estados de Fidelidade ---
  const [loyaltyInfo, setLoyaltyInfo] = React.useState<any>(null);
  const [movimentacoes, setMovimentacoes] = React.useState<any[]>([]);
  const [loadingLoyalty, setLoadingLoyalty] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"compras" | "documentos">("compras");
  const [documentos, setDocumentos] = React.useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = React.useState(false);
  const [fiscalConfig, setFiscalConfig] = React.useState<any>(null);
  const [previewDoc, setPreviewDoc] = React.useState<any>(null);
  const [previewFormat, setPreviewFormat] = React.useState<"58mm" | "80mm" | "A4">("80mm");

  React.useEffect(() => {
    if (cliente && isOpen) {
      loadCompras();
      loadLoyaltyDetails();
      loadDocumentos();
      loadFiscalConfig();
    } else {
      setCompras([]);
      setExpandedCompraId(null);
      setLoyaltyInfo(null);
      setMovimentacoes([]);
      setDocumentos([]);
      setActiveTab("compras");
      setPreviewDoc(null);
    }
  }, [cliente, isOpen]);

  const loadDocumentos = async () => {
    if (!cliente) return;
    setLoadingDocs(true);
    try {
      const res = await getDocumentosFiscaisList({ cliente_id: cliente.id });
      if (res.data) {
        setDocumentos(res.data);
      }
    } catch (err) {
      toast.error('Erro ao carregar documentos comerciais');
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadFiscalConfig = async () => {
    try {
      const res = await getFiscalConfig();
      if (res.data) {
        setFiscalConfig(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadCompras = async () => {
    if (!cliente) return;
    setLoading(true);
    try {
      const data = await getComprasCliente(cliente.id);
      setCompras(data);
    } catch (err) {
      toast.error('Erro ao carregar histórico de compras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLoyaltyDetails = async () => {
    if (!cliente) return;
    setLoadingLoyalty(true);
    try {
      const [loyaltyRes, movRes] = await Promise.all([
        getClienteFidelidadeInfo(cliente.id),
        getMovimentacoesFidelidade(cliente.id)
      ]);

      if (loyaltyRes.data) {
        setLoyaltyInfo(loyaltyRes.data);
      }
      if (movRes.data) {
        setMovimentacoes(movRes.data);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes de fidelidade:", err);
    } finally {
      setLoadingLoyalty(false);
    }
  };

  const handleWhatsApp = (tel: string | null) => {
    if (!tel) return;
    const clean = tel.replace(/\D/g, '');
    window.open(`https://wa.me/55${clean}`, '_blank');
  };

  const toggleExpandCompra = (id: string) => {
    setExpandedCompraId(expandedCompraId === id ? null : id);
  };

  if (!cliente) return null;

  const formattedTel = formatTelefone(cliente.whatsapp || cliente.telefone);
  const formattedCPF = formatCPF(cliente.cpf);

  // Determinar cores e medalhas VIP
  const getVIPBadge = (level: string) => {
    switch (level) {
      case 'VIP':
        return { label: '👑 VIP Master', style: 'bg-rose-500/15 text-rose-500 border-rose-500/30' };
      case 'Diamante':
        return { label: '💎 VIP Diamante', style: 'bg-purple-500/15 text-purple-500 border-purple-500/30' };
      case 'Ouro':
        return { label: '🥇 VIP Ouro', style: 'bg-amber-500/15 text-amber-500 border-amber-500/30' };
      case 'Prata':
        return { label: '🥈 VIP Prata', style: 'bg-blue-500/15 text-blue-500 border-blue-500/30' };
      default:
        return { label: '🥉 VIP Bronze', style: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    }
  };

  const vipBadge = getVIPBadge(loyaltyInfo?.nivel_vip || "Bronze");

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil do Cliente"
      size="xl"
    >
      <div className="space-y-5 select-none">
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 font-bold text-xl text-primary">
              {cliente.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground">{cliente.nome}</h3>
                <Badge className={getBgClassificacao(cliente.classificacao)}>
                  {getLabelClassificacao(cliente.classificacao)}
                </Badge>
                {loyaltyInfo?.nivel_vip && (
                  <Badge className={vipBadge.style}>
                    {vipBadge.label}
                  </Badge>
                )}
                {cliente.isAniversariante && (
                  <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/30 animate-pulse">
                    🎂 Aniversariante Hoje
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cliente desde {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {(cliente.whatsapp || cliente.telefone) && (
              <Button
                variant="secondary"
                className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => handleWhatsApp(cliente.whatsapp || cliente.telefone)}
              >
                <MessageCircle size={14} className="mr-1.5" /> WhatsApp
              </Button>
            )}
            <Button onClick={() => onEdit(cliente)}>
              Editar Cadastro
            </Button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Contact Details */}
          <div className="md:col-span-1 space-y-4 border-b md:border-b-0 md:border-r border-border pb-5 md:pb-0 md:pr-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Informações de Contato
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <Phone size={14} className="text-muted-foreground" />
                <span>{formattedTel}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Mail size={14} className="text-muted-foreground" />
                <span className="truncate" title={cliente.email || 'Não informado'}>
                  {cliente.email || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <FileText size={14} className="text-muted-foreground" />
                <span>CPF: {formattedCPF}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Calendar size={14} className="text-muted-foreground" />
                <span>
                  Nascimento:{' '}
                  {cliente.aniversario
                    ? new Date(cliente.aniversario + 'T00:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : 'Não informado'}
                </span>
              </div>
              <div className="flex items-start gap-2 text-foreground">
                <MapPin size={14} className="text-muted-foreground mt-0.5" />
                <span className="leading-tight">
                  {cliente.endereco
                    ? `${cliente.endereco}, ${cliente.cidade || ''}-${cliente.estado || ''}`
                    : 'Endereço não cadastrado'}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Tags de Segmento
              </h4>
              <div className="flex flex-wrap gap-1">
                {cliente.tags && cliente.tags.length > 0 ? (
                  cliente.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px]">
                      <Tag size={10} className="mr-1" /> {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 italic">Nenhuma tag cadastrada</span>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Observações
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 p-2 rounded border border-border/50">
                {cliente.observacoes || 'Sem observações adicionadas.'}
              </p>
            </div>
          </div>

          {/* Client Metrics & Purchases */}
          <div className="md:col-span-2 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-muted/40 border border-border/60 rounded-xl p-2.5 flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <DollarSign size={10} /> Total Gasto
                </span>
                <span className="text-sm font-bold text-emerald-500 mt-0.5">
                  {formatBRL(cliente.total_gasto)}
                </span>
              </div>

              <div className="bg-muted/40 border border-border/60 rounded-xl p-2.5 flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <ShoppingCart size={10} /> Compras
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5">
                  {cliente.total_compras}
                </span>
              </div>

              <div className="bg-muted/40 border border-border/60 rounded-xl p-2.5 flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <TrendingUp size={10} /> Ticket Médio
                </span>
                <span className="text-sm font-bold text-primary mt-0.5">
                  {formatBRL(cliente.ticketMedio)}
                </span>
              </div>

              <div className="bg-muted/40 border border-border/60 rounded-xl p-2.5 flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock size={10} /> Inatividade
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5">
                  {cliente.diasDesdeUltimaCompra !== null
                    ? `${cliente.diasDesdeUltimaCompra} dias`
                    : '—'}
                </span>
              </div>
            </div>

            {/* SEÇÃO DE FIDELIDADE & CASHBACK (REAL - FASE 13) */}
            <div className="bg-gradient-to-r from-violet-600/5 to-indigo-600/5 border border-violet-600/15 rounded-2xl p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-violet-700 flex items-center gap-1.5">
                  <Gift size={14} className="text-violet-600" /> Programa de Fidelidade & Cashback
                </h4>
                {loyaltyInfo?.ranking > 0 && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-violet-600/10 text-violet-700 border border-violet-600/20 px-2.5 py-0.5 rounded-full">
                    🏆 Ranking: #{loyaltyInfo.ranking} da loja
                  </span>
                )}
              </div>

              {loadingLoyalty ? (
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Points Balance */}
                    <div className="bg-white border border-border/60 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Pontos Acumulados</p>
                        <p className="text-sm font-black text-foreground">{loyaltyInfo?.saldo_pontos || 0} pts</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Histórico: {loyaltyInfo?.total_pontos_acumulados || 0} pts</p>
                      </div>
                    </div>

                    {/* Cashback Balance */}
                    <div className="bg-white border border-border/60 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Saldo de Cashback</p>
                        <p className="text-sm font-black text-emerald-600">{formatBRL(loyaltyInfo?.saldo_cashback || 0)}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Histórico: {formatBRL(loyaltyInfo?.total_cashback_gerado || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* VIP Tier Info and validity */}
                  {loyaltyInfo?.nivel_vip && loyaltyInfo.nivel_vip !== "Bronze" && (
                    <div className="bg-white border border-border/60 rounded-xl p-3 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-600/10 text-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 text-[10px]">
                        <p className="font-bold text-slate-700">Validade da Faixa VIP {loyaltyInfo.nivel_vip}</p>
                        <p className="text-muted-foreground leading-normal">
                          Entrou em: <span className="font-bold text-slate-600">{loyaltyInfo.data_entrada_vip ? new Date(loyaltyInfo.data_entrada_vip).toLocaleDateString('pt-BR') : '—'}</span> | Expira em: <span className="font-bold text-slate-600">{loyaltyInfo.data_expiracao_vip ? new Date(loyaltyInfo.data_expiracao_vip).toLocaleDateString('pt-BR') : '—'}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Extrato Simplificado (Últimas 3 Movimentações) */}
                  {movimentacoes.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-3 mt-1 select-none">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <History size={12} /> Últimas Movimentações de Fidelidade
                      </p>
                      <div className="space-y-1.5">
                        {movimentacoes.slice(0, 3).map((mov) => (
                          <div key={mov.id} className="flex justify-between items-center bg-white/60 border border-slate-100 rounded-lg px-2.5 py-1 text-[10px] font-semibold">
                            <span className="text-slate-600 truncate max-w-[200px]">{mov.descricao}</span>
                            <div className="flex gap-2 text-right flex-shrink-0">
                              {mov.pontos !== 0 && (
                                <span className={mov.pontos > 0 ? "text-primary" : "text-destructive"}>
                                  {mov.pontos > 0 ? `+${mov.pontos}` : mov.pontos} pts
                                </span>
                              )}
                              {Number(mov.cashback) !== 0 && (
                                <span className={Number(mov.cashback) > 0 ? "text-emerald-600" : "text-destructive"}>
                                  {Number(mov.cashback) > 0 ? `+${formatBRL(mov.cashback)}` : formatBRL(mov.cashback)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SUB-TABS SELECTOR FOR HISTORY & DOCUMENTS */}
            <div className="border-b border-border/80 pb-1 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("compras")}
                  className={cn(
                    "pb-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer",
                    activeTab === "compras"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  🛒 Compras ({compras.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("documentos")}
                  className={cn(
                    "pb-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer",
                    activeTab === "documentos"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  📄 Documentos ({documentos.length})
                </button>
              </div>
              {cliente.ultima_compra && activeTab === "compras" && (
                <span className="text-[10px] text-muted-foreground font-semibold">
                  última em {new Date(cliente.ultima_compra).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            {/* TAB: PURCHASE HISTORY */}
            {activeTab === "compras" && (
              <div className="space-y-3">
                {loading ? (
                  <div className="space-y-2 py-4">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                ) : compras.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl">
                    <span className="text-2xl">📦</span>
                    <p className="text-sm font-semibold text-muted-foreground mt-1">
                      Nenhuma venda registrada para este cliente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {compras.map((compra) => {
                      const isExpanded = expandedCompraId === compra.id;
                      return (
                        <div
                          key={compra.id}
                          className="border border-border/80 rounded-lg overflow-hidden bg-card/50"
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => toggleExpandCompra(compra.id)}
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-xs font-semibold text-primary">
                                {compra.numero}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(compra.data).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-emerald-500 text-sm">
                                {formatBRL(compra.total)}
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-border bg-muted/10 p-3 text-xs space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-muted-foreground">
                                <div>
                                  <span className="font-medium">Forma Pgto:</span>{' '}
                                  <span className="text-foreground">{compra.forma_pagamento || '—'}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Atendente:</span>{' '}
                                  <span className="text-foreground">{compra.operador || '—'}</span>
                                </div>
                              </div>

                              {/* Itens */}
                              <div className="space-y-1.5 border-t border-border pt-2.5">
                                <p className="font-semibold text-muted-foreground">Produtos comprados:</p>
                                <div className="space-y-1">
                                  {compra.itens.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center text-foreground font-medium py-0.5"
                                    >
                                      <span>
                                        {item.quantidade}x {item.produto_nome}
                                      </span>
                                      <span>{formatBRL(item.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: FISCAL/COMMERCIAL DOCUMENTS */}
            {activeTab === "documentos" && (
              <div className="space-y-3">
                {loadingDocs ? (
                  <div className="space-y-2 py-4">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                ) : documentos.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-xl">
                    <span className="text-2xl">📄</span>
                    <p className="text-sm font-semibold text-muted-foreground mt-1">
                      Nenhum documento comercial emitido para este cliente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className="border border-border/80 rounded-xl p-3 flex items-center justify-between bg-card/50 hover:bg-muted/10 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary">
                              {doc.numero}
                            </span>
                            <Badge className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                              doc.tipo_documento === "recibo" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                              doc.tipo_documento === "pedido" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                              doc.tipo_documento === "orcamento" ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" :
                              "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            )}>
                              {doc.tipo_documento}
                            </Badge>
                            <Badge className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                              doc.status === "cancelado" ? "bg-red-500/10 text-red-600 border border-red-500/20" :
                              "bg-slate-100 text-slate-600 border border-slate-200"
                            )}>
                              {doc.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(doc.emitido_em).toLocaleString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-foreground text-xs">
                            {formatBRL(doc.valor_total)}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              const detailRes = await getDocumentoFichaCompleta(doc.id);
                              if (detailRes.data) {
                                setPreviewDoc(detailRes.data);
                                // Register reimpressao audit log
                                registrarHistoricoDocumento(doc.id, "reimpressao", "Documento aberto para visualização/reimpressão a partir do perfil do cliente.");
                              } else {
                                toast.error("Erro ao obter dados do documento.");
                              }
                            }}
                            className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                            title="Re-imprimir / Visualizar"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>

    {/* NESTED PREVIEW MODAL FOR FISCAL DOCUMENT */}
    {previewDoc && fiscalConfig && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-start py-6 px-4 print:p-0 print:bg-white select-none">
        <div className="w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl z-10 print:shadow-none print:border-none print:bg-white animate-fade-in">
          
          {/* Header with format selector */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Reimpressão
              </span>
              <h3 className="text-xs font-black tracking-wider text-slate-200">
                RE-IMPRESSÃO {previewDoc.numero}
              </h3>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
                {(["58mm", "80mm", "A4"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setPreviewFormat(fmt)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                      previewFormat === fmt ? "bg-white text-slate-900 shadow-sm" : "text-white hover:bg-white/5"
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Layout Visualizer */}
          <div className="bg-white max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">
            <FiscalPrintLayout
              documento={previewDoc}
              config={fiscalConfig}
              formato={previewFormat}
              onClose={() => setPreviewDoc(null)}
            />
          </div>
        </div>
      </div>
    )}
  </>
  );
};
