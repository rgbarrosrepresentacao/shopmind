'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, type AuthState } from '@/lib/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, null)

  // Handle client-side redirect on successful login
  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
      router.refresh()
    }
  }, [state, router])

  return (
    <>
      <div className="auth-header">
        <h2 className="auth-title">Bem-vindo de volta</h2>
        <p className="auth-subtitle">Acesse sua conta ShopMind</p>
      </div>

      {state?.error && (
        <div className="auth-error" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span>{state.error}</span>
        </div>
      )}

      <form action={action} className="auth-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">E-mail</label>
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

        <div className="form-group">
          <label htmlFor="password" className="form-label">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="form-input"
          />
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary btn-full">
          {pending ? (
            <>
              <svg className="btn-spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Ainda não tem uma conta?{' '}
          <Link href="/cadastro" className="auth-link">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </>
  )
}
