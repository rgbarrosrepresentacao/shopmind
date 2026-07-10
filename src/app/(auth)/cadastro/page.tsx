'use client'

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signUp, type AuthState } from '@/lib/actions/auth'
import Link from 'next/link'
import { User, Mail, Lock, Store, Globe, ArrowRight } from 'lucide-react'

// Helper to slugify text
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // remove accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^-+/, '') // trim - from start of text
    .replace(/-+$/, '') // trim - from end of text
}

export default function CadastroPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, null)
  const [nomeLoja, setNomeLoja] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugEdited, setIsSlugEdited] = useState(false)

  // Redirect on success
  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
      router.refresh()
    }
  }, [state, router])

  // Auto-slugify when nomeLoja changes, unless user edited slug manually
  useEffect(() => {
    if (!isSlugEdited) {
      setSlug(slugify(nomeLoja))
    }
  }, [nomeLoja, isSlugEdited])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugEdited(true)
    setSlug(slugify(e.target.value))
  }

  return (
    <>
      <div className="auth-header">
        <h2 className="auth-title">Crie sua conta</h2>
        <p className="auth-subtitle">Comece a gerenciar sua loja de forma inteligente hoje.</p>
      </div>

      {state?.error && (
        <div className="auth-error" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span>{state.error}</span>
        </div>
      )}

      <form action={action} className="auth-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nome" className="form-label">Nome Completo</label>
            <div className="input-icon-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="nome"
                name="nome"
                type="text"
                required
                placeholder="Seu nome"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail Comercial</label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Senha de Acesso</label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="nome_loja" className="form-label">Nome da Loja</label>
            <div className="input-icon-wrapper">
              <Store className="input-icon" size={18} />
              <input
                id="nome_loja"
                name="nome_loja"
                type="text"
                required
                value={nomeLoja}
                onChange={(e) => setNomeLoja(e.target.value)}
                placeholder="Ex: Bella Makeup"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group span-full">
            <label htmlFor="slug" className="form-label">Endereço da sua loja (Subdomínio)</label>
            <div className="input-icon-wrapper">
              <Globe className="input-icon" size={18} />
              <input
                id="slug"
                name="slug"
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="ex-bella-makeup"
                className="form-input"
              />
            </div>
            <p className="form-hint">
              Sua loja será acessada em: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{slug || 'sua-loja'}.shopmind.com.br</span>
            </p>
          </div>
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary btn-full margin-top-lg">
          {pending ? (
            <>
              <svg className="btn-spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Criando sua loja...
            </>
          ) : (
            <>
              Criar Loja & Acessar
              <ArrowRight size={18} className="btn-arrow" />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Já possui uma loja cadastrada?{' '}
          <Link href="/login" className="auth-link">
            Entrar no ShopMind
          </Link>
        </p>
      </div>
    </>
  )
}
