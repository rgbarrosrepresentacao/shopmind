'use client'

import React, { createContext, useContext, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GrupoEmpresarial, LojaFilial, PerfilUsuarioLoja } from '@/lib/types/multilojas'
import { trocarLojaAtiva } from '@/lib/actions/multilojas'

interface LojaContextType {
  grupo: GrupoEmpresarial
  lojaAtiva: LojaFilial
  lojas: LojaFilial[]
  perfil: PerfilUsuarioLoja
  trocarLoja: (lojaId: string) => Promise<void>
  isPending: boolean
}

const LojaContext = createContext<LojaContextType | undefined>(undefined)

export function LojaProvider({
  children,
  grupo,
  lojaAtiva,
  lojas,
  perfil
}: {
  children: React.ReactNode
  grupo: GrupoEmpresarial
  lojaAtiva: LojaFilial
  lojas: LojaFilial[]
  perfil: PerfilUsuarioLoja
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingMsg, setLoadingMsg] = useState('')

  const trocarLoja = async (lojaId: string) => {
    if (lojaId === lojaAtiva.id) return

    startTransition(async () => {
      try {
        const targetStoreName = lojas.find(l => l.id === lojaId)?.nome_loja || 'nova loja'
        setLoadingMsg(`Conectando à unidade ${targetStoreName}...`)
        
        const res = await trocarLojaAtiva(lojaId)
        
        if (res.success) {
          // Force complete page reload and redirect to dashboard to clear client caches safely
          window.location.href = '/dashboard'
        } else {
          alert(res.error || 'Erro ao alternar de loja.')
        }
      } catch (err) {
        console.error(err)
        alert('Erro inesperado ao alternar de loja.')
      }
    })
  }

  return (
    <LojaContext.Provider value={{ grupo, lojaAtiva, lojas, perfil, trocarLoja, isPending }}>
      {children}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
          <div className="relative flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500" />
            {/* Inner pulsing glow */}
            <div className="absolute h-10 w-10 animate-ping rounded-full bg-violet-500/25" />
          </div>
          <p className="mt-6 text-sm font-medium text-slate-200 tracking-wide animate-pulse">
            {loadingMsg || 'Alternando loja...'}
          </p>
          <span className="mt-2 text-xs text-slate-500">
            Sincronizando dados e atualizando permissões
          </span>
        </div>
      )}
    </LojaContext.Provider>
  )
}

export function useLojaAtiva() {
  const context = useContext(LojaContext)
  if (!context) {
    throw new Error('useLojaAtiva deve ser usado dentro de um LojaProvider')
  }
  return context
}
