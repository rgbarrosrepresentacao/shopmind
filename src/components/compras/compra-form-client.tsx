"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { formatBRL, calcularImpactoMargem } from "@/lib/types/compras";
import type { CompraItemInput, Fornecedor } from "@/lib/types/compras";
import { listFornecedores, createFornecedorRapido } from "@/lib/actions/fornecedores";
import { concluirCompra, salvarRascunho, getProductCostHistory } from "@/lib/actions/compras";
import { listProducts } from "@/lib/actions/products";
import {
  ArrowLeft, Plus, Trash2, Search, Save, CheckCircle2,
  Package, Truck, AlertTriangle, ShieldAlert, Calculator,
  DollarSign, BarChart3, X, Loader2, ScanBarcode, History,
} from "lucide-react";
import Link from "next/link";

interface Produto {
  id: string; nome: string; sku: string | null; codigo_barras: string | null;
  preco_custo: number; preco_venda: number; estoque_atual: number;
  estoque_minimo: number; unidade: string | null;
}

export default function CompraFormClient() {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  // Fornecedor
  const [fornecedores, setFornecedores] = React.useState<Fornecedor[]>([]);
  const [fornecedorId, setFornecedorId] = React.useState("");
  const [showFornecedorForm, setShowFornecedorForm] = React.useState(false);
  const [novoFornecedor, setNovoFornecedor] = React.useState({ nome: "", cnpj: "", telefone: "", email: "", contato: "" });

  // Campos da compra
  const [numeroNf, setNumeroNf] = React.useState("");
  const [dataCompra, setDataCompra] = React.useState(new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = React.useState("");
  const [descontoGeral, setDescontoGeral] = React.useState(0);
  const [metodoPagamento, setMetodoPagamento] = React.useState("");
  const [dataVencimento, setDataVencimento] = React.useState("");

  // Itens
  const [itens, setItens] = React.useState<CompraItemInput[]>([]);

  // Cost History Lookup
  const [costHistory, setCostHistory] = React.useState<Record<string, any[]>>({});
  const [fetchingHistory, setFetchingHistory] = React.useState<Record<string, boolean>>({});

  const toggleCostHistory = async (prodId: string) => {
    if (costHistory[prodId]) {
      setCostHistory(prev => {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      });
      return;
    }
    setFetchingHistory(prev => ({ ...prev, [prodId]: true }));
    try {
      const res = await getProductCostHistory(prodId);
      if (res.data) {
        setCostHistory(prev => ({ ...prev, [prodId]: res.data }));
      }
    } catch {
      toast.error("Erro ao carregar histórico de custos.");
    } finally {
      setFetchingHistory(prev => ({ ...prev, [prodId]: false }));
    }
  };

  // Product search
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Produto[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { loadFornecedores(); }, []);

  const loadFornecedores = async () => {
    const res = await listFornecedores();
    setFornecedores(res.data || []);
  };

  const handleSearchProduct = React.useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim() || q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await listProducts({ search: q, page: 1, perPage: 10 });
      setSearchResults((res.data || []).map((p: any) => ({
        id: p.id, nome: p.nome, sku: p.sku, codigo_barras: p.codigo_barras,
        preco_custo: Number(p.preco_custo), preco_venda: Number(p.preco_venda),
        estoque_atual: Number(p.estoque_atual), estoque_minimo: Number(p.estoque_minimo),
        unidade: p.unidade,
      })));
    } catch { /* */ }
    finally { setSearchLoading(false); }
  }, []);

  const addItem = (prod: Produto) => {
    const existing = itens.findIndex(i => i.produto_id === prod.id);
    if (existing >= 0) {
      setItens(prev => prev.map((it, i) => i === existing
        ? { ...it, quantidade: it.quantidade + 1, total: (it.quantidade + 1) * it.preco_unitario }
        : it));
      toast.success(`Quantidade de "${prod.nome}" aumentada.`);
    } else {
      setItens(prev => [...prev, {
        produto_id: prod.id, nome_produto: prod.nome,
        quantidade: 1, preco_unitario: prod.preco_custo, total: prod.preco_custo,
        atualizar_custo: true, custo_atual: prod.preco_custo,
        preco_venda: prod.preco_venda, estoque_atual: prod.estoque_atual,
      }]);
    }
    setSearchQuery(""); setSearchResults([]); setSearchOpen(false);
    barcodeInputRef.current?.focus();
  };

  const updateItem = (index: number, updates: Partial<CompraItemInput>) => {
    setItens(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const updated = { ...it, ...updates };
      if ("quantidade" in updates || "preco_unitario" in updates) {
        updated.total = updated.quantidade * updated.preco_unitario;
      }
      return updated;
    }));
  };

  const removeItem = (index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = itens.reduce((a, i) => a + i.total, 0);
  const total = Math.max(0, subtotal - descontoGeral);

  const handleCriarFornecedor = async () => {
    if (!novoFornecedor.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    const res = await createFornecedorRapido(novoFornecedor);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Fornecedor criado!");
    setFornecedorId(res.data!.id);
    setShowFornecedorForm(false);
    setNovoFornecedor({ nome: "", cnpj: "", telefone: "", email: "", contato: "" });
    loadFornecedores();
  };

  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = (e.target as HTMLInputElement).value.trim();
    if (!q) return;
    setSearchLoading(true);
    try {
      const res = await listProducts({ search: q, page: 1, perPage: 1 });
      const results = (res.data || []).map((p: any) => ({
        id: p.id, nome: p.nome, sku: p.sku, codigo_barras: p.codigo_barras,
        preco_custo: Number(p.preco_custo), preco_venda: Number(p.preco_venda),
        estoque_atual: Number(p.estoque_atual), estoque_minimo: Number(p.estoque_minimo),
        unidade: p.unidade,
      }));
      if (results.length === 1) { addItem(results[0]); (e.target as HTMLInputElement).value = ""; }
      else { setSearchOpen(true); setSearchQuery(q); setSearchResults(results); }
    } catch { toast.error("Erro ao buscar produto."); }
    finally { setSearchLoading(false); }
  };

  const handleSalvarRascunho = async () => {
    if (!fornecedorId) { toast.error("Selecione um fornecedor."); return; }
    setSaving(true);
    try {
      const res = await salvarRascunho({
        fornecedor_id: fornecedorId, numero_nf: numeroNf, data_compra: dataCompra,
        observacao, subtotal, desconto: descontoGeral, total,
        metodo_pagamento: metodoPagamento || undefined, data_vencimento: dataVencimento || undefined,
        itens,
      });
      if (res.error) toast.error(res.error);
      else { toast.success("Rascunho salvo!"); router.push("/dashboard/compras"); }
    } finally { setSaving(false); }
  };

  const handleConcluir = async () => {
    if (!fornecedorId) { toast.error("Selecione um fornecedor."); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos 1 item."); return; }
    setSaving(true);
    try {
      const res = await concluirCompra({
        fornecedor_id: fornecedorId, numero_nf: numeroNf, data_compra: dataCompra,
        observacao, subtotal, desconto: descontoGeral, total,
        metodo_pagamento: metodoPagamento || undefined, data_vencimento: dataVencimento || undefined,
        itens,
      });
      if (res.error) toast.error(res.error);
      else { toast.success("Compra concluída! Estoque atualizado com sucesso."); router.push("/dashboard/compras"); }
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/compras" className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">Nova Compra</h2>
          <p className="text-[10px] text-muted-foreground">Registre entrada de mercadoria e atualize custos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column: Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode / Search Bar */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ScanBarcode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input ref={barcodeInputRef} type="text" placeholder="Escaneie o código de barras ou busque pelo nome..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onKeyDown={handleBarcodeScan} autoFocus />
              <button onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Search Overlay */}
            {searchOpen && (
              <div className="mt-3 border-t border-border pt-3">
                <input ref={searchInputRef} type="text" value={searchQuery}
                  onChange={e => handleSearchProduct(e.target.value)}
                  placeholder="Buscar por nome, SKU ou código..." autoFocus
                  className="w-full text-sm bg-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30" />

                {searchLoading && <p className="text-xs text-muted-foreground py-3 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Buscando...</p>}

                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                    {searchResults.map(p => (
                      <button key={p.id} onClick={() => addItem(p)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-between cursor-pointer group">
                        <div>
                          <p className="text-xs font-bold text-foreground">{p.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{p.sku || ""} | Estoque: {p.estoque_atual} | Custo: {formatBRL(p.preco_custo)}</p>
                        </div>
                        <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                  <p className="text-xs text-center text-muted-foreground py-4">Nenhum produto encontrado.</p>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Itens da Compra ({itens.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 text-muted-foreground">
                    <th className="text-left px-4 py-3 font-bold">Produto</th>
                    <th className="text-right px-3 py-3 font-bold w-20">Qtd</th>
                    <th className="text-right px-3 py-3 font-bold w-28">Custo Unit.</th>
                    <th className="text-right px-3 py-3 font-bold w-28">Total</th>
                    <th className="text-center px-3 py-3 font-bold w-20">Custo</th>
                    <th className="text-center px-3 py-3 font-bold w-20">Margem</th>
                    <th className="text-center px-3 py-3 font-bold w-12">⚙️</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <ScanBarcode className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="font-bold">Escaneie ou busque produtos para adicionar</p>
                    </td></tr>
                  ) : itens.map((item, idx) => {
                    const impacto = item.custo_atual !== undefined && item.preco_venda !== undefined
                      ? calcularImpactoMargem(item.custo_atual, item.preco_unitario, item.preco_venda) : null;
                    const margemBaixa = impacto && impacto.novaMargem < 20;
                    const margemCritica = impacto && impacto.novaMargem < 10;

                    return (
                      <tr key={item.produto_id + idx} className={cn("border-b border-border/50 transition-colors", { "bg-red-50/50": margemCritica, "bg-amber-50/30": margemBaixa && !margemCritica })}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-xs">{item.nome_produto}</span>
                            <button type="button" onClick={() => toggleCostHistory(item.produto_id)}
                              className="p-0.5 text-muted-foreground hover:text-primary rounded hover:bg-slate-100 transition-all cursor-pointer"
                              title="Histórico de Custos">
                              {fetchingHistory[item.produto_id] ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <History className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {impacto && item.custo_atual !== item.preco_unitario && (
                            <p className={cn("text-[10px] mt-0.5 font-bold", impacto.diferencaCusto > 0 ? "text-red-500" : "text-emerald-500")}>
                              {impacto.diferencaCusto > 0 ? "↑" : "↓"} {Math.abs(impacto.diferencaPercentual).toFixed(1)}% vs custo atual
                            </p>
                          )}
                          {costHistory[item.produto_id] && (
                            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2 text-[9px] space-y-1 text-muted-foreground max-w-xs shadow-inner">
                              <p className="font-bold text-foreground text-[10px] mb-1 flex items-center gap-1"><History className="w-3 h-3 text-primary" /> Histórico de Preço de Custo:</p>
                              {costHistory[item.produto_id].length === 0 ? (
                                <p className="italic">Nenhum registro anterior encontrado.</p>
                              ) : costHistory[item.produto_id].map((h, hIdx) => (
                                <div key={hIdx} className="flex justify-between gap-3 border-b border-slate-200/40 pb-1 last:border-0 last:pb-0">
                                  <span>{new Date(h.data_compra).toLocaleDateString("pt-BR")} - {h.fornecedor_nome}</span>
                                  <span className="font-bold text-slate-700">{formatBRL(h.preco_unitario)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" min={1} step={1} value={item.quantidade}
                            onChange={e => updateItem(idx, { quantidade: Number(e.target.value) || 1 })}
                            className="w-full text-right bg-slate-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/30" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" min={0} step={0.01} value={item.preco_unitario}
                            onChange={e => updateItem(idx, { preco_unitario: Number(e.target.value) || 0 })}
                            className="w-full text-right bg-slate-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/30" />
                        </td>
                        <td className="px-3 py-3 text-right font-black text-foreground">{formatBRL(item.total)}</td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => updateItem(idx, { atualizar_custo: !item.atualizar_custo })}
                            className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all text-[9px]", {
                              "bg-primary border-primary text-white": item.atualizar_custo,
                              "border-slate-300 hover:border-primary": !item.atualizar_custo,
                            })}>{item.atualizar_custo ? "✓" : ""}</button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {impacto ? (
                            <span className={cn("text-[10px] font-black", {
                              "text-red-500": margemCritica,
                              "text-amber-500": margemBaixa && !margemCritica,
                              "text-emerald-500": !margemBaixa,
                            })}>{impacto.novaMargem.toFixed(0)}%</span>
                          ) : "-"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => removeItem(idx)} className="p-1 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {itens.length > 0 && (
              <div className="p-4 border-t border-border bg-slate-50/50">
                <div className="max-w-xs ml-auto space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal:</span><span className="font-bold">{formatBRL(subtotal)}</span></div>
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground">Desconto Geral:</span>
                    <input type="number" min={0} step={0.01} value={descontoGeral}
                      onChange={e => setDescontoGeral(Number(e.target.value) || 0)}
                      className="w-24 text-right bg-white border border-border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm">
                    <span className="font-bold text-foreground">Total Líquido:</span>
                    <span className="font-black text-primary text-base">{formatBRL(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Margin Alerts */}
            {itens.some(i => {
              const imp = i.custo_atual !== undefined && i.preco_venda !== undefined
                ? calcularImpactoMargem(i.custo_atual, i.preco_unitario, i.preco_venda) : null;
              return imp && imp.novaMargem < 20;
            }) && (
              <div className="p-3 mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-700">Alerta de Margem</p>
                  <p className="text-[10px] text-amber-600">Alguns itens terão margem inferior a 20%. Verifique os preços de venda após a compra.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Purchase Info */}
        <div className="space-y-4">
          {/* Fornecedor */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-foreground flex items-center gap-2"><Truck className="w-4 h-4" /> Fornecedor</h3>
            <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
              className="w-full bg-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
              <option value="">Selecione...</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <button onClick={() => setShowFornecedorForm(!showFornecedorForm)}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3" /> Cadastrar Fornecedor</button>

            {showFornecedorForm && (
              <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-border">
                <input type="text" placeholder="Nome *" value={novoFornecedor.nome} onChange={e => setNovoFornecedor(p => ({ ...p, nome: e.target.value }))} className="w-full bg-white rounded-lg px-3 py-2 text-xs outline-none border border-border focus:ring-2 focus:ring-primary/30" />
                <input type="text" placeholder="CNPJ" value={novoFornecedor.cnpj} onChange={e => setNovoFornecedor(p => ({ ...p, cnpj: e.target.value }))} className="w-full bg-white rounded-lg px-3 py-2 text-xs outline-none border border-border focus:ring-2 focus:ring-primary/30" />
                <input type="text" placeholder="Telefone" value={novoFornecedor.telefone} onChange={e => setNovoFornecedor(p => ({ ...p, telefone: e.target.value }))} className="w-full bg-white rounded-lg px-3 py-2 text-xs outline-none border border-border focus:ring-2 focus:ring-primary/30" />
                <input type="text" placeholder="Email" value={novoFornecedor.email} onChange={e => setNovoFornecedor(p => ({ ...p, email: e.target.value }))} className="w-full bg-white rounded-lg px-3 py-2 text-xs outline-none border border-border focus:ring-2 focus:ring-primary/30" />
                <input type="text" placeholder="Contato" value={novoFornecedor.contato} onChange={e => setNovoFornecedor(p => ({ ...p, contato: e.target.value }))} className="w-full bg-white rounded-lg px-3 py-2 text-xs outline-none border border-border focus:ring-2 focus:ring-primary/30" />
                <Button onClick={handleCriarFornecedor} size="sm" className="w-full text-[10px]"><Plus className="w-3 h-3 mr-1" /> Criar Fornecedor</Button>
              </div>
            )}
          </div>

          {/* Purchase Details */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-foreground flex items-center gap-2"><Calculator className="w-4 h-4" /> Dados da Compra</h3>
            <div className="space-y-2">
              <div><label className="text-[10px] font-bold text-muted-foreground block mb-1">Nº da NF / Recibo</label><input type="text" value={numeroNf} onChange={e => setNumeroNf(e.target.value)} placeholder="Ex: NF-12345" className="w-full bg-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30" /></div>
              <div><label className="text-[10px] font-bold text-muted-foreground block mb-1">Data da Compra</label><input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} className="w-full bg-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30" /></div>
              <div><label className="text-[10px] font-bold text-muted-foreground block mb-1">Forma de Pagamento</label>
                <select value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)} className="w-full bg-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                  <option value="">Selecione...</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao">Cartão</option>
                  <option value="cheque">Cheque</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div><label className="text-[10px] font-bold text-muted-foreground block mb-1">Vencimento</label><input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className="w-full bg-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30" /></div>
              <div><label className="text-[10px] font-bold text-muted-foreground block mb-1">Observação</label><textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional..." className="w-full bg-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 resize-none" /></div>
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 shadow-lg text-white space-y-4">
            <h3 className="text-xs font-black flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Resumo da Compra</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-white/60">Itens:</span><span className="font-bold">{itens.length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-white/60">Subtotal:</span><span className="font-bold">{formatBRL(subtotal)}</span></div>
              {descontoGeral > 0 && <div className="flex justify-between text-xs"><span className="text-white/60">Desconto:</span><span className="font-bold text-emerald-400">-{formatBRL(descontoGeral)}</span></div>}
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-sm font-bold">Total:</span>
                <span className="text-lg font-black text-emerald-400">{formatBRL(total)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button onClick={handleConcluir} disabled={saving || itens.length === 0 || !fornecedorId}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg text-xs font-bold py-2.5">
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                Concluir Compra
              </Button>
              <Button onClick={handleSalvarRascunho} disabled={saving || !fornecedorId} variant="ghost"
                className="w-full border-white/20 text-white hover:bg-white/10 text-xs font-bold py-2.5">
                <Save className="w-3 h-3 mr-1" /> Salvar Rascunho
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
