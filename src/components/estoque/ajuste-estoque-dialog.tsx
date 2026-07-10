'use client';

import * as React from 'react';
import { ajustarEstoque } from '@/lib/actions/estoque';
import { listProducts } from '@/lib/actions/products';
import type { AjusteEstoqueInput } from '@/lib/types/estoque';
import { Plus, Minus, RotateCcw, X, AlertCircle, Search, Package } from 'lucide-react';

interface AjusteEstoqueDialogProps {
  produto: {
    id: string;
    nome: string;
    sku: string | null;
    estoque_atual: number;
    estoque_minimo: number;
    unidade: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MOTIVOS_PREDEFINIDOS = [
  'Recontagem de inventário',
  'Produto danificado',
  'Produto vencido',
  'Erro de cadastro',
  'Recebimento de mercadoria',
  'Devolução de cliente',
  'Perda por furto',
  'Ajuste de sistema',
  'Outro',
];

export function AjusteEstoqueDialog({ produto, isOpen, onClose, onSuccess }: AjusteEstoqueDialogProps) {
  const [selectedProduto, setSelectedProduto] = React.useState<any | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const [tipo, setTipo] = React.useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantidade, setQuantidade] = React.useState('');
  const [motivo, setMotivo] = React.useState('');
  const [motivoCustom, setMotivoCustom] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Load product if passed or perform initial search
  React.useEffect(() => {
    if (isOpen) {
      setTipo('entrada');
      setQuantidade('');
      setMotivo('');
      setMotivoCustom('');
      setError('');
      setSearchQuery('');
      setSearchResults([]);

      if (produto) {
        setSelectedProduto(produto);
      } else {
        setSelectedProduto(null);
        fetchProducts('');
      }
    }
  }, [isOpen, produto]);

  // Debounced search effect
  React.useEffect(() => {
    if (!isOpen || produto) return;
    const delayDebounce = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen, produto]);

  const fetchProducts = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await listProducts({ search: query, status: 'ativo', perPage: 10 });
      if (!res.error) {
        setSearchResults(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  const qty = parseFloat(quantidade) || 0;
  const motivoFinal = motivo === 'Outro' ? motivoCustom : motivo;

  const novoEstoque = () => {
    if (!selectedProduto) return 0;
    if (tipo === 'entrada') return selectedProduto.estoque_atual + qty;
    if (tipo === 'saida') return Math.max(0, selectedProduto.estoque_atual - qty);
    return qty; // ajuste
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduto) return setError('Selecione um produto.');
    if (!qty || qty <= 0) return setError('Informe uma quantidade válida.');
    if (!motivoFinal.trim()) return setError('Informe o motivo do ajuste.');

    setIsLoading(true);
    try {
      const input: AjusteEstoqueInput = {
        produto_id: selectedProduto.id,
        tipo,
        quantidade: qty,
        motivo: motivoFinal.trim(),
      };
      const result = await ajustarEstoque(input);
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const tipoConfig = {
    entrada: { label: 'Adicionar Estoque', icon: Plus, color: 'text-emerald-400', activeClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' },
    saida: { label: 'Remover Estoque', icon: Minus, color: 'text-red-400', activeClass: 'bg-red-500/20 border-red-500/50 text-red-400' },
    ajuste: { label: 'Definir Quantidade', icon: RotateCcw, color: 'text-amber-400', activeClass: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">Ajuste de Estoque</h2>
            {selectedProduto && (
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedProduto.nome}
                {selectedProduto.sku && <span className="text-slate-600 ml-1">#{selectedProduto.sku}</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Product selector if none selected */}
        {!selectedProduto ? (
          <div className="p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar produto por nome ou SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                autoFocus
              />
            </div>

            <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {isSearching ? (
                <div className="text-center py-6 text-xs text-slate-500">Buscando produtos...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">Nenhum produto ativo encontrado.</div>
              ) : (
                searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduto(p)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-slate-600 transition-colors">
                        <Package className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{p.nome}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">SKU: {p.sku || 'Sem SKU'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-300">{p.estoque_atual} <span className="text-[10px] font-normal text-slate-500">{p.unidade}</span></div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Min: {p.estoque_minimo}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-semibold text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Selected product card with change option */}
            <div className="mx-5 mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Produto Selecionado</span>
                <span className="text-xs font-bold text-slate-200 mt-0.5">{selectedProduto.nome}</span>
                <span className="text-[10px] text-slate-400">
                  Estoque Atual: {selectedProduto.estoque_atual} {selectedProduto.unidade}
                </span>
              </div>
              {!produto && (
                <button
                  type="button"
                  onClick={() => setSelectedProduto(null)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer py-1 px-2.5 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  Alterar
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Tipo de Ajuste
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['entrada', 'saida', 'ajuste'] as const).map(t => {
                    const cfg = tipoConfig[t];
                    const Icon = cfg.icon;
                    const isActive = tipo === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isActive ? cfg.activeClass : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? '' : 'opacity-60'}`} />
                        <span>{t === 'entrada' ? 'Entrada' : t === 'saida' ? 'Saída' : 'Ajuste'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  {tipo === 'ajuste' ? 'Nova Quantidade' : 'Quantidade'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  placeholder={tipo === 'ajuste' ? 'Novo valor do estoque' : 'Quantidade a movimentar'}
                  className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>

              {/* Preview */}
              {qty > 0 && (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Estoque após ajuste</span>
                    <span className={`font-bold text-base ${novoEstoque() <= selectedProduto.estoque_minimo && selectedProduto.estoque_minimo > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                      {novoEstoque().toFixed(2)} {selectedProduto.unidade}
                    </span>
                  </div>
                  {novoEstoque() <= selectedProduto.estoque_minimo && selectedProduto.estoque_minimo > 0 && (
                    <p className="text-xs text-amber-400 mt-1">⚠️ Abaixo do estoque mínimo ({selectedProduto.estoque_minimo} {selectedProduto.unidade})</p>
                  )}
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Motivo <span className="text-red-400">*</span>
                </label>
                <select
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 cursor-pointer mb-2"
                >
                  <option value="">Selecione o motivo...</option>
                  {MOTIVOS_PREDEFINIDOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {motivo === 'Outro' && (
                  <input
                    type="text"
                    value={motivoCustom}
                    onChange={e => setMotivoCustom(e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-semibold text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Salvando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
