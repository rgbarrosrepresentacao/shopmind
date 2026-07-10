'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AuthState = {
  error?: string
  success?: boolean
} | null

// ============================================
// SIGN UP — Cria conta + loja + onboarding automático via trigger
// ============================================
export async function signUp(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nomeLoja = formData.get('nome_loja') as string
  const slug = formData.get('slug') as string

  // Basic validation
  if (!nome || nome.trim().length < 2) {
    return { error: 'O nome deve ter pelo menos 2 caracteres.' }
  }
  if (!email || !email.includes('@')) {
    return { error: 'Informe um e-mail válido.' }
  }
  if (!password || password.length < 6) {
    return { error: 'A senha deve ter pelo menos 6 caracteres.' }
  }
  if (!nomeLoja || nomeLoja.trim().length < 2) {
    return { error: 'O nome da loja deve ter pelo menos 2 caracteres.' }
  }
  if (!slug || slug.trim().length < 3) {
    return { error: 'O slug da loja deve ter pelo menos 3 caracteres.' }
  }

  // Validate slug format (only lowercase letters, numbers, and hyphens)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugRegex.test(slug)) {
    return { error: 'O slug deve conter apenas letras minúsculas, números e hífens.' }
  }

  // Check if slug is already taken
  const { data: existingLoja } = await supabase
    .from('lojas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existingLoja) {
    return { error: 'Este slug já está em uso. Escolha outro.' }
  }

  // Create account in Supabase Auth
  // The trigger fn_on_auth_user_created will automatically:
  // 1. Create the loja
  // 2. Create the usuario profile (tipo: 'dono')
  // 3. Create configuracoes_loja
  // 4. Create assinatura (trial 14 days on Plano Único)
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: nome.trim(),
        tipo: 'dono',
        nome_loja: nomeLoja.trim(),
        slug: slug.trim().toLowerCase(),
      },
    },
  })

  if (error) {
    console.error('SUPABASE SIGNUP ERROR:', JSON.stringify(error, null, 2), error)
    if (error.message && error.message.includes('already registered')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: error.message || JSON.stringify(error) || 'Erro desconhecido ao criar conta' }
  }

  return { success: true }
}

// ============================================
// SIGN IN — Login com e-mail e senha
// ============================================
export async function signIn(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha o e-mail e a senha.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('SUPABASE SIGNIN ERROR:', JSON.stringify(error, null, 2), error)
    return { error: 'E-mail ou senha inválidos. ' + (error.message || '') }
  }

  return { success: true }
}

// ============================================
// SIGN OUT — Logout
// ============================================
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}
