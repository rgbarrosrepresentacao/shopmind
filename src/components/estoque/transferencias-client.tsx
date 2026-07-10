'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type {
  TransferenciaEstoque,
  TransferenciaEstoqueItem,
  TransferenciaStatus,
  DivergenciaMotivo,
  TransferenciaAgendada,
} from '@/lib/types/transferencias';
import {
  createTransferencia,
  approveTransferencia,
  sendTransferencia,
  receiveTransferencia,
  resolveTransferenciaPendencia,
  cancelTransferencia,
  buscarProdutosOrigem,
  listTransferenciasAgendadas,
  createTransferenciaAgendada,
  deleteTransferenciaAgendada,
} from '@/lib/actions/transferencias';
import { toast } from '@/components/ui/toast';
import {
  Plus,
  Search,
  ArrowLeftRight,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  Calendar,
  User,
  FileText,
  Trash2,
  Barcode,
  Volume2,
  Loader2,
  X,
  HelpCircle,
} from 'lucide-react';

interface TransferenciasClientProps {
  initialTransfs: TransferenciaEstoque[];
  initialCount: number;
  lojasList: { id: string; nome_loja: string; tipo_unidade: string }[];
  profile: {
    id: string;
    nome: string;
    tipo: string;
    loja_id: string;
  };
}

