"use client"

import * as React from "react"
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Building2,
  Lock,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Send,
  MoreVertical,
  Activity,
  ToggleLeft,
  ToggleRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils/cn"
import { createClient } from "@/lib/supabase/client"
import {
  getUsuariosDoGrupo,
  criarColaborador,
  vincularUsuarioLoja,
  desvincularUsuarioLoja,
  alterarStatusColaborador,
  alterarCargoColaboradorLoja,
  redefinirSenhaColaborador
} from "@/lib/actions/multilojas"
import type { GrupoEmpresarial, LojaFilial, UsuarioLoja, PerfilUsuarioLoja } from "@/lib/types/multilojas"

interface UsuariosClientProps {
  grupo: GrupoEmpresarial
  lojas: LojaFilial[]
  equipe: UsuarioLoja[]
  activeStoreId: string
}

interface ColaboradorAgrupado {
  id: string
  nome: string
  email: string
  status: string
  vinculos: {
    loja_id: string
    nome_loja: string
    perfil: string
    acesso_todas_lojas: boolean
    ativo: boolean
  }[]
}

export const UsuariosClient: React.FC<UsuariosClientProps> = ({
  grupo,
  lojas,
  equipe: initialEquipe,
  activeStoreId
}) => {
  // 1. Estados
  const [mounted, setMounted] = React.useState(false)
  const [equipe, setEquipe] = React.useState<UsuarioLoja[]>(initialEquipe)
  const [loadingSilently, setLoadingSilently] = React.useState(false)

  // Modais
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [selectedColab, setSelectedColab] = React.useState<ColaboradorAgrupado | null>(null)

  // Formulário de Criação
  const [createForm, setCreateForm] = React.useState({
    nome: "",
    email: "",
    telefone: "",
    senhaProvisoria: "",
    cargo: "caixa" as PerfilUsuarioLoja,
    lojaId: activeStoreId,
    lojasAdicionais: [] as string[]
  })
  const [submittingCreate, setSubmittingCreate] = React.useState(false)

  // Formulário de Vínculo de Filial (Edição)
  const [newVinculoForm, setNewVinculoForm] = React.useState({
    lojaId: "",
    cargo: "caixa" as PerfilUsuarioLoja
  })
  const [submittingVinculo, setSubmittingVinculo] = React.useState(false)

  // 2. Agrupamento de Colaboradores por ID
  const colaboradores: ColaboradorAgrupado[] = React.useMemo(() => {
    const agrupados: ColaboradorAgrupado[] = []
    equipe.forEach(vinculo => {
      const u = vinculo.usuario as any
      if (!u) return

      const userId = vinculo.usuario_id
      const userNome = u.nome || "Sem Nome"
      const userEmail = u.email || ""
      const userStatus = u.status || (vinculo.ativo ? "ativo" : "inativo")

      let colab = agrupados.find(c => c.id === userId)
      if (!colab) {
        colab = {
          id: userId,
          nome: userNome,
          email: userEmail,
          status: userStatus,
          vinculos: []
        }
        agrupados.push(colab)
      }

      // Evita duplicatas de vínculo se existirem
      const vinculoExistente = colab.vinculos.find(v => v.loja_id === vinculo.loja_id)
      if (!vinculoExistente) {
        colab.vinculos.push({
          loja_id: vinculo.loja_id,
          nome_loja: vinculo.loja?.nome_loja || "Filial",
          perfil: vinculo.perfil,
          acesso_todas_lojas: vinculo.acesso_todas_lojas,
          ativo: vinculo.ativo
        })
      }
    })
    return agrupados
  }, [equipe])

  // 3. Métricas de Usuários
  const metrics = React.useMemo(() => {
    const total = colaboradores.length
    const ativos = colaboradores.filter(c => c.status === "ativo").length
    const bloqueados = total - ativos
    const donos = colaboradores.filter(c => c.vinculos.some(v => v.perfil === "dono")).length
    const gerentes = colaboradores.filter(c => c.vinculos.some(v => v.perfil === "gerente")).length
    const caixas = colaboradores.filter(c => c.vinculos.some(v => v.perfil === "caixa")).length
    const estoquistas = colaboradores.filter(c => c.vinculos.some(v => v.perfil === "estoquista")).length
    const financeiros = colaboradores.filter(c => c.vinculos.some(v => v.perfil === "financeiro")).length

    return { total, ativos, bloqueados, donos, gerentes, caixas, estoquistas, financeiros }
  }, [colaboradores])

  // 4. Refresh Reativo de Dados
  const refreshEquipe = React.useCallback(async () => {
    setLoadingSilently(true)
    try {
      const data = await getUsuariosDoGrupo()
      setEquipe(data)
    } catch (err) {
      console.error("Erro ao recarregar equipe:", err)
    } finally {
      setLoadingSilently(false)
    }
  }, [])

  // 5. Efeito Realtime (WebSockets)
  React.useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    let debounceTimer: NodeJS.Timeout

    const handleDatabaseChange = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        refreshEquipe()
      }, 1500)
    }

    const channel = supabase
      .channel("equipe-realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "usuario_lojas" }, handleDatabaseChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "usuarios" }, handleDatabaseChange)
      .subscribe()

    return () => {
      clearTimeout(debounceTimer)
      channel.unsubscribe()
    }
  }, [refreshEquipe])

  // 6. Submissão de Criação de Colaborador
  const handleCreateColaborador = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingCreate) return

    if (!createForm.nome.trim() || !createForm.email.trim() || !createForm.senhaProvisoria.trim()) {
      toast.error("Preencha todos os campos obrigatórios.")
      return
    }

    setSubmittingCreate(true)
    try {
      // 1. Criar usuário e vínculo inicial
      const res = await criarColaborador({
        nome: createForm.nome.trim(),
        email: createForm.email.trim().toLowerCase(),
        telefone: createForm.telefone.trim() || undefined,
        senhaProvisoria: createForm.senhaProvisoria,
        cargo: createForm.cargo,
        lojaId: createForm.lojaId
      })

      if (res.success) {
        // 2. Se houver filiais adicionais selecionadas, vincula o usuário a elas também
        if (createForm.lojasAdicionais.length > 0) {
          await Promise.all(
            createForm.lojasAdicionais.map(lojaId =>
              vincularUsuarioLoja(createForm.email.trim().toLowerCase(), lojaId, createForm.cargo, false)
            )
          )
        }

        toast.success("Colaborador registrado e integrado à holding com sucesso!")
        setCreateModalOpen(false)
        // Reset form
        setCreateForm({
          nome: "",
          email: "",
          telefone: "",
          senhaProvisoria: "",
          cargo: "caixa",
          lojaId: activeStoreId,
          lojasAdicionais: []
        })
        refreshEquipe()
      } else {
        toast.error(res.error || "Erro ao registrar colaborador.")
      }
    } catch (err: any) {
      toast.error(err.message || "Erro de rede.")
    } finally {
      setSubmittingCreate(false)
    }
  }

  // 7. Adicionar novo vínculo à filial (no modal de edição)
  const handleAddVinculo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedColab || submittingVinculo) return
    if (!newVinculoForm.lojaId) {
      toast.error("Selecione uma filial para vincular.")
      return
    }

    setSubmittingVinculo(true)
    try {
      const res = await vincularUsuarioLoja(
        selectedColab.email,
        newVinculoForm.lojaId,
        newVinculoForm.cargo,
        false
      )

      if (res.success) {
        toast.success("Nova filial vinculada ao colaborador!")
        setNewVinculoForm(prev => ({ ...prev, lojaId: "" }))
        // Recarregar os vínculos locais para atualizar o modal de edição imediatamente
        const updatedEquipe = await getUsuariosDoGrupo()
        setEquipe(updatedEquipe)
        
        // Atualizar o selecionado
        const updatedColab = agrupadosPeloId(updatedEquipe).find(c => c.id === selectedColab.id)
        if (updatedColab) setSelectedColab(updatedColab)
      } else {
        toast.error(res.error || "Falha ao vincular filial.")
      }
    } catch (err: any) {
      toast.error(err.message || "Erro interno.")
    } finally {
      setSubmittingVinculo(false)
    }
  }

  // Helper local para agrupar
  const agrupadosPeloId = (lista: UsuarioLoja[]): ColaboradorAgrupado[] => {
    const agrupados: ColaboradorAgrupado[] = []
    lista.forEach(vinculo => {
      const u = vinculo.usuario as any
      if (!u) return
      const userId = vinculo.usuario_id
      let colab = agrupados.find(c => c.id === userId)
      if (!colab) {
        colab = {
          id: userId,
          nome: u.nome || "Sem Nome",
          email: u.email || "",
          status: u.status || (vinculo.ativo ? "ativo" : "inativo"),
          vinculos: []
        }
        agrupados.push(colab)
      }
      colab.vinculos.push({
        loja_id: vinculo.loja_id,
        nome_loja: vinculo.loja?.nome_loja || "Filial",
        perfil: vinculo.perfil,
        acesso_todas_lojas: vinculo.acesso_todas_lojas,
        ativo: vinculo.ativo
      })
    })
    return agrupados
  }

  // Remover vínculo de filial do colaborador
  const handleRemoveVinculo = async (lojaId: string) => {
    if (!selectedColab) return
    if (selectedColab.vinculos.length <= 1) {
      toast.error("O colaborador precisa estar vinculado a pelo menos uma filial.")
      return
    }

    try {
      const res = await desvincularUsuarioLoja(selectedColab.id, lojaId)
      if (res.success) {
        toast.success("Vínculo removido com sucesso!")
        const updatedEquipe = await getUsuariosDoGrupo()
        setEquipe(updatedEquipe)

        const updatedColab = agrupadosPeloId(updatedEquipe).find(c => c.id === selectedColab.id)
        if (updatedColab) setSelectedColab(updatedColab)
      } else {
        toast.error(res.error || "Erro ao remover vínculo.")
      }
    } catch (err) {
      toast.error("Erro interno ao desvincular.")
    }
  }

  // Alterar cargo por filial
  const handleChangeCargoLoja = async (lojaId: string, cargo: PerfilUsuarioLoja) => {
    if (!selectedColab) return
    try {
      const res = await alterarCargoColaboradorLoja(selectedColab.id, lojaId, cargo)
      if (res.success) {
        toast.success("Cargo da filial atualizado com sucesso!")
        const updatedEquipe = await getUsuariosDoGrupo()
        setEquipe(updatedEquipe)

        const updatedColab = agrupadosPeloId(updatedEquipe).find(c => c.id === selectedColab.id)
        if (updatedColab) setSelectedColab(updatedColab)
      } else {
        toast.error(res.error || "Falha ao alterar cargo.")
      }
    } catch (err) {
      toast.error("Erro de comunicação.")
    }
  }

  // Bloquear / Ativar Colaborador de vez
  const handleToggleStatus = async (colab: ColaboradorAgrupado) => {
    const novoStatus = colab.status === "ativo" ? "inativo" : "ativo"
    try {
      const res = await alterarStatusColaborador(colab.id, novoStatus)
      if (res.success) {
        toast.success(`Colaborador ${novoStatus === 'ativo' ? 'REATIVADO' : 'BLOQUEADO'} com sucesso!`)
        refreshEquipe()
      } else {
        toast.error(res.error || "Erro ao atualizar status.")
      }
    } catch (err) {
      toast.error("Falha ao comunicar status.")
    }
  }

  // Disparar redefinição de senha
  const handleSendResetPassword = async (email: string) => {
    try {
      const res = await redefinirSenhaColaborador(email)
      if (res.success) {
        toast.success("E-mail de redefinição de senha disparado com sucesso!")
      } else {
        toast.error(res.error || "Erro ao enviar e-mail.")
      }
    } catch (err) {
      toast.error("Falha de rede.")
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "dono": return "bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
      case "gerente": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
      case "caixa": return "bg-blue-500/15 text-blue-400 border-blue-500/25"
      case "vendedor": return "bg-teal-500/15 text-teal-400 border-teal-500/25"
      case "estoquista": return "bg-amber-500/15 text-amber-400 border-amber-500/25"
      case "financeiro": return "bg-pink-500/15 text-pink-400 border-pink-500/25"
      case "supervisor": return "bg-purple-500/15 text-purple-400 border-purple-500/25"
      default: return "bg-slate-500/15 text-slate-400 border-slate-500/25"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "dono": return "Dono"
      case "gerente": return "Gerente"
      case "caixa": return "Caixa"
      case "vendedor": return "Vendedor"
      case "estoquista": return "Estoquista"
      case "financeiro": return "Financeiro"
      case "supervisor": return "Supervisor"
      default: return role
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Gestão de Colaboradores
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Gerencie os acessos, cargos e filiais da sua equipe corporativa ({grupo.nome})
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Realtime Active Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
            <span className={cn("w-1.5 h-1.5 rounded-full bg-emerald-400", { "animate-ping": !loadingSilently, "animate-spin": loadingSilently })} />
            {loadingSilently ? "Sincronizando..." : "Conexão Ativa"}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Colaborador
          </Button>
        </div>
      </div>

      {/* 2. Cards de Visão Geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">Total de Equipe</span>
            <span className="text-xl font-extrabold text-foreground">{metrics.total}</span>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">Ativos no Grupo</span>
            <span className="text-xl font-extrabold text-foreground">{metrics.ativos}</span>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 flex-shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">Bloqueados / Inativos</span>
            <span className="text-xl font-extrabold text-foreground">{metrics.bloqueados}</span>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">Cargos de Gerência</span>
            <span className="text-xl font-extrabold text-foreground">{metrics.gerentes}</span>
          </div>
        </div>
      </div>

      {/* 3. Tabela de Colaboradores */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-md">
        {colaboradores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Users className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
            <h3 className="font-extrabold text-slate-200">Nenhum colaborador cadastrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Sua equipe contábil está vazia. Adicione gerentes, caixas ou estoquistas para operar suas filiais em tempo real.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="text-xs font-bold gap-1 mt-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Colaborador
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Email / Telefone</TableHead>
                  <TableHead>Filiais & Perfis</TableHead>
                  <TableHead>Status Geral</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradores.map((colab) => {
                  const pVinculo = colab.vinculos[0]
                  return (
                    <TableRow key={colab.id} className="hover:bg-muted/10 transition-colors">
                      {/* Nome / Avatar */}
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {colab.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-extrabold text-foreground">{colab.nome}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">
                              {getRoleLabel(pVinculo?.perfil)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email / Telefone */}
                      <TableCell>
                        <div className="flex flex-col text-xs text-slate-300">
                          <span className="flex items-center gap-1"><Mail size={11} className="text-muted-foreground" /> {colab.email}</span>
                          <span className="flex items-center gap-1 mt-1 text-muted-foreground"><Phone size={11} /> Convidado</span>
                        </div>
                      </TableCell>

                      {/* Filiais vinculadas */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                          {colab.vinculos.map((v, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={cn("text-[9px] font-bold py-0.5 px-2 flex items-center gap-1", getRoleBadgeColor(v.perfil))}
                            >
                              <span className="w-1 h-1 rounded-full bg-current" />
                              {v.nome_loja} ({getRoleLabel(v.perfil)})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={colab.status === "ativo" ? "success" : "outline"}
                          showDot
                          className="text-[9px] font-bold py-0.5 px-2.5"
                        >
                          {colab.status === "ativo" ? "Ativo" : "Bloqueado"}
                        </Badge>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Editar Filiais/Cargos */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedColab(colab)
                              setEditModalOpen(true)
                            }}
                            className="p-1.5 h-auto hover:bg-muted text-slate-300 hover:text-foreground cursor-pointer"
                            title="Editar Filiais / Permissões"
                          >
                            <Edit size={13} />
                          </Button>

                          {/* Redefinir senha */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendResetPassword(colab.email)}
                            className="p-1.5 h-auto hover:bg-muted text-slate-300 hover:text-foreground cursor-pointer"
                            title="Disparar e-mail de redefinição de senha"
                          >
                            <Lock size={13} />
                          </Button>

                          {/* Bloquear / Ativar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(colab)}
                            className={cn("p-1.5 h-auto hover:bg-muted cursor-pointer", {
                              "text-rose-400 hover:text-rose-300": colab.status === "ativo",
                              "text-emerald-400 hover:text-emerald-300": colab.status === "inativo"
                            })}
                            title={colab.status === "ativo" ? "Bloquear Colaborador" : "Reativar Colaborador"}
                          >
                            {colab.status === "ativo" ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CRIAR COLABORADOR */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden animate-scale-in">
            {/* Glow Circle overlay */}
            <div className="absolute right-[-15%] top-[-20%] w-56 h-56 bg-radial-gradient from-primary/10 to-transparent blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5 select-none">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-primary" />
                Cadastrar Colaborador
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateColaborador} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-muted-foreground uppercase">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={createForm.nome}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full bg-input border border-border/60 rounded-lg p-2.5 outline-none text-foreground focus:border-primary transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase">Email do Colaborador</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: joao@email.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-input border border-border/60 rounded-lg p-2.5 outline-none text-foreground focus:border-primary transition-all"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase">Telefone / Whatsapp</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={createForm.telefone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full bg-input border border-border/60 rounded-lg p-2.5 outline-none text-foreground focus:border-primary transition-all"
                  />
                </div>

                {/* Senha Provisória */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-muted-foreground uppercase">Senha Provisória (Mínimo 6 dígitos)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Defina uma senha de primeiro acesso"
                    value={createForm.senhaProvisoria}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, senhaProvisoria: e.target.value }))}
                    className="w-full bg-input border border-border/60 rounded-lg p-2.5 outline-none text-foreground focus:border-primary transition-all"
                  />
                </div>

                {/* Cargo */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase">Cargo / Perfil Principal</label>
                  <select
                    value={createForm.cargo}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, cargo: e.target.value as PerfilUsuarioLoja }))}
                    className="w-full bg-input border border-border/60 rounded-lg p-2.5 outline-none text-foreground focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="caixa">Caixa</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="gerente">Gerente</option>
                    <option value="estoquista">Estoquista</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="dono">Dono (Co-proprietário)</option>
                  </select>
                </div>

                {/* Loja padrão */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase">Loja Inicial / Matriz</label>
                  <select
                    value={createForm.lojaId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, lojaId: e.target.value }))}
                    className="w-full bg-input border border-border/60 rounded-lg p-2.5 outline-none text-foreground focus:border-primary transition-all cursor-pointer"
                  >
                    {lojas.map(l => (
                      <option key={l.id} value={l.id}>{l.nome_loja}</option>
                    ))}
                  </select>
                </div>

                {/* Lojas adicionais */}
                {lojas.length > 1 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-bold text-muted-foreground uppercase">Vincular a outras filiais (Opcional)</label>
                    <div className="grid grid-cols-2 gap-2 mt-1 max-h-24 overflow-y-auto p-1 bg-input/10 border border-border/30 rounded-lg">
                      {lojas
                        .filter(l => l.id !== createForm.lojaId)
                        .map(loja => (
                          <label key={loja.id} className="flex items-center gap-2 px-2 py-1 hover:bg-muted/30 rounded cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={createForm.lojasAdicionais.includes(loja.id)}
                              onChange={(e) => {
                                const isChecked = e.target.checked
                                setCreateForm(prev => ({
                                  ...prev,
                                  lojasAdicionais: isChecked
                                    ? [...prev.lojasAdicionais, loja.id]
                                    : prev.lojasAdicionais.filter(id => id !== loja.id)
                                }))
                              }}
                              className="accent-primary"
                            />
                            <span className="truncate">{loja.nome_loja}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-xs font-semibold h-9 px-4 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submittingCreate}
                  className="text-xs font-bold h-9 px-5 gap-1 bg-primary cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingCreate ? "Registrando..." : "Cadastrar Colaborador"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR COLABORADOR / VÍNCULOS */}
      {/* ========================================================================= */}
      {editModalOpen && selectedColab && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl p-6 relative overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5 select-none">
              <div>
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                  <Edit className="w-4 h-4 text-primary" />
                  Filiais & Cargos de {selectedColab.nome}
                </h3>
                <span className="text-[10px] text-muted-foreground block mt-0.5">{selectedColab.email}</span>
              </div>
              <button
                onClick={() => {
                  setEditModalOpen(false)
                  setSelectedColab(null)
                }}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* List of current store links */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-muted-foreground uppercase block mb-2">Vínculos Ativos nas Filiais</label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {selectedColab.vinculos.map((v) => (
                    <div
                      key={v.loja_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-input/20 border border-border/30 hover:border-border/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 size={16} className="text-primary/70" />
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{v.nome_loja}</span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">Cargo: {getRoleLabel(v.perfil)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* select to change cargo on the fly */}
                        <select
                          value={v.perfil}
                          onChange={(e) => handleChangeCargoLoja(v.loja_id, e.target.value as PerfilUsuarioLoja)}
                          className="bg-input border border-border/50 text-[10px] font-bold rounded-md py-1 px-2 outline-none cursor-pointer"
                        >
                          <option value="caixa">Caixa</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="gerente">Gerente</option>
                          <option value="estoquista">Estoquista</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="dono">Dono</option>
                        </select>

                        {/* remove link */}
                        <Button
                          variant="ghost"
                          onClick={() => handleRemoveVinculo(v.loja_id)}
                          disabled={selectedColab.vinculos.length <= 1}
                          className="p-1 h-auto hover:bg-destructive/10 text-destructive/80 hover:text-destructive cursor-pointer"
                          title="Desvincular filial"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to bind new store */}
              {lojas.filter(l => !selectedColab.vinculos.some(v => v.loja_id === l.id)).length > 0 ? (
                <form onSubmit={handleAddVinculo} className="border-t border-border/40 pt-4 mt-4 space-y-3">
                  <label className="font-bold text-muted-foreground uppercase block">Vincular a uma Nova Filial</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <select
                        value={newVinculoForm.lojaId}
                        onChange={(e) => setNewVinculoForm(prev => ({ ...prev, lojaId: e.target.value }))}
                        className="w-full bg-input border border-border/60 rounded-lg p-2 outline-none text-foreground cursor-pointer"
                      >
                        <option value="">Selecione a Filial...</option>
                        {lojas
                          .filter(l => !selectedColab.vinculos.some(v => v.loja_id === l.id))
                          .map(loja => (
                            <option key={loja.id} value={loja.id}>{loja.nome_loja}</option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1 flex gap-2">
                      <select
                        value={newVinculoForm.cargo}
                        onChange={(e) => setNewVinculoForm(prev => ({ ...prev, cargo: e.target.value as PerfilUsuarioLoja }))}
                        className="flex-1 bg-input border border-border/60 rounded-lg p-2 outline-none text-foreground cursor-pointer"
                      >
                        <option value="caixa">Caixa</option>
                        <option value="vendedor">Vendedor</option>
                        <option value="gerente">Gerente</option>
                        <option value="estoquista">Estoquista</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="dono">Dono</option>
                      </select>

                      <Button
                        type="submit"
                        disabled={submittingVinculo}
                        className="text-xs font-bold px-3.5 h-auto bg-primary cursor-pointer flex-shrink-0 gap-0.5"
                      >
                        <Plus size={13} /> Vincular
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="py-2.5 px-3 bg-muted/10 border border-border/20 text-[10px] font-bold text-muted-foreground/80 rounded-lg text-center select-none">
                  Este colaborador já está vinculado a todas as filiais do grupo empresarial.
                </div>
              )}

              {/* Close buttons */}
              <div className="flex justify-end pt-4 border-t border-border/40 mt-5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditModalOpen(false)
                    setSelectedColab(null)
                  }}
                  className="text-xs font-bold h-9 px-5 cursor-pointer"
                >
                  Concluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
