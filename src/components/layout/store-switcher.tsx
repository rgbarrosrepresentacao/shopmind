'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useLojaAtiva } from '@/components/providers/loja-context'
import { 
  ChevronsUpDown, 
  Check, 
  Building2, 
  Plus, 
  Settings, 
  Store, 
  Shield 
} from 'lucide-react'

export const StoreSwitcher: React.FC = () => {
  const router = useRouter()
  const { grupo, lojaAtiva, lojas, perfil, trocarLoja } = useLojaAtiva()
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Get active store initials
  const initials = lojaAtiva?.nome_loja
    ? lojaAtiva.nome_loja
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SM'

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectStore = async (id: string) => {
    if (id === lojaAtiva.id) {
      setIsOpen(false)
      return
    }
    setIsOpen(false)
    await trocarLoja(id)
  }

  const getPerfilLabel = (p: string) => {
    const labels: Record<string, string> = {
      dono: 'Dono',
      gerente: 'Gerente',
      caixa: 'Caixa',
      vendedor: 'Vendedor',
      estoquista: 'Estoque',
      financeiro: 'Financeiro',
      supervisor: 'Supervisor'
    }
    return labels[p] || p
  }

  const isDono = perfil === 'dono'

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => lojas.length > 1 && setIsOpen(!isOpen)}
        disabled={lojas.length <= 1}
        className={cn(
          "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 select-none text-left",
          "bg-card/50 border-border/50 hover:bg-card hover:border-border/80 active:scale-[0.98]",
          lojas.length > 1 ? "cursor-pointer" : "cursor-default",
          isOpen && "bg-card border-primary/50 ring-1 ring-primary/20"
        )}
      >
        {/* Logo/Avatar with Gradient */}
        <div 
          style={!lojaAtiva?.logo_url && !grupo?.logo_url && lojaAtiva?.cor_primaria ? { backgroundColor: lojaAtiva.cor_primaria } : {}}
          className={cn(
            "w-9 h-9 rounded-lg text-white flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0 overflow-hidden",
            (!lojaAtiva?.logo_url && !grupo?.logo_url && !lojaAtiva?.cor_primaria) && "bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-violet-500/10"
          )}
        >
          {lojaAtiva?.logo_url ? (
            <img src={lojaAtiva.logo_url} alt={lojaAtiva.nome_loja} className="w-full h-full object-cover animate-fade-in" />
          ) : grupo?.logo_url ? (
            <img src={grupo.logo_url} alt={grupo.nome} className="w-full h-full object-cover animate-fade-in" />
          ) : (
            initials
          )}
        </div>

        {/* Store Details */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-foreground truncate leading-none">
              {lojaAtiva?.nome_loja || 'Minha Loja'}
            </span>
            
            {/* Store Type Badge */}
            <span className={cn(
              "text-[8px] px-1 py-0.25 rounded font-bold uppercase tracking-wide",
              lojaAtiva?.tipo_unidade === 'matriz' 
                ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" 
                : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
            )}>
              {lojaAtiva?.tipo_unidade === 'matriz' ? 'Matriz' : 'Filial'}
            </span>
          </div>
          
          {/* Group & Role info */}
          <span className="text-[9px] text-muted-foreground mt-1 truncate flex items-center gap-1">
            <span className="truncate max-w-[80px]">{grupo?.nome || 'Grupo Empresarial'}</span>
            <span className="text-border">•</span>
            <span className="text-violet-400 font-semibold">{getPerfilLabel(perfil)}</span>
          </span>
        </div>

        {/* Dropdown Arrow Indicator */}
        {lojas.length > 1 && (
          <ChevronsUpDown size={14} className="text-muted-foreground/80 flex-shrink-0 transition-transform duration-200 group-hover:text-foreground" />
        )}
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={cn(
            "absolute left-0 right-0 z-[100] mt-2 rounded-xl border border-border/80 bg-slate-900/95 backdrop-blur-lg shadow-xl shadow-black/40 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
          )}
        >
          {/* Group Header */}
          <div className="px-2 py-1.5 mb-1 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">
              Grupo Empresarial
            </p>
            <p className="text-xs font-bold text-foreground mt-1 truncate">
              {grupo?.nome || 'Minha Corporação'}
            </p>
          </div>

          {/* Stores List */}
          <div className="max-h-[220px] overflow-y-auto space-y-0.5 custom-scrollbar">
            {lojas.map((store) => {
              const isActive = store.id === lojaAtiva.id
              const storeInitials = store.nome_loja
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              return (
                <button
                  key={store.id}
                  onClick={() => handleSelectStore(store.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all duration-150 group/item cursor-pointer",
                    isActive 
                      ? "bg-violet-600/15 text-white border border-violet-500/30" 
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
                  )}
                >
                  {/* Store Avatar */}
                  <div 
                    style={!store.logo_url && store.cor_primaria ? { backgroundColor: store.cor_primaria } : {}}
                    className={cn(
                      "w-7 h-7 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 transition-all overflow-hidden",
                      isActive 
                        ? (!store.logo_url && !store.cor_primaria ? "bg-gradient-to-tr from-violet-600 to-indigo-500 text-white" : "text-white") 
                        : (!store.logo_url && !store.cor_primaria ? "bg-slate-800 text-slate-400 group-hover/item:bg-slate-700 group-hover/item:text-slate-200" : "text-white")
                    )}
                  >
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.nome_loja} className="w-full h-full object-cover animate-fade-in" />
                    ) : (
                      storeInitials
                    )}
                  </div>

                  {/* Store Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-xs truncate font-medium",
                        isActive ? "font-bold text-white" : "text-slate-300 group-hover/item:text-white"
                      )}>
                        {store.nome_loja}
                      </span>
                      <span className={cn(
                        "text-[8px] px-0.75 py-0.15 rounded font-bold uppercase",
                        store.tipo_unidade === 'matriz' 
                          ? "bg-violet-500/10 text-violet-400" 
                          : "bg-blue-500/10 text-blue-400"
                      )}>
                        {store.tipo_unidade === 'matriz' ? 'M' : 'F'}
                      </span>
                    </div>
                    {store.codigo_interno && (
                      <span className="text-[9px] text-muted-foreground/80 block mt-0.5">
                        Cód: {store.codigo_interno}
                      </span>
                    )}
                  </div>

                  {/* Check / Status Icon */}
                  {isActive ? (
                    <Check size={14} className="text-violet-400 flex-shrink-0" />
                  ) : (
                    <Store size={12} className="text-slate-600 group-hover/item:text-slate-400 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Owner Footer Link */}
          {isDono && (
            <div className="mt-1.5 pt-1.5 border-t border-border/40 space-y-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/dashboard/multilojas')
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold text-violet-400 hover:bg-violet-500/10 transition-all duration-150 cursor-pointer text-left"
              >
                <span className="flex items-center gap-1.5">
                  <Settings size={12} />
                  Painel Corporativo
                </span>
                <span className="text-[9px] bg-violet-500/15 px-1 py-0.25 rounded text-violet-300 border border-violet-500/20 uppercase font-bold tracking-wider">
                  Config
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
