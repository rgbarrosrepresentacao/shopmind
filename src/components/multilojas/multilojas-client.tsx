'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { useLojaAtiva } from '@/components/providers/loja-context'
import {
  criarFilial,
  editarFilial,
  alterarStatusFilial,
  vincularUsuarioLoja,
  desvincularUsuarioLoja,
  editarGrupo
} from '@/lib/actions/multilojas'
import { GrupoEmpresarial, LojaFilial, UsuarioLoja, PerfilUsuarioLoja } from '@/lib/types/multilojas'
import {
  LayoutDashboard,
  Store,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit,
  Building2,
  Shield,
  Check,
  Power,
  Mail,
  UserPlus,
  Phone,
  Globe,
  FileText,
  AlertCircle
} from 'lucide-react'

interface MultilojasClientProps {
  grupo: GrupoEmpresarial
  lojas: LojaFilial[]
  equipe: UsuarioLoja[]
  activeStoreId: string;
}

export const MultilojasClient: React.FC<MultilojasClientProps> = ({
  grupo: initialGrupo,
  lojas: initialLojas,
  equipe: initialEquipe,
  activeStoreId
}) => {
  const router = useRouter()
  const { trocarLoja, isPending: isSwitchingStore } = useLojaAtiva()
  const [activeTab, setActiveTab] = React.useState<'overview' | 'branches' | 'team' | 'settings'>('overview')
  const [isPending, startTransition] = React.useTransition()

  // Local states to allow instant UI updates before refresh
  const [grupo, setGrupo] = React.useState<GrupoEmpresarial>(initialGrupo)
  const [lojas, setLojas] = React.useState<LojaFilial[]>(initialLojas)
  const [equipe, setEquipe] = React.useState<UsuarioLoja[]>(initialEquipe)

  // Sync state if server props change
  React.useEffect(() => {
    setGrupo(initialGrupo)
    setLojas(initialLojas)
    setEquipe(initialEquipe)
  }, [initialGrupo, initialLojas, initialEquipe])

  // Modals state
  const [isBranchModalOpen, setIsBranchModalOpen] = React.useState(false)
  const [editingBranch, setEditingBranch] = React.useState<LojaFilial | null>(null)
  const [isTeamModalOpen, setIsTeamModalOpen] = React.useState(false)

  // Branch Form state
  const [branchName, setBranchName] = React.useState('')
  const [branchSlug, setBranchSlug] = React.useState('')
  const [branchCnpj, setBranchCnpj] = React.useState('')
  const [branchTelefone, setBranchTelefone] = React.useState('')
  const [branchWhatsapp, setBranchWhatsapp] = React.useState('')
  const [branchEmail, setBranchEmail] = React.useState('')
  const [branchCodigoInterno, setBranchCodigoInterno] = React.useState('')
  const [branchCorPrimaria, setBranchCorPrimaria] = React.useState('#8b5cf6')

  // Extended Branch Form states
  const [branchTipo, setBranchTipo] = React.useState<'matriz' | 'filial' | 'deposito' | 'ecommerce' | 'escritorio'>('filial')
  const [branchLogoUrl, setBranchLogoUrl] = React.useState('')
  const [branchStatus, setBranchStatus] = React.useState<'ativo' | 'inativo'>('ativo')
  const [branchLogradouro, setBranchLogradouro] = React.useState('')
  const [branchNumero, setBranchNumero] = React.useState('')
  const [branchComplemento, setBranchComplemento] = React.useState('')
  const [branchBairro, setBranchBairro] = React.useState('')
  const [branchCep, setBranchCep] = React.useState('')
  const [branchCidade, setBranchCidade] = React.useState('')
  const [branchEstado, setBranchEstado] = React.useState('')
  const [branchResponsavel, setBranchResponsavel] = React.useState('')

  // Team Form state
  const [teamEmail, setTeamEmail] = React.useState('')
  const [teamLojaId, setTeamLojaId] = React.useState('')
  const [teamPerfil, setTeamPerfil] = React.useState<PerfilUsuarioLoja>('gerente')
  const [teamAcessoTodasLojas, setTeamAcessoTodasLojas] = React.useState(false)

  // Group Form state
  const [groupName, setGroupName] = React.useState(grupo.nome)
  const [groupLogo, setGroupLogo] = React.useState(grupo.logo_url || '')

  // Set up forms when editing
  const handleOpenEditBranch = (branch: LojaFilial) => {
    setEditingBranch(branch)
    setBranchName(branch.nome_loja)
    setBranchSlug(branch.slug)
    setBranchCnpj(branch.cnpj || '')
    setBranchTelefone(branch.telefone || '')
    setBranchWhatsapp(branch.whatsapp || '')
    setBranchEmail(branch.email || '')
    setBranchCodigoInterno(branch.codigo_interno || '')
    setBranchCorPrimaria(branch.cor_primaria || '#8b5cf6')
    
    // New fields
    setBranchTipo((branch.tipo_unidade as any) || 'filial')
    setBranchLogoUrl(branch.logo_url || '')
    setBranchStatus(branch.status || 'ativo')
    
    const addr = branch.endereco || {}
    setBranchLogradouro(addr.logradouro || '')
    setBranchNumero(addr.numero || '')
    setBranchComplemento(addr.complemento || '')
    setBranchBairro(addr.bairro || '')
    setBranchCep(addr.cep || '')
    setBranchCidade(addr.cidade || '')
    setBranchEstado(addr.estado || '')
    setBranchResponsavel(addr.responsavel || '')
    
    setIsBranchModalOpen(true)
  }

  const handleOpenCreateBranch = () => {
    setEditingBranch(null)
    setBranchName('')
    setBranchSlug('')
    setBranchCnpj('')
    setBranchTelefone('')
    setBranchWhatsapp('')
    setBranchEmail('')
    setBranchCodigoInterno('')
    setBranchCorPrimaria('#8b5cf6')
    
    // New fields
    setBranchTipo('filial')
    setBranchLogoUrl('')
    setBranchStatus('ativo')
    setBranchLogradouro('')
    setBranchNumero('')
    setBranchComplemento('')
    setBranchBairro('')
    setBranchCep('')
    setBranchCidade('')
    setBranchEstado('')
    setBranchResponsavel('')
    
    setIsBranchModalOpen(true)
  }

  // Auto-slugify
  const handleNameChange = (val: string) => {
    setBranchName(val)
    if (!editingBranch) {
      const slugified = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      setBranchSlug(slugified)
    }
  }

  // ============================================
  // HANDLERS (CRUD & Actions)
  // ============================================

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchName || branchName.trim().length < 2) {
      toast.error('O nome da filial deve ter pelo menos 2 caracteres.')
      return
    }
    if (!branchSlug || branchSlug.trim().length < 3) {
      toast.error('O slug deve ter pelo menos 3 caracteres.')
      return
    }

    const inputData = {
      nome_loja: branchName,
      slug: branchSlug,
      cnpj: branchCnpj || null,
      telefone: branchTelefone || null,
      whatsapp: branchWhatsapp || null,
      email: branchEmail || null,
      codigo_interno: branchCodigoInterno || null,
      cor_primaria: branchCorPrimaria,
      tipo_unidade: branchTipo,
      logo_url: branchLogoUrl || null,
      status: branchStatus,
      endereco: {
        logradouro: branchLogradouro || undefined,
        numero: branchNumero || undefined,
        complemento: branchComplemento || undefined,
        bairro: branchBairro || undefined,
        cep: branchCep || undefined,
        cidade: branchCidade || undefined,
        estado: branchEstado || undefined,
        responsavel: branchResponsavel || undefined
      }
    }

    startTransition(async () => {
      if (editingBranch) {
        // Edit
        const res = await editarFilial(editingBranch.id, inputData)

        if (res.success) {
          toast.success('Filial atualizada com sucesso!')
          setIsBranchModalOpen(false)
          router.refresh()
        } else {
          toast.error(res.error || 'Erro ao editar filial.')
        }
      } else {
        // Create
        const res = await criarFilial(inputData)

        if (res.success) {
          toast.success('Nova filial criada com sucesso!')
          setIsBranchModalOpen(false)
          router.refresh()
        } else {
          toast.error(res.error || 'Erro ao criar filial.')
        }
      }
    })
  }

  const handleToggleBranchStatus = async (id: string, currentStatus: 'ativo' | 'inativo') => {
    const nextStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo'
    const confirmMsg = nextStatus === 'inativo' 
      ? 'Tem certeza de que deseja DESATIVAR esta filial? Usuários sem acesso global não poderão entrar nela.'
      : 'Deseja reativar esta filial?'

    if (!confirm(confirmMsg)) return

    startTransition(async () => {
      const res = await alterarStatusFilial(id, nextStatus)
      if (res.success) {
        toast.success(`Filial ${nextStatus === 'ativo' ? 'reativada' : 'desativada'} com sucesso!`)
        router.refresh()
      } else {
        toast.error(res.error || 'Erro ao alterar status da filial.')
      }
    })
  }

  const handleSaveTeamLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamEmail || !teamEmail.includes('@')) {
      toast.error('Informe um e-mail válido.')
      return
    }
    if (!teamLojaId) {
      toast.error('Selecione uma loja.')
      return
    }

    startTransition(async () => {
      const res = await vincularUsuarioLoja(teamEmail, teamLojaId, teamPerfil, teamAcessoTodasLojas)
      if (res.success) {
        toast.success('Colaborador vinculado com sucesso!')
        setIsTeamModalOpen(false)
        setTeamEmail('')
        setTeamLojaId('')
        setTeamAcessoTodasLojas(false)
        router.refresh()
      } else {
        toast.error(res.error || 'Erro ao vincular colaborador.')
      }
    })
  }

  const handleRemoveTeamLink = async (userId: string, lojaId: string, userName: string) => {
    if (!confirm(`Deseja realmente remover o acesso de ${userName} a esta loja?`)) return

    startTransition(async () => {
      const res = await desvincularUsuarioLoja(userId, lojaId)
      if (res.success) {
        toast.success('Acesso removido com sucesso!')
        router.refresh()
      } else {
        toast.error(res.error || 'Erro ao remover acesso.')
      }
    })
  }

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName || groupName.trim().length < 3) {
      toast.error('O nome do grupo empresarial deve ter pelo menos 3 caracteres.')
      return
    }

    startTransition(async () => {
      const res = await editarGrupo(groupName, groupLogo)
      if (res.success) {
        toast.success('Grupo empresarial atualizado com sucesso!')
        router.refresh()
      } else {
        toast.error(res.error || 'Erro ao salvar configurações do grupo.')
      }
    })
  }

  const handleConnectStore = async (id: string) => {
    await trocarLoja(id)
  }

  // Metrics calculations
  const totalLojas = lojas.length
  const totalEquipe = Array.from(new Set(equipe.map(u => u.usuario_id))).length
  const matrizLoja = lojas.find(l => l.tipo_unidade === 'matriz')
  const filiaisLojas = lojas.filter(l => l.tipo_unidade === 'filial')

  const presetColors = [
    { name: 'Roxo ShopMind', value: '#8b5cf6' },
    { name: 'Azul Premium', value: '#3b82f6' },
    { name: 'Esmeralda Clean', value: '#10b981' },
    { name: 'Rosa Vibrante', value: '#ec4899' },
    { name: 'Âmbar Dourado', value: '#f59e0b' }
  ]

  return (
    <div className="space-y-6 select-none">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/10 overflow-hidden">
            {grupo.logo_url ? (
              <img src={grupo.logo_url} alt={grupo.nome} className="w-full h-full object-cover animate-fade-in" />
            ) : (
              <Building2 size={24} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{grupo.nome}</h1>
              <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30 text-[10px] font-bold">
                HOLDING
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Painel Corporativo de Gestão Multi-Lojas e Governança
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'branches' && (
            <button
              onClick={handleOpenCreateBranch}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>Nova Filial</span>
            </button>
          )}
          {activeTab === 'team' && (
            <button
              onClick={() => {
                setTeamEmail('')
                setTeamLojaId(lojas[0]?.id || '')
                setTeamPerfil('gerente')
                setTeamAcessoTodasLojas(false)
                setIsTeamModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <UserPlus size={14} />
              <span>Vincular Colaborador</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-border/40 max-w-2xl">
        {[
          { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
          { id: 'branches', label: 'Filiais (CRUD)', icon: Store },
          { id: 'team', label: 'Equipe & Permissões', icon: Users },
          { id: 'settings', label: 'Configurações do Grupo', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                isActive 
                  ? "bg-slate-900 text-white border border-border/30 shadow-md shadow-black/30" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon size={14} className={isActive ? "text-violet-400" : ""} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: VISÃO GERAL */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-card/40 border border-border/50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lojas Ativas</p>
              <p className="text-2xl font-black text-slate-100 mt-2 flex items-baseline gap-1">
                {totalLojas} <span className="text-xs text-slate-500">/ {grupo.max_lojas}</span>
              </p>
              <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-violet-500 h-full rounded-full transition-all" 
                  style={{ width: `${(totalLojas / grupo.max_lojas) * 100}%` }}
                />
              </div>
            </div>

            <div className="p-5 bg-card/40 border border-border/50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unidade Matriz</p>
              <p className="text-lg font-bold text-slate-100 mt-2 truncate">
                {matrizLoja?.nome_loja || 'Nenhuma'}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Sede Administrativa Principal</p>
            </div>

            <div className="p-5 bg-card/40 border border-border/50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filiais Ativas</p>
              <p className="text-2xl font-black text-slate-100 mt-2">
                {filiaisLojas.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Unidades secundárias de venda</p>
            </div>

            <div className="p-5 bg-card/40 border border-border/50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total de Colaboradores</p>
              <p className="text-2xl font-black text-slate-100 mt-2">
                {totalEquipe}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Pessoas com acessos a lojas</p>
            </div>
          </div>

          {/* Quick Connect Store List */}
          <div className="bg-card/40 border border-border/50 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex justify-between items-center bg-muted/10">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Alternar Conectividade</h3>
                <p className="text-xs text-slate-500 mt-0.5">Mude de loja instantaneamente mantendo o isolamento de dados.</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                POLÍTICAS RLS ATIVAS
              </Badge>
            </div>

            <div className="divide-y divide-border/40">
              {lojas.map((store) => {
                const isActive = store.id === activeStoreId
                const storeInitials = store.nome_loja
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                return (
                  <div 
                    key={store.id} 
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-all duration-200",
                      isActive ? "bg-violet-500/5" : "hover:bg-slate-900/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm",
                        isActive 
                          ? "bg-gradient-to-tr from-violet-600 to-indigo-500 text-white" 
                          : "bg-slate-800 text-slate-400"
                      )}>
                        {storeInitials}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-200">{store.nome_loja}</h4>
                          <span className={cn(
                            "text-[8px] px-1 py-0.25 rounded font-bold uppercase tracking-wider",
                            store.tipo_unidade === 'matriz' ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400"
                          )}>
                            {store.tipo_unidade === 'matriz' ? 'Matriz' : 'Filial'}
                          </span>
                          
                          {store.status === 'inativo' && (
                            <span className="text-[8px] px-1 py-0.25 rounded font-bold bg-destructive/10 text-destructive uppercase tracking-wider">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                          {store.cnpj && <span>CNPJ: {store.cnpj}</span>}
                          {store.codigo_interno && (
                            <>
                              <span>•</span>
                              <span>Código: {store.codigo_interno}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/30 px-3 py-1.5 rounded-lg">
                          <Check size={14} />
                          Loja Conectada
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnectStore(store.id)}
                          disabled={store.status === 'inativo' || isSwitchingStore}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer active:scale-95",
                            store.status === 'inativo'
                              ? "bg-slate-900 border-border/30 text-slate-600 cursor-not-allowed"
                              : "bg-slate-900 border-border/80 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-primary/40"
                          )}
                        >
                          Entrar na Loja
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: FILIAIS (CRUD) */}
      {/* ========================================================================= */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {lojas.map((branch) => {
            const initials = branch.nome_loja
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            const isMatriz = branch.tipo_unidade === 'matriz'

            const labelTipo = branch.tipo_unidade === 'matriz' 
              ? 'Matriz'
              : branch.tipo_unidade === 'deposito'
              ? 'Depósito'
              : branch.tipo_unidade === 'ecommerce'
              ? 'E-Commerce'
              : branch.tipo_unidade === 'escritorio'
              ? 'Escritório'
              : 'Filial'

            const badgeColor = branch.tipo_unidade === 'matriz'
              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
              : branch.tipo_unidade === 'deposito'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : branch.tipo_unidade === 'ecommerce'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : branch.tipo_unidade === 'escritorio'
              ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'

            return (
              <div 
                key={branch.id} 
                className={cn(
                  "bg-card/40 border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col hover:border-border/80 group",
                  branch.status === 'inativo' ? "border-destructive/20 opacity-60" : "border-border/50"
                )}
              >
                {/* Visual Header card color block */}
                <div 
                  className="h-2.5 w-full transition-colors" 
                  style={{ backgroundColor: branch.cor_primaria || '#8b5cf6' }}
                />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Top line info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {branch.logo_url ? (
                        <img 
                          src={branch.logo_url} 
                          alt={branch.nome_loja} 
                          className="w-9 h-9 rounded-lg object-cover shadow-sm border border-border/40"
                        />
                      ) : (
                        <div 
                          className="w-9 h-9 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-sm"
                          style={{ backgroundColor: branch.cor_primaria || '#8b5cf6' }}
                        >
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-100 group-hover:text-violet-400 transition-colors">
                          {branch.nome_loja}
                        </h4>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          slug: {branch.slug}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 items-end">
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border",
                        badgeColor
                      )}>
                        {labelTipo}
                      </span>
                      {branch.status === 'inativo' ? (
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wider">
                          Inativa
                        </span>
                      ) : (
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                          Ativa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address Section */}
                  {branch.endereco && (branch.endereco.logradouro || branch.endereco.cidade) && (
                    <div className="flex flex-col gap-0.5 text-slate-400 mt-3 text-[10px] bg-slate-950/40 p-2.5 rounded-lg border border-border/30">
                      <span className="font-bold text-slate-500 uppercase text-[8px] tracking-wider">Endereço</span>
                      <p className="line-clamp-2 leading-tight">
                        {branch.endereco.logradouro || ''}
                        {branch.endereco.numero ? `, ${branch.endereco.numero}` : ''}
                        {branch.endereco.complemento ? ` - ${branch.endereco.complemento}` : ''}
                      </p>
                      <p className="truncate">
                        {branch.endereco.bairro ? `${branch.endereco.bairro} • ` : ''}
                        {branch.endereco.cidade ? `${branch.endereco.cidade}/${branch.endereco.estado || ''}` : ''}
                      </p>
                      {branch.endereco.cep && <p className="text-slate-500 mt-0.5">CEP: {branch.endereco.cep}</p>}
                    </div>
                  )}

                  {/* Branch Details */}
                  <div className="mt-5 space-y-2 text-xs border-y border-border/40 py-4 flex-1">
                    {branch.endereco?.responsavel && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[10px] font-medium uppercase">Responsável</span>
                        <span className="text-slate-300 font-semibold">{branch.endereco.responsavel}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[10px] font-medium uppercase">Código Interno</span>
                      <span className="text-slate-300 font-semibold">{branch.codigo_interno || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[10px] font-medium uppercase">CNPJ</span>
                      <span className="text-slate-300 font-semibold">{branch.cnpj || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[10px] font-medium uppercase">Telefone</span>
                      <span className="text-slate-300 font-semibold">{branch.telefone || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[10px] font-medium uppercase">Email</span>
                      <span className="text-slate-300 font-semibold truncate max-w-[150px]">{branch.email || '—'}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditBranch(branch)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-border/50 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95"
                    >
                      <Edit size={12} />
                      <span>Editar</span>
                    </button>

                    {!isMatriz && (
                      <button
                        onClick={() => handleToggleBranchStatus(branch.id, branch.status)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer active:scale-95",
                          branch.status === 'ativo'
                            ? "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                        )}
                      >
                        <Power size={12} />
                        <span>{branch.status === 'ativo' ? 'Desativar' : 'Ativar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: EQUIPE & PERMISSÕES */}
      {/* ========================================================================= */}
      {activeTab === 'team' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-card/40 border border-border/50 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 bg-muted/10 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Acessos da Equipe</h3>
                <p className="text-xs text-slate-500 mt-0.5">Usuários vinculados e suas atribuições de cargos por filial.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900/20">
                    <th className="px-5 py-3">Colaborador</th>
                    <th className="px-5 py-3">Unidade Vinculada</th>
                    <th className="px-5 py-3">Perfil / Função</th>
                    <th className="px-5 py-3">Acesso Global</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {equipe.map((member) => {
                    const profileLabel = member.perfil === 'dono' 
                      ? 'Dono / Administrador'
                      : member.perfil === 'gerente'
                      ? 'Gerente'
                      : member.perfil === 'caixa'
                      ? 'Operador de Caixa'
                      : 'Operador de Estoque'

                    const isDono = member.perfil === 'dono'

                    return (
                      <tr key={member.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-border flex items-center justify-center font-bold text-[10px] text-slate-400 uppercase">
                              {member.usuario?.nome ? member.usuario.nome.substring(0, 2) : 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200">{member.usuario?.nome || 'Convidado'}</p>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Mail size={10} />
                                {member.usuario?.email || member.usuario_id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-300">
                          <span className="flex items-center gap-1">
                            <Store size={12} className="text-slate-500" />
                            {member.loja?.nome_loja || member.loja_id}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border",
                            isDono 
                              ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                              : member.perfil === 'gerente'
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-slate-800 text-slate-400 border-border/40"
                          )}>
                            {profileLabel}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {member.acesso_todas_lojas ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              Sim (Todas Lojas)
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                              Não (Restrito)
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {!isDono && (
                            <button
                              onClick={() => handleRemoveTeamLink(
                                member.usuario_id,
                                member.loja_id,
                                member.usuario?.nome || 'colaborador'
                              )}
                              className="p-1.5 hover:bg-destructive/10 text-destructive/80 hover:text-destructive rounded-lg border border-transparent hover:border-destructive/20 transition-all cursor-pointer active:scale-90 inline-flex items-center"
                              title="Remover acesso a esta filial"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: CONFIGURAÇÕES DO GRUPO */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-card/40 border border-border/50 rounded-2xl p-6 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-violet-400" />
            Dados Corporativos do Grupo
          </h3>

          <form onSubmit={handleSaveGroup} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Nome da Holding / Grupo Empresarial
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                placeholder="Ex: Grupo Empresarial Bella"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                URL da Logomarca Corporativa (Opcional)
              </label>
              <input
                type="text"
                value={groupLogo}
                onChange={(e) => setGroupLogo(e.target.value)}
                className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                placeholder="Ex: https://shopmind.com/logo-holding.png"
              />
            </div>

            <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-violet-400 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold text-slate-200">Parâmetros de Licenciamento SaaS</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Seu limite atual é de <strong className="text-slate-200">{grupo.max_lojas} lojas</strong>.
                  Para criar mais filiais além deste limite, entre em contato com o suporte corporativo.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR FILIAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title={editingBranch ? 'Editar Filial' : 'Adicionar Nova Filial'}
        description={
          editingBranch 
            ? 'Atualize os dados e a identidade desta unidade do grupo.' 
            : 'Registre uma nova unidade filial sob a hierarquia do seu grupo.'
        }
        size="lg"
      >
        <form onSubmit={handleSaveBranch} className="space-y-5">
          {/* SEÇÃO 1: IDENTIFICAÇÃO DA UNIDADE */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest border-b border-border/40 pb-1">
              1. Identificação da Unidade
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nome da Unidade *
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="Ex: Bella Hair Filial Centro"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Slug (Identificador URL) *
                </label>
                <input
                  type="text"
                  value={branchSlug}
                  onChange={(e) => setBranchSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  required
                  placeholder="ex-bella-hair-filial-centro"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tipo de Unidade *
                </label>
                <select
                  value={branchTipo}
                  onChange={(e) => setBranchTipo(e.target.value as any)}
                  required
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="filial">Filial (Vendas)</option>
                  <option value="matriz">Matriz (Administração)</option>
                  <option value="deposito">Depósito / Estoque</option>
                  <option value="ecommerce">E-Commerce</option>
                  <option value="escritorio">Escritório</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Código Interno
                </label>
                <input
                  type="text"
                  value={branchCodigoInterno}
                  onChange={(e) => setBranchCodigoInterno(e.target.value)}
                  placeholder="Ex: BELLA-CENTRO-01"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={branchCnpj}
                  onChange={(e) => setBranchCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Gestor Responsável
                </label>
                <input
                  type="text"
                  value={branchResponsavel}
                  onChange={(e) => setBranchResponsavel(e.target.value)}
                  placeholder="Nome do responsável pela filial"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  URL da Logomarca (Opcional)
                </label>
                <input
                  type="text"
                  value={branchLogoUrl}
                  onChange={(e) => setBranchLogoUrl(e.target.value)}
                  placeholder="https://suaimagem.com/logo.png"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: CONTATO E COMUNICAÇÃO */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest border-b border-border/40 pb-1">
              2. Contato e Comunicação
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Telefone Fixo
                </label>
                <input
                  type="text"
                  value={branchTelefone}
                  onChange={(e) => setBranchTelefone(e.target.value)}
                  placeholder="(00) 0000-0000"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  WhatsApp Comercial
                </label>
                <input
                  type="text"
                  value={branchWhatsapp}
                  onChange={(e) => setBranchWhatsapp(e.target.value)}
                  placeholder="(00) 90000-0000"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  E-mail da Unidade
                </label>
                <input
                  type="email"
                  value={branchEmail}
                  onChange={(e) => setBranchEmail(e.target.value)}
                  placeholder="centro@grupobella.com"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: ENDEREÇO E LOCALIZAÇÃO */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest border-b border-border/40 pb-1">
              3. Endereço e Localização
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  CEP
                </label>
                <input
                  type="text"
                  value={branchCep}
                  onChange={(e) => setBranchCep(e.target.value)}
                  placeholder="00000-000"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Logradouro (Rua/Avenida)
                </label>
                <input
                  type="text"
                  value={branchLogradouro}
                  onChange={(e) => setBranchLogradouro(e.target.value)}
                  placeholder="Rua das Flores"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Número
                </label>
                <input
                  type="text"
                  value={branchNumero}
                  onChange={(e) => setBranchNumero(e.target.value)}
                  placeholder="123"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  value={branchComplemento}
                  onChange={(e) => setBranchComplemento(e.target.value)}
                  placeholder="Sala 402"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Bairro
                </label>
                <input
                  type="text"
                  value={branchBairro}
                  onChange={(e) => setBranchBairro(e.target.value)}
                  placeholder="Centro"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  value={branchCidade}
                  onChange={(e) => setBranchCidade(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Estado
                </label>
                <input
                  type="text"
                  value={branchEstado}
                  onChange={(e) => setBranchEstado(e.target.value)}
                  placeholder="SP"
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: CONFIGURAÇÕES VISUAIS E STATUS */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest border-b border-border/40 pb-1">
              4. Identidade Visual & Status
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Cor de Identidade da Unidade
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setBranchCorPrimaria(color.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer",
                        branchCorPrimaria === color.value 
                          ? "bg-slate-950 text-white border-slate-700" 
                          : "bg-slate-900/50 text-slate-400 border-transparent hover:border-border/30"
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.value }} />
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Status da Unidade
                </label>
                <select
                  value={branchStatus}
                  onChange={(e) => setBranchStatus(e.target.value as any)}
                  required
                  className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="ativo">Ativa (Acesso Permitido)</option>
                  <option value="inativo">Inativa (Bloqueada)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsBranchModalOpen(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-border/60 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPending ? 'Salvando...' : 'Salvar Filial'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: VINCULAR COLABORADOR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        title="Vincular Colaborador a Filial"
        description="Vincule um usuário do sistema a uma filial específica do grupo com uma atribuição de função."
        size="md"
      >
        <form onSubmit={handleSaveTeamLink} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              E-mail do Colaborador *
            </label>
            <input
              type="email"
              required
              value={teamEmail}
              onChange={(e) => setTeamEmail(e.target.value)}
              placeholder="colaborador@shopmind.com"
              className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">
              O usuário já deve ter uma conta cadastrada no ShopMind.
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Filial Vinculada *
            </label>
            <select
              required
              value={teamLojaId}
              onChange={(e) => setTeamLojaId(e.target.value)}
              className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 transition-colors"
            >
              <option value="" disabled>Selecione uma loja...</option>
              {lojas.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nome_loja} ({l.tipo_unidade === 'matriz' ? 'Matriz' : 'Filial'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Perfil / Cargo *
              </label>
              <select
                required
                value={teamPerfil}
                onChange={(e) => setTeamPerfil(e.target.value as any)}
                className="w-full bg-slate-950 border border-border/60 hover:border-border rounded-lg px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-violet-500 transition-colors"
              >
                <option value="gerente">Gerente</option>
                <option value="caixa">Operador de Caixa</option>
                <option value="estoquista">Operador de Estoque</option>
              </select>
            </div>

            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={teamAcessoTodasLojas}
                  onChange={(e) => setTeamAcessoTodasLojas(e.target.checked)}
                  className="rounded border-border bg-slate-950 text-violet-600 focus:ring-violet-500/20"
                />
                <span className="text-xs font-bold text-slate-300">Acesso a todas as lojas</span>
              </label>
              <span className="text-[8px] text-slate-500 mt-1 block pl-6">
                Permite alternar entre filiais sem vínculos individuais.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-border/60 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPending ? 'Vinculando...' : 'Vincular Membro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