export function TransferenciasClient({
  initialTransfs,
  initialCount,
  lojasList,
  profile,
}: TransferenciasClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transfs, setTransfs] = React.useState<TransferenciaEstoque[]>(initialTransfs);
  const [count, setCount] = React.useState(initialCount);
  const [loading, setLoading] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Sincronizar estado local com as props vindas do servidor
  React.useEffect(() => {
    setTransfs(initialTransfs);
    setCount(initialCount);
  }, [initialTransfs, initialCount]);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('todos');
  const [origemFilter, setOrigemFilter] = React.useState<string>('');
  const [destinoFilter, setDestinoFilter] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(1);

  // Modals state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedTransf, setSelectedTransf] = React.useState<TransferenciaEstoque | null>(null);

  // Verification & Receipt State (Conferência)
  const [receiptOpen, setReceiptOpen] = React.useState(false);
  const [receiptItems, setReceiptItems] = React.useState<{
    itemId: string;
    produtoNome: string;
    barcode: string;
    sku: string;
    quantidadeEnviada: number;
    quantidadeRecebida: number;
    divergenciaMotivo?: DivergenciaMotivo;
    observacao?: string;
  }[]>([]);
  const [barcodeMode, setBarcodeMode] = React.useState(false);
  const barcodeInputRef = React.useRef<HTMLInputElement>(null);

  // Resolution State (Resolução de Pendência)
  const [resolutionOpen, setResolutionOpen] = React.useState(false);
  const [resolutionOption, setResolutionOption] = React.useState<'receber_restante' | 'cancelar_restante' | 'perda_definitiva'>('cancelar_restante');
  const [resolutionMotivo, setResolutionMotivo] = React.useState('');

  // Cancellation State
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false);
  const [cancelMotivo, setCancelMotivo] = React.useState('');

  // Creation Form State
  const [formOrigem, setFormOrigem] = React.useState('');
  const [formDestino, setFormDestino] = React.useState('');
  const [formObservacao, setFormObservacao] = React.useState('');
  const [formItens, setFormItens] = React.useState<{
    produtoId: string;
    produtoMestreId: string;
    nome: string;
    sku: string;
    custo: number;
    estoqueDisponivel: number;
    quantidadeSolicitada: number;
    observacao?: string;
  }[]>([]);

  // Novos Campos Corporativos e Logísticos
  const [formMotivo, setFormMotivo] = React.useState<string>('abastecimento_padrao');
  const [formPrioridade, setFormPrioridade] = React.useState<string>('media');
  const [showLogisticaForm, setShowLogisticaForm] = React.useState(false);
  const [formTransportadora, setFormTransportadora] = React.useState('');
  const [formMotorista, setFormMotorista] = React.useState('');
  const [formPlaca, setFormPlaca] = React.useState('');
  const [formValorFrete, setFormValorFrete] = React.useState<number>(0);
  const [formPeso, setFormPeso] = React.useState<number>(0);
  const [formVolumes, setFormVolumes] = React.useState<number>(0);
  const [formDataPrevista, setFormDataPrevista] = React.useState('');

  // Estados de Transferências Programadas
  const [activeMainTab, setActiveMainTab] = React.useState<'transferencias' | 'agendamentos'>('transferencias');
  const [agendamentos, setAgendamentos] = React.useState<TransferenciaAgendada[]>([]);
  const [agendamentosLoading, setAgendamentosLoading] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleFrequencia, setScheduleFrequencia] = React.useState<'uma_vez' | 'diario' | 'semanal' | 'mensal'>('semanal');
  const [scheduleDataAgendada, setScheduleDataAgendada] = React.useState('');
  const [scheduleDiaSemana, setScheduleDiaSemana] = React.useState<number>(1);
  const [scheduleDiaMes, setScheduleDiaMes] = React.useState<number>(1);
  
  // Creation Product Autocomplete Search
  const [prodSearch, setProdSearch] = React.useState('');
  const [prodResults, setProdResults] = React.useState<any[]>([]);
  const [prodSearching, setProdSearching] = React.useState(false);

  // Web Audio Beep API for Barcode
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Web Audio beep not supported or blocked by browser gesture.', e);
    }
  };

  // Pre-fill from suggestions URL params
  React.useEffect(() => {
    const quickstart = searchParams.get('quickstart');
    if (quickstart === 'true') {
      const origem = searchParams.get('origem') || '';
      const destino = searchParams.get('destino') || '';
      const prodMestreId = searchParams.get('produtoMestre') || '';
      const prodNome = searchParams.get('produtoNome') || '';
      const qtd = parseInt(searchParams.get('quantidade') || '1', 10);

      setFormOrigem(origem);
      setFormDestino(destino);
      
      // Load product details to form
      if (origem && prodMestreId) {
        setLoading(true);
        buscarProdutosOrigem(origem, prodNome).then(res => {
          setLoading(false);
          const prod = res.data?.find(p => p.produtoMestreId === prodMestreId);
          if (prod) {
            setFormItens([{
              produtoId: prod.id,
              produtoMestreId: prod.produtoMestreId,
              nome: prod.nome,
              sku: prod.sku,
              custo: prod.preco_custo,
              estoqueDisponivel: prod.estoque_disponivel,
              quantidadeSolicitada: Math.min(qtd, prod.estoque_disponivel),
              observacao: 'Reposição sugerida pela inteligência local.',
            }]);
            setCreateOpen(true);
            toast.success('Reposição inteligente pré-carregada.');
          } else {
            toast.error('Produto sugerido não localizado na filial de origem.');
          }
        });
      }
    }
  }, [searchParams]);

  // Autofocus hidden barcode input when mode is active
  React.useEffect(() => {
    if (barcodeMode && receiptOpen) {
      barcodeInputRef.current?.focus();
    }
  }, [barcodeMode, receiptOpen]);

  // Load transfers list based on filters
  const fetchTransfers = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transferencias?status=${statusFilter}&origem=${origemFilter}&destino=${destinoFilter}&search=${searchTerm}&page=${page}`);
      // Alternatively, call server action directly
      // However, to keep pagination reactive without page reload, we can use the server action directly and update state
      // Since Server Action can be called on-demand:
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, origemFilter, destinoFilter, searchTerm, page]);

  // Direct Server Action loader for reactivity
  const reloadData = React.useCallback(() => {
    startTransition(async () => {
      // Reload current page/filters via server routing or action
      router.refresh();
    });
  }, [router]);

  // Search products autocomplete for transfer creation
  React.useEffect(() => {
    if (!formOrigem) {
      setProdResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      if (prodSearch.trim().length < 2) {
        setProdResults([]);
        return;
      }
      setProdSearching(true);
      try {
        const res = await buscarProdutosOrigem(formOrigem, prodSearch);
        if (res.data) setProdResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setProdSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [prodSearch, formOrigem]);

  // Add item to creation list
  const handleAddProduct = (prod: any) => {
    // Check if already added
    if (formItens.some(i => i.produtoMestreId === prod.produtoMestreId)) {
      toast.error('Este produto já foi adicionado à lista.');
      return;
    }

    if (prod.estoque_disponivel <= 0) {
      toast.error('Este produto está sem estoque disponível na origem.');
      return;
    }

    setFormItens(prev => [
      ...prev,
      {
        produtoId: prod.id,
        produtoMestreId: prod.produtoMestreId,
        nome: prod.nome,
        sku: prod.sku,
        custo: prod.preco_custo,
        estoqueDisponivel: prod.estoque_disponivel,
        quantidadeSolicitada: 1,
      },
    ]);
    setProdSearch('');
    setProdResults([]);
  };

  // Submit transfer request
  const handleCreateSubmit = async (status: 'rascunho' | 'solicitada') => {
    if (!formOrigem || !formDestino) {
      toast.error('Por favor, selecione as filiais de origem e destino.');
      return;
    }
    if (formItens.length === 0) {
      toast.error('Adicione pelo menos um produto para transferência.');
      return;
    }

    const invalidItem = formItens.find(i => i.quantidadeSolicitada > i.estoqueDisponivel);
    if (invalidItem && status === 'solicitada') {
      toast.error(`Quantidade solicitada para "${invalidItem.nome}" excede o estoque disponível (${invalidItem.estoqueDisponivel}).`);
      return;
    }

    setLoading(true);
    try {
      const res = await createTransferencia({
        lojaOrigemId: formOrigem,
        lojaDestinoId: formDestino,
        observacao: formObservacao,
        status,
        itens: formItens.map(i => ({
          produtoMestreId: i.produtoMestreId,
          quantidadeSolicitada: i.quantidadeSolicitada,
          observacao: i.observacao,
        })),
        motivo: formMotivo,
        prioridade: formPrioridade,
        transportadora: formTransportadora || undefined,
        motorista: formMotorista || undefined,
        placa: formPlaca || undefined,
        valorFrete: formValorFrete || undefined,
        peso: formPeso || undefined,
        volumes: formVolumes || undefined,
        dataPrevista: formDataPrevista || undefined,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(status === 'solicitada' ? 'Solicitação de transferência enviada!' : 'Rascunho de transferência salvo.');
        setCreateOpen(false);
        setFormItens([]);
        setFormObservacao('');
        setFormOrigem('');
        setFormDestino('');
        setFormMotivo('abastecimento_padrao');
        setFormPrioridade('media');
        setFormTransportadora('');
        setFormMotorista('');
        setFormPlaca('');
        setFormValorFrete(0);
        setFormPeso(0);
        setFormVolumes(0);
        setFormDataPrevista('');
        setShowLogisticaForm(false);
        reloadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar.');
    } finally {
      setLoading(false);
    }
  };

  // Funções de Agendamentos
  const fetchAgendamentos = React.useCallback(async () => {
    setAgendamentosLoading(true);
    try {
      const res = await listTransferenciasAgendadas();
      if (res.data) {
        setAgendamentos(res.data as TransferenciaAgendada[]);
      }
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setAgendamentosLoading(false);
    }
  }, []);

  const handleScheduleSubmit = async () => {
    if (!formOrigem || !formDestino) {
      toast.error('Selecione as filiais de origem e destino.');
      return;
    }
    if (formItens.length === 0) {
      toast.error('Adicione pelo menos um produto para o agendamento.');
      return;
    }
    setLoading(true);
    try {
      const res = await createTransferenciaAgendada({
        lojaOrigemId: formOrigem,
        lojaDestinoId: formDestino,
        frequencia: scheduleFrequencia,
        dataAgendada: scheduleFrequencia === 'uma_vez' ? scheduleDataAgendada : undefined,
        diaSemana: scheduleFrequencia === 'semanal' ? Number(scheduleDiaSemana) : undefined,
        diaMes: scheduleFrequencia === 'mensal' ? Number(scheduleDiaMes) : undefined,
        motivo: formMotivo,
        prioridade: formPrioridade,
        observacao: formObservacao,
        itens: formItens.map(i => ({
          produtoMestreId: i.produtoMestreId,
          quantidade: i.quantidadeSolicitada,
        })),
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Transferência agendada com sucesso!');
        setScheduleOpen(false);
        setFormItens([]);
        setFormObservacao('');
        setFormOrigem('');
        setFormDestino('');
        fetchAgendamentos();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar.');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este agendamento?')) return;
    setLoading(true);
    try {
      const res = await deleteTransferenciaAgendada(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Agendamento de transferência removido.');
        fetchAgendamentos();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover agendamento.');
    } finally {
      setLoading(false);
    }
  };

  // Approve Transfer
  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      const res = await approveTransferencia(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Transferência aprovada! Estoque reservado na origem.');
        setDetailOpen(false);
        reloadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar.');
    } finally {
      setLoading(false);
    }
  };

  // Send (Dispatch) Transfer
  const handleSend = async (id: string) => {
    setLoading(true);
    try {
      const res = await sendTransferencia(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Mercadoria enviada! Status alterado para Em Trânsito.');
        setDetailOpen(false);
        reloadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar envio.');
    } finally {
      setLoading(false);
    }
  };

  // Open item-by-item checklist view
  const handleOpenReceiptCheck = (transf: TransferenciaEstoque) => {
    const items = (transf.itens || []).map(i => ({
      itemId: i.id,
      produtoNome: i.produto_nome || 'Produto',
      barcode: i.produto_barcode || '',
      sku: i.produto_sku || '',
      quantidadeEnviada: i.quantidade_enviada || i.quantidade_solicitada,
      quantidadeRecebida: i.quantidade_enviada || i.quantidade_solicitada, // Default to full receipt
      divergenciaMotivo: undefined,
      observacao: '',
    }));
    setReceiptItems(items);
    setDetailOpen(false);
    setReceiptOpen(true);
  };

  // Barcode scanner events handler
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value.trim();
      if (!val) return;

      // Find item in receiptItems
      const itemIdx = receiptItems.findIndex(i => i.barcode === val || i.sku === val);
      if (itemIdx !== -1) {
        playBeep();
        setReceiptItems(prev => {
          const clone = [...prev];
          const item = clone[itemIdx];
          const newQty = item.quantidadeRecebida + 1;
          
          clone[itemIdx] = {
            ...item,
            quantidadeRecebida: newQty,
            // Automatically set divergence if it exceeds or differs
            divergenciaMotivo: newQty !== item.quantidadeEnviada ? 'Erro de separação' : undefined,
          };
          return clone;
        });
        toast.success(`Bip! +1 un. no produto "${receiptItems[itemIdx].produtoNome}"`);
      } else {
        toast.error(`Bip! Código "${val}" não consta nesta transferência.`);
      }
      e.currentTarget.value = '';
    }
  };

  // Save item-by-item receipt
  const handleReceiveSubmit = async () => {
    if (!selectedTransf) return;

    setLoading(true);
    try {
      const res = await receiveTransferencia(
        selectedTransf.id,
        receiptItems.map(i => ({
          itemId: i.itemId,
          quantidadeRecebida: i.quantidadeRecebida,
          divergenciaMotivo: i.divergenciaMotivo,
          observacao: i.observacao,
        }))
      );

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Conferência finalizada!');
        setReceiptOpen(false);
        reloadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao finalizar recebimento.');
    } finally {
      setLoading(false);
    }
  };

  // Resolve Partial Receipt
  const handleResolveSubmit = async () => {
    if (!selectedTransf) return;
    if (!resolutionMotivo.trim()) {
      toast.error('Justifique o motivo da resolução.');
      return;
    }

    setLoading(true);
    try {
      const res = await resolveTransferenciaPendencia(
        selectedTransf.id,
        resolutionOption,
        resolutionMotivo
      );

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Resolução de pendência concluída com sucesso!');
        setResolutionOpen(false);
        setDetailOpen(false);
        reloadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar resolução.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel/Refuse Transfer
  const handleCancelSubmit = async () => {
    if (!selectedTransf) return;
    if (!cancelMotivo.trim()) {
      toast.error('Justifique o motivo do cancelamento.');
      return;
    }

    setLoading(true);
    try {
      const res = await cancelTransferencia(selectedTransf.id, cancelMotivo);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Transferência cancelada. Estoque estornado/liberado.');
        setCancelConfirmOpen(false);
        setDetailOpen(false);
        reloadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get status styling
  const getStatusBadge = (status: TransferenciaStatus) => {
    const maps: Record<TransferenciaStatus, { label: string; bg: string; text: string; icon: any }> = {
      rascunho: { label: 'Rascunho', bg: 'bg-slate-800/60 border-slate-700/50', text: 'text-slate-400', icon: Clock },
      solicitada: { label: 'Solicitada', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: Clock },
      aprovada: { label: 'Aprovada', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', icon: CheckCircle2 },
      em_transito: { label: 'Em Trânsito', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: Truck },
      recebida: { label: 'Recebida', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle2 },
      parcialmente_recebida: { label: 'Pendente / Divergente', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: AlertCircle },
      cancelada: { label: 'Cancelada', bg: 'bg-rose-950/20 border-rose-900/30', text: 'text-rose-400', icon: XCircle },
      recusada: { label: 'Recusada', bg: 'bg-rose-950/20 border-rose-900/30', text: 'text-rose-400', icon: XCircle },
    };

    const conf = maps[status] || maps.rascunho;
    const Icon = conf.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{conf.label}</span>
      </span>
    );
  };

  // Filter transfers locally for instant response (and match server pagination structure)
  const filteredTransfs = React.useMemo(() => {
    return transfs.filter(t => {
      const matchesSearch = searchTerm
        ? t.id.includes(searchTerm) ||
          t.loja_origem_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.loja_destino_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.solicitante_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.observacao?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesStatus = statusFilter === 'todos' ? true : t.status === statusFilter;
      const matchesOrigem = origemFilter ? t.loja_origem_id === origemFilter : true;
      const matchesDestino = destinoFilter ? t.loja_destino_id === destinoFilter : true;

      return matchesSearch && matchesStatus && matchesOrigem && matchesDestino;
    });
  }, [transfs, searchTerm, statusFilter, origemFilter, destinoFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Central de Transferências entre Filiais
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Solicite, aprove, acompanhe e confirme remessas de mercadorias entre as unidades com rastreabilidade total.
          </p>
        </div>
        {activeMainTab === 'transferencias' ? (
          <button
            onClick={() => {
              if (profile.tipo !== 'dono') {
                setFormOrigem(profile.loja_id);
              }
              setFormItens([]);
              setFormObservacao('');
              setFormMotivo('abastecimento_padrao');
              setFormPrioridade('media');
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Transferência</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (profile.tipo !== 'dono') {
                setFormOrigem(profile.loja_id);
              }
              setFormItens([]);
              setFormObservacao('');
              setFormMotivo('abastecimento_padrao');
              setFormPrioridade('media');
              setScheduleFrequencia('semanal');
              setScheduleDiaSemana(1);
              setScheduleDiaMes(1);
              setScheduleDataAgendada('');
              setScheduleOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Programar Transferência</span>
          </button>
        )}
      </div>

      {/* Main Tabs Selector */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveMainTab('transferencias')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'transferencias'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Remessas & Transferências Operacionais
        </button>
        <button
          onClick={() => {
            setActiveMainTab('agendamentos');
            fetchAgendamentos();
          }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeMainTab === 'agendamentos'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Transferências Programadas (Agendador Cron)
        </button>
      </div>

      {/* Quick Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Em Trânsito</span>
          <h4 className="text-lg font-extrabold text-slate-200 mt-1">
            {transfs.filter(t => t.status === 'em_transito').length} remessa(s)
          </h4>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Com Divergências</span>
          <h4 className="text-lg font-extrabold text-red-400 mt-1">
            {transfs.filter(t => t.status === 'parcialmente_recebida').length} pendência(s)
          </h4>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Aguardando Aprovação</span>
          <h4 className="text-lg font-extrabold text-blue-400 mt-1">
            {transfs.filter(t => t.status === 'solicitada').length} solicitação(ões)
          </h4>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Concluídas (Mês)</span>
          <h4 className="text-lg font-extrabold text-emerald-400 mt-1">
            {transfs.filter(t => t.status === 'recebida').length} transferência(s)
          </h4>
        </div>
      </div>

      {/* Grid Datatable and Filters */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por ID, loja ou solicitante..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="rascunho">Rascunhos</option>
              <option value="solicitada">Solicitadas</option>
              <option value="aprovada">Aprovadas</option>
              <option value="em_transito">Em Trânsito</option>
              <option value="recebida">Recebidas</option>
              <option value="parcialmente_recebida">Com Pendência</option>
              <option value="cancelada">Canceladas</option>
            </select>

            <select
              value={origemFilter}
              onChange={e => setOrigemFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">Todas as Origens</option>
              {lojasList.map(l => (
                <option key={l.id} value={l.id}>{l.nome_loja}</option>
              ))}
            </select>

            <select
              value={destinoFilter}
              onChange={e => setDestinoFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="">Todos os Destinos</option>
              {lojasList.map(l => (
                <option key={l.id} value={l.id}>{l.nome_loja}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Datatable Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3">Código / ID</th>
                <th className="p-3">Origem</th>
                <th className="p-3 text-center w-[40px]"></th>
                <th className="p-3">Destino</th>
                <th className="p-3">Solicitante</th>
                <th className="p-3">Data</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTransfs.length > 0 ? (
                filteredTransfs.map(t => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-800/10 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedTransf(t);
                      setDetailOpen(true);
                    }}
                  >
                    <td className="p-3 font-mono font-bold text-slate-400">
                      #{t.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="p-3 font-semibold">{t.loja_origem_nome}</td>
                    <td className="p-3 text-center">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    </td>
                    <td className="p-3 font-semibold">{t.loja_destino_nome}</td>
                    <td className="p-3">{t.solicitante_nome || 'Operador'}</td>
                    <td className="p-3">
                      {t.data_solicitacao ? new Date(t.data_solicitacao).toLocaleDateString('pt-BR') : 'N/D'}
                    </td>
                    <td className="p-3">{getStatusBadge(t.status)}</td>
                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedTransf(t);
                          setDetailOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700/80 transition-colors cursor-pointer"
                      >
                        Visualizar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nenhuma transferência localizada com os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CRIAÇÃO / SOLICITAÇÃO DE TRANSFERÊNCIA                           */}
      {/* ========================================================================= */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Nova Solicitação de Transferência</h3>
                <p className="text-xs text-slate-400 mt-0.5">Defina as filiais e os produtos que deseja transferir.</p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Route Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Filial de Origem (Doadora)</label>
                  <select
                    value={formOrigem}
                    disabled={profile.tipo !== 'dono'}
                    onChange={e => {
                      setFormOrigem(e.target.value);
                      setFormItens([]);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">Selecione a origem...</option>
                    {lojasList.map(l => (
                      <option key={l.id} value={l.id}>{l.nome_loja}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Filial de Destino (Carente)</label>
                  <select
                    value={formDestino}
                    onChange={e => setFormDestino(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Selecione o destino...</option>
                    {lojasList.filter(l => l.id !== formOrigem).map(l => (
                      <option key={l.id} value={l.id}>{l.nome_loja}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Motivo e Prioridade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Motivo da Transferência</label>
                  <select
                    value={formMotivo}
                    onChange={e => setFormMotivo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="abastecimento_padrao">Abastecimento Padrão</option>
                    <option value="ruptura_urgente">Ruptura Urgente (Reposição)</option>
                    <option value="remanejamento_excesso">Remanejamento de Excesso</option>
                    <option value="demanda_sazonal">Demanda Sazonal</option>
                    <option value="campanha_marketing">Campanha de Marketing</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Prioridade</label>
                  <select
                    value={formPrioridade}
                    onChange={e => setFormPrioridade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica (Urgência Máxima)</option>
                  </select>
                </div>
              </div>

              {/* Product Autocomplete Section */}
              {formOrigem ? (
                <div className="space-y-2 p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 relative">
                  <label className="text-xs font-bold text-slate-300 uppercase">Adicionar Itens do Estoque de Origem</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Pesquisar produto por nome, SKU ou Código de Barras..."
                      value={prodSearch}
                      onChange={e => setProdSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                    {prodSearching && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-blue-500 animate-spin" />
                    )}
                  </div>

                  {/* Search Dropdown Results */}
                  {prodResults.length > 0 && (
                    <div className="absolute left-4 right-4 z-30 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800/80">
                      {prodResults.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddProduct(prod)}
                          className="p-3 hover:bg-slate-800/40 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-200">{prod.nome}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {prod.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-400">{prod.estoque_disponivel} un. disponível</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Custo: R$ {prod.preco_custo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-800/40 text-center text-xs text-slate-500">
                  Selecione a filial de origem para liberar a busca de produtos do estoque.
                </div>
              )}

              {/* Selected Items List */}
              {formItens.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Itens da Remessa ({formItens.length})</label>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-800">
                          <th className="p-2.5">Produto / SKU</th>
                          <th className="p-2.5 text-center">Estoque Origem</th>
                          <th className="p-2.5 text-center w-[120px]">Qtd Transferir</th>
                          <th className="p-2.5 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {formItens.map((item, idx) => (
                          <tr key={item.produtoMestreId} className="hover:bg-slate-800/10">
                            <td className="p-2.5">
                              <p className="font-bold text-slate-200">{item.nome}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.sku}</p>
                            </td>
                            <td className="p-2.5 text-center font-medium text-slate-400">
                              {item.estoqueDisponivel} un.
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                max={item.estoqueDisponivel}
                                value={item.quantidadeSolicitada}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setFormItens(prev => {
                                    const clone = [...prev];
                                    clone[idx].quantidadeSolicitada = Math.min(val, item.estoqueDisponivel);
                                    return clone;
                                  });
                                }}
                                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-center text-slate-200 focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => setFormItens(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Collapsible Logistics Section */}
              <div className="space-y-2 border border-slate-800 rounded-xl p-4 bg-slate-950/10">
                <button
                  type="button"
                  onClick={() => setShowLogisticaForm(!showLogisticaForm)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-400" />
                    <span>Dados de Transporte e Logística (Opcional)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {showLogisticaForm ? 'Recolher' : 'Expandir'}
                  </span>
                </button>

                {showLogisticaForm && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/60 animate-fade-in text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Transportadora</label>
                      <input
                        type="text"
                        placeholder="Nome da empresa..."
                        value={formTransportadora}
                        onChange={e => setFormTransportadora(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Motorista</label>
                      <input
                        type="text"
                        placeholder="Nome do condutor..."
                        value={formMotorista}
                        onChange={e => setFormMotorista(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Placa do Veículo</label>
                      <input
                        type="text"
                        placeholder="ABC-1234..."
                        value={formPlaca}
                        onChange={e => setFormPlaca(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Valor do Frete (R$)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={formValorFrete}
                        onChange={e => setFormValorFrete(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Peso (kg)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={formPeso}
                        onChange={e => setFormPeso(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Volumes (Qtd)</label>
                      <input
                        type="number"
                        min={0}
                        value={formVolumes}
                        onChange={e => setFormVolumes(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Previsão de Entrega</label>
                      <input
                        type="date"
                        value={formDataPrevista}
                        onChange={e => setFormDataPrevista(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Observation */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Observações / Justificativa</label>
                <textarea
                  placeholder="Informe observações operacionais sobre esta transferência (ex: reposição de quebra, remanejamento de campanha...)"
                  rows={2}
                  value={formObservacao}
                  onChange={e => setFormObservacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-950/20">
              <button
                disabled={loading}
                onClick={() => handleCreateSubmit('rascunho')}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Salvar Rascunho
              </button>
              <div className="flex items-center gap-2">
                <button
                  disabled={loading}
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  disabled={loading || formItens.length === 0}
                  onClick={() => handleCreateSubmit('solicitada')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/15 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  Enviar Solicitação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETALHES & LINHA DO TEMPO (TIMELINE)                              */}
      {/* ========================================================================= */}
      {detailOpen && selectedTransf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/10">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-100">Transferência #{selectedTransf.id.substring(0, 8).toUpperCase()}</h3>
                  {getStatusBadge(selectedTransf.status)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  De <span className="font-bold text-slate-300">{selectedTransf.loja_origem_nome}</span> para <span className="font-bold text-slate-300">{selectedTransf.loja_destino_nome}</span>
                </p>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Flow Timeline & Audit Logs */}
              <div className="lg:col-span-1 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-800/80 pr-0 lg:pr-6 pb-6 lg:pb-0">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalhamento</h4>
                  <div className="mt-2 space-y-1.5 text-xs text-slate-300">
                    <p><span className="text-slate-500 font-medium">Motivo:</span> <span className="capitalize">{selectedTransf.motivo?.replace(/_/g, ' ') || 'Abastecimento'}</span></p>
                    <p><span className="text-slate-500 font-medium">Prioridade:</span> <span className="capitalize">{selectedTransf.prioridade || 'media'}</span></p>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Governança & Assinaturas</h4>
                
                {/* Visual Vertical Timeline */}
                <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
                  {/* Step 1: Solicitado */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white border-4 border-slate-900" />
                    <p className="text-xs font-bold text-slate-200">Solicitada / Criada</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {selectedTransf.solicitante_nome || 'Operador'}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                      {selectedTransf.data_solicitacao ? new Date(selectedTransf.data_solicitacao).toLocaleString('pt-BR') : 'N/D'}
                    </p>
                  </div>

                  {/* Step 2: Multi-Signature Alçadas */}
                  {selectedTransf.status !== 'rascunho' && (
                    <div className="space-y-4 pt-1 border-t border-slate-800/60 mt-1">
                      <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Aprovações Requeridas</p>
                      
                      {/* Supervisor */}
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className={`mt-0.5 text-xs font-bold ${selectedTransf.aprovado_supervisor_por ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {selectedTransf.aprovado_supervisor_por ? '●' : '○'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-300">Supervisor de Área</p>
                          <p className="text-[10px] text-slate-500">
                            {selectedTransf.aprovado_supervisor_por 
                              ? `Assinado por ${selectedTransf.aprovado_supervisor_por} em ${new Date(selectedTransf.data_aprovacao_supervisor!).toLocaleDateString('pt-BR')}`
                              : 'Aguardando liberação regional'}
                          </p>
                        </div>
                      </div>

                      {/* Financeiro */}
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className={`mt-0.5 text-xs font-bold ${selectedTransf.aprovado_financeiro_por ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {selectedTransf.aprovado_financeiro_por ? '●' : '○'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-300">Diretoria Financeira</p>
                          <p className="text-[10px] text-slate-500">
                            {selectedTransf.aprovado_financeiro_por 
                              ? `Assinado por ${selectedTransf.aprovado_financeiro_por} em ${new Date(selectedTransf.data_aprovacao_financeiro!).toLocaleDateString('pt-BR')}`
                              : 'Aguardando liberação de crédito/frete'}
                          </p>
                        </div>
                      </div>

                      {/* Dono */}
                      <div className="flex items-start gap-2 text-[11px]">
                        <span className={`mt-0.5 text-xs font-bold ${selectedTransf.aprovado_dono_por ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {selectedTransf.aprovado_dono_por ? '●' : '○'}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-300">Diretoria Executiva (Dono)</p>
                          <p className="text-[10px] text-slate-500">
                            {selectedTransf.aprovado_dono_por 
                              ? `Assinado por ${selectedTransf.aprovado_dono_por} em ${new Date(selectedTransf.data_aprovacao_dono!).toLocaleDateString('pt-BR')}`
                              : 'Aguardando chancela do proprietário'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Enviado */}
                  {selectedTransf.data_envio && (
                    <div className="relative animate-fade-in">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white border-4 border-slate-900" />
                      <p className="text-xs font-bold text-slate-200">Enviada (Em Trânsito)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {selectedTransf.enviado_nome || 'Expedição'}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {new Date(selectedTransf.data_envio).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}

                  {/* Step 4: Recebido */}
                  {selectedTransf.data_recebimento && (
                    <div className="relative animate-fade-in">
                      <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white border-4 border-slate-900 ${
                        selectedTransf.status === 'parcialmente_recebida' ? 'bg-red-500' : 'bg-emerald-500'
                      }`} />
                      <p className="text-xs font-bold text-slate-200">
                        {selectedTransf.status === 'parcialmente_recebida' ? 'Recebida Parcialmente' : 'Recebida'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {selectedTransf.recebido_nome || 'Recebimento'}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {new Date(selectedTransf.data_recebimento).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}

                  {/* Step 5: Cancelado / Recusado */}
                  {selectedTransf.data_cancelamento && (
                    <div className="relative animate-fade-in">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-white border-4 border-slate-900" />
                      <p className="text-xs font-bold text-rose-400">Cancelada / Recusada</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {selectedTransf.cancelado_nome || 'Operador'}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {new Date(selectedTransf.data_cancelamento).toLocaleString('pt-BR')}
                      </p>
                      {selectedTransf.motivo_cancelamento && (
                        <p className="text-[10px] bg-rose-950/20 border border-rose-900/30 p-2 rounded-lg text-rose-300/85 leading-normal mt-1">
                          Motivo: {selectedTransf.motivo_cancelamento}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Logistics Info Card */}
                {selectedTransf.transportadora && (
                  <div className="p-3 rounded-xl bg-slate-950/25 border border-slate-800 text-xs space-y-1.5 text-slate-300">
                    <p className="font-bold text-slate-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dados Logísticos:</span>
                    </p>
                    <div className="space-y-1 mt-1 text-[11px] leading-relaxed">
                      <p><span className="text-slate-500">Empresa:</span> {selectedTransf.transportadora}</p>
                      {selectedTransf.motorista && <p><span className="text-slate-500">Motorista:</span> {selectedTransf.motorista}</p>}
                      {selectedTransf.placa && <p><span className="text-slate-500">Placa:</span> {selectedTransf.placa}</p>}
                      {selectedTransf.valor_frete > 0 && <p><span className="text-slate-500">Frete:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTransf.valor_frete)}</p>}
                      {selectedTransf.peso > 0 && <p><span className="text-slate-500">Peso:</span> {selectedTransf.peso} kg</p>}
                      {selectedTransf.volumes > 0 && <p><span className="text-slate-500">Volumes:</span> {selectedTransf.volumes} vol</p>}
                      {selectedTransf.data_prevista && <p><span className="text-slate-500">Previsão:</span> {new Date(selectedTransf.data_prevista).toLocaleDateString('pt-BR')}</p>}
                    </div>
                  </div>
                )}

                {/* Observation Box */}
                {selectedTransf.observacao && (
                  <div className="p-3 rounded-xl bg-slate-950/25 border border-slate-800 text-xs">
                    <p className="font-bold text-slate-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Observação Geral:</span>
                    </p>
                    <p className="text-slate-300 mt-1 leading-normal italic">
                      "{selectedTransf.observacao}"
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Items Table */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itens da Transferência</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-800">
                        <th className="p-3">Produto / SKU</th>
                        <th className="p-3 text-center">Sol.</th>
                        <th className="p-3 text-center">Env.</th>
                        <th className="p-3 text-center">Rec.</th>
                        <th className="p-3 text-center">Dif.</th>
                        <th className="p-3">Divergência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(selectedTransf.itens || []).map(item => {
                        const sol = Number(item.quantidade_solicitada);
                        const env = Number(item.quantidade_enviada || 0);
                        const rec = Number(item.quantidade_recebida || 0);
                        const dif = env - rec;

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/10">
                            <td className="p-3">
                              <p className="font-bold text-slate-200">{item.produto_nome}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.produto_sku}</p>
                            </td>
                            <td className="p-3 text-center font-medium text-slate-400">{sol}</td>
                            <td className="p-3 text-center font-medium text-slate-200">
                              {selectedTransf.status === 'solicitada' || selectedTransf.status === 'rascunho' ? '-' : env}
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-400">
                              {['rascunho', 'solicitada', 'aprovada', 'em_transito'].includes(selectedTransf.status) ? '-' : rec}
                            </td>
                            <td className={`p-3 text-center font-extrabold ${dif > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                              {['rascunho', 'solicitada', 'aprovada', 'em_transito'].includes(selectedTransf.status) ? '-' : dif}
                            </td>
                            <td className="p-3">
                              {item.divergencia_motivo ? (
                                <div className="space-y-0.5">
                                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold rounded">
                                    {item.divergencia_motivo}
                                  </span>
                                  {item.observacao && (
                                    <p className="text-[9px] text-slate-500 truncate max-w-[120px]" title={item.observacao}>
                                      {item.observacao}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer buttons / Workflow transitions */}
            <div className="flex flex-wrap items-center justify-between p-5 border-t border-slate-800 bg-slate-950/20 gap-4">
              <div>
                {/* Cancel Trigger button */}
                {!['cancelada', 'recusada', 'recebida'].includes(selectedTransf.status) && (
                  <button
                    onClick={() => {
                      setCancelMotivo('');
                      setCancelConfirmOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-xl border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                  >
                    {selectedTransf.status === 'solicitada' ? 'Recusar Solicitação' : 'Cancelar Transferência'}
                  </button>
                )}
              </div>

              {/* Action Buttons based on Status */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>

                {/* Status: SOLICITADA -> Approve action */}
                {selectedTransf.status === 'solicitada' && profile.tipo !== 'estoquista' && (
                  <button
                    disabled={loading}
                    onClick={() => handleApprove(selectedTransf.id)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/15 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    Aprovar (Reservar Estoque)
                  </button>
                )}

                {/* Status: APROVADA / SOLICITADA -> Send action */}
                {(selectedTransf.status === 'aprovada' || (selectedTransf.status === 'solicitada' && profile.tipo === 'dono')) && (
                  <button
                    disabled={loading}
                    onClick={() => handleSend(selectedTransf.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/15 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    Despachar Remessa (Baixar Estoque)
                  </button>
                )}

                {/* Status: EM_TRANSITO -> Receive checklist action */}
                {selectedTransf.status === 'em_transito' && (
                  <button
                    onClick={() => handleOpenReceiptCheck(selectedTransf)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/15 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    Conferir Recebimento
                  </button>
                )}

                {/* Status: PARCIALMENTE_RECEBIDA -> Resolve pendency action */}
                {selectedTransf.status === 'parcialmente_recebida' && (
                  <button
                    onClick={() => {
                      setResolutionMotivo('');
                      setResolutionOption('cancelar_restante');
                      setResolutionOpen(true);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/15 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    Resolver Pendências
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFERÊNCIA ITEM A ITEM & LEITOR (PREPARAÇÃO)                    */}
      {/* ========================================================================= */}
      {receiptOpen && selectedTransf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* hidden input to receive barcode scanners */}
            <input
              ref={barcodeInputRef}
              type="text"
              className="absolute -top-40 opacity-0 pointer-events-none"
              onKeyDown={handleBarcodeScan}
            />

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/10">
              <div>
                <h3 className="text-base font-bold text-slate-100">Conferência de Recebimento</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remessa #{selectedTransf.id.substring(0, 8).toUpperCase()} • Confirme item por item recebido.
                </p>
              </div>
              
              {/* Barcode scanner toggle button */}
              <button
                onClick={() => {
                  setBarcodeMode(!barcodeMode);
                  toast.info(!barcodeMode ? 'Modo Leitor Ativo! Comece a bipar.' : 'Modo Leitor Inativo.');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  barcodeMode
                    ? 'bg-purple-600 border-purple-500 text-white animate-pulse-glow shadow-glow-purple/25'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Barcode className="w-4 h-4" />
                <Volume2 className="w-3.5 h-3.5" />
                <span>{barcodeMode ? 'Modo Bip: LIGADO' : 'Ativar Modo Bip'}</span>
              </button>
            </div>

            {/* Checklist Table */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {barcodeMode && (
                <div className="p-3 rounded-xl bg-purple-950/10 border border-purple-500/20 text-center text-[11px] text-purple-300 animate-pulse">
                  O sistema está escutando leituras de código de barras. Bipe os produtos para autoincrementar a contagem física.
                </div>
              )}

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-800">
                      <th className="p-3">Produto / SKU / EAN</th>
                      <th className="p-3 text-center w-[80px]">Enviado</th>
                      <th className="p-3 text-center w-[120px]">Recebido</th>
                      <th className="p-3 text-center w-[80px]">Diferença</th>
                      <th className="p-3 w-[160px]">Motivo Divergência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {receiptItems.map((item, idx) => {
                      const env = item.quantidadeEnviada;
                      const rec = item.quantidadeRecebida;
                      const dif = env - rec;

                      return (
                        <tr
                          key={item.itemId}
                          className={`transition-colors ${
                            dif === 0
                              ? 'bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-300/95'
                              : dif > 0
                              ? 'bg-red-500/5 hover:bg-red-500/10 text-red-300/95'
                              : 'hover:bg-slate-800/10'
                          }`}
                        >
                          <td className="p-3">
                            <p className="font-bold text-slate-200">{item.produtoNome}</p>
                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                              SKU: {item.sku} • EAN: {item.barcode || 'N/D'}
                            </p>
                          </td>
                          <td className="p-3 text-center font-semibold">{env}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={rec}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setReceiptItems(prev => {
                                  const clone = [...prev];
                                  clone[idx].quantidadeRecebida = val;
                                  // Automatically reset reason if match
                                  clone[idx].divergenciaMotivo = val === env ? undefined : clone[idx].divergenciaMotivo || 'Erro de separação';
                                  return clone;
                                });
                              }}
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-center text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className={`p-3 text-center font-extrabold ${dif > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            {dif}
                          </td>
                          <td className="p-3">
                            {dif !== 0 ? (
                              <div className="space-y-1">
                                <select
                                  value={item.divergenciaMotivo || 'Erro de separação'}
                                  onChange={e => {
                                    const val = e.target.value as DivergenciaMotivo;
                                    setReceiptItems(prev => {
                                      const clone = [...prev];
                                      clone[idx].divergenciaMotivo = val;
                                      return clone;
                                    });
                                  }}
                                  className="w-full px-1.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-200 focus:outline-none cursor-pointer"
                                >
                                  <option value="Produto quebrado">Produto quebrado</option>
                                  <option value="Produto faltando">Produto faltando</option>
                                  <option value="Extravio">Extravio</option>
                                  <option value="Erro de separação">Erro de separação</option>
                                  <option value="Outro">Outro</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="Detalhes..."
                                  value={item.observacao || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setReceiptItems(prev => {
                                      const clone = [...prev];
                                      clone[idx].observacao = val;
                                      return clone;
                                    });
                                  }}
                                  className="w-full px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[9px] text-slate-200 focus:outline-none"
                                />
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[10px] italic">Sem divergência</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-5 border-t border-slate-800 bg-slate-950/20 gap-2">
              <button
                onClick={() => {
                  setReceiptOpen(false);
                  setDetailOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                disabled={loading}
                onClick={handleReceiveSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/15 transition-all hover:scale-[1.02] cursor-pointer"
              >
                Finalizar Conferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESOLUÇÃO DE RECEBIMENTO PARCIAL / PENDÊNCIA                      */}
      {/* ========================================================================= */}
      {resolutionOpen && selectedTransf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Resolver Divergência de Recebimento</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Defina o destino do saldo de mercadorias pendentes.</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Como deseja resolver a pendência?</label>
                
                {/* Option 1 */}
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionOption === 'receber_restante'}
                    onChange={() => setResolutionOption('receber_restante')}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-200">Aguardar recebimento posterior</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                      Mantém a transferência com status "Em Trânsito" para permitir nova conferência do restante.
                    </p>
                  </div>
                </label>

                {/* Option 2 */}
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionOption === 'cancelar_restante'}
                    onChange={() => setResolutionOption('cancelar_restante')}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-200">Estornar saldo para a origem</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                      Devolve o estoque físico da diferença não recebida para a filial de origem e encerra a remessa.
                    </p>
                  </div>
                </label>

                {/* Option 3 */}
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionOption === 'perda_definitiva'}
                    onChange={() => setResolutionOption('perda_definitiva')}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <p className="font-bold text-slate-200">Registrar como perda contábil</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                      Registra perda permanente das mercadorias divergentes (extravios/danos) e finaliza o processo.
                    </p>
                  </div>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Justificativa da Resolução</label>
                <textarea
                  placeholder="Justifique por que está tomando esta decisão..."
                  rows={3}
                  value={resolutionMotivo}
                  onChange={e => setResolutionMotivo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end p-5 border-t border-slate-800 bg-slate-950/20 gap-2">
              <button
                onClick={() => setResolutionOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                disabled={loading}
                onClick={handleResolveSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/15 transition-all hover:scale-[1.02] cursor-pointer"
              >
                Concluir Resolução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONFIRMAÇÃO DE CANCELAMENTO COM MOTIVO                          */}
      {/* ========================================================================= */}
      {cancelConfirmOpen && selectedTransf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Confirmar Cancelamento</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Esta ação irá liberar as reservas ou estornar estoque físico.</p>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-300 leading-normal">
                Você tem certeza que deseja cancelar a transferência de <span className="font-bold">{selectedTransf.loja_origem_nome}</span> para <span className="font-bold">{selectedTransf.loja_destino_nome}</span>?
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo do Cancelamento</label>
                <textarea
                  placeholder="Justifique o motivo do cancelamento operacional..."
                  rows={3}
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end p-5 border-t border-slate-800 bg-slate-950/20 gap-2">
              <button
                onClick={() => setCancelConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                disabled={loading}
                onClick={handleCancelSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/15 transition-all hover:scale-[1.02] cursor-pointer"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PROGRAMAÇÃO / AGENDAMENTO DE TRANSFERÊNCIA                        */}
      {/* ========================================================================= */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Programar Transferência Automática</h3>
                <p className="text-xs text-slate-400 mt-0.5">Defina a rota, a recorrência e os produtos a serem enviados automaticamente.</p>
              </div>
              <button
                onClick={() => setScheduleOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Scroll Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Route Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Filial de Origem (Doadora)</label>
                  <select
                    value={formOrigem}
                    disabled={profile.tipo !== 'dono'}
                    onChange={e => {
                      setFormOrigem(e.target.value);
                      setFormItens([]);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">Selecione a origem...</option>
                    {lojasList.map(l => (
                      <option key={l.id} value={l.id}>{l.nome_loja}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Filial de Destino (Carente)</label>
                  <select
                    value={formDestino}
                    onChange={e => setFormDestino(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Selecione o destino...</option>
                    {lojasList.filter(l => l.id !== formOrigem).map(l => (
                      <option key={l.id} value={l.id}>{l.nome_loja}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frequência & Parâmetros Recorrência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/20 border border-slate-850">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Recorrência / Frequência</label>
                  <select
                    value={scheduleFrequencia}
                    onChange={e => setScheduleFrequencia(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="uma_vez">Uma única vez</option>
                    <option value="diario">Diário (Todos os dias)</option>
                    <option value="semanal">Semanal (Dia específico)</option>
                    <option value="mensal">Mensal (Dia do mês específico)</option>
                  </select>
                </div>

                {scheduleFrequencia === 'uma_vez' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Data do Agendamento</label>
                    <input
                      type="date"
                      value={scheduleDataAgendada}
                      onChange={e => setScheduleDataAgendada(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                  </div>
                )}

                {scheduleFrequencia === 'semanal' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Dia da Semana</label>
                    <select
                      value={scheduleDiaSemana}
                      onChange={e => setScheduleDiaSemana(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value={1}>Segunda-feira</option>
                      <option value={2}>Terça-feira</option>
                      <option value={3}>Quarta-feira</option>
                      <option value={4}>Quinta-feira</option>
                      <option value={5}>Sexta-feira</option>
                      <option value={6}>Sábado</option>
                      <option value={0}>Domingo</option>
                    </select>
                  </div>
                )}

                {scheduleFrequencia === 'mensal' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Dia do Mês</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={scheduleDiaMes}
                      onChange={e => setScheduleDiaMes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Motivo e Prioridade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Motivo</label>
                  <select
                    value={formMotivo}
                    onChange={e => setFormMotivo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="abastecimento_padrao">Abastecimento Padrão</option>
                    <option value="ruptura_urgente">Ruptura Urgente (Reposição)</option>
                    <option value="remanejamento_excesso">Remanejamento de Excesso</option>
                    <option value="demanda_sazonal">Demanda Sazonal</option>
                    <option value="campanha_marketing">Campanha de Marketing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Prioridade</label>
                  <select
                    value={formPrioridade}
                    onChange={e => setFormPrioridade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica (Urgente)</option>
                  </select>
                </div>
              </div>

              {/* Product Autocomplete Section */}
              {formOrigem ? (
                <div className="space-y-2 p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 relative">
                  <label className="text-xs font-bold text-slate-300 uppercase">Adicionar Itens do Estoque de Origem</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Pesquisar produto por nome, SKU ou Código de Barras..."
                      value={prodSearch}
                      onChange={e => setProdSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                    />
                    {prodSearching && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-blue-500 animate-spin" />
                    )}
                  </div>

                  {/* Search Dropdown Results */}
                  {prodResults.length > 0 && (
                    <div className="absolute left-4 right-4 z-30 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800/80">
                      {prodResults.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddProduct(prod)}
                          className="p-3 hover:bg-slate-800/40 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-200">{prod.nome}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {prod.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-400">{prod.estoque_disponivel} un. disponível</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Custo: R$ {prod.preco_custo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-800/40 text-center text-xs text-slate-500">
                  Selecione a filial de origem para liberar a busca de produtos do estoque.
                </div>
              )}

              {/* Selected Items List */}
              {formItens.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Itens Programados ({formItens.length})</label>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-500 font-bold border-b border-slate-800">
                          <th className="p-2.5">Produto / SKU</th>
                          <th className="p-2.5 text-center">Estoque Atual</th>
                          <th className="p-2.5 text-center w-[120px]">Qtd Enviar</th>
                          <th className="p-2.5 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {formItens.map((item, idx) => (
                          <tr key={item.produtoMestreId} className="hover:bg-slate-800/10">
                            <td className="p-2.5">
                              <p className="font-bold text-slate-200">{item.nome}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {item.sku}</p>
                            </td>
                            <td className="p-2.5 text-center font-medium text-slate-400">
                              {item.estoqueDisponivel} un.
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantidadeSolicitada}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10) || 1;
                                  setFormItens(prev => {
                                    const clone = [...prev];
                                    clone[idx].quantidadeSolicitada = val;
                                    return clone;
                                  });
                                }}
                                className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-center text-slate-200 focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => setFormItens(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Observation */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Observações do Agendamento</label>
                <textarea
                  placeholder="Informações adicionais para este agendamento recorrente..."
                  rows={2}
                  value={formObservacao}
                  onChange={e => setFormObservacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end p-5 border-t border-slate-800 bg-slate-950/20 gap-2">
              <button
                disabled={loading}
                onClick={() => setScheduleOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={loading || formItens.length === 0}
                onClick={handleScheduleSubmit}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/15 transition-all hover:scale-[1.02] cursor-pointer"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
