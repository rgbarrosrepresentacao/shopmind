import type { Metadata } from 'next'
import { Logo } from '@/components/brand/logo'
import { Brain, Package, DollarSign, Warehouse } from 'lucide-react'

export const metadata: Metadata = {
  title: 'ShopMind — Acesso',
  description: 'Faça login ou crie sua conta no ShopMind. O gerente inteligente da sua loja.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__brand">
        <div className="auth-layout__brand-content">
          <Logo variant="full" size="lg" />
          <h1 className="auth-layout__headline">O gerente inteligente<br />da sua loja.</h1>
          <p className="auth-layout__subheadline">
            Gerencie produtos, estoque, vendas e finanças em um só lugar. 
            Com inteligência artificial integrada para ajudar você a tomar decisões melhores.
          </p>
          <div className="auth-layout__features">
            <div className="auth-layout__feature">
              <Package size={20} />
              <span>PDV Completo</span>
            </div>
            <div className="auth-layout__feature">
              <Warehouse size={20} />
              <span>Controle de Estoque</span>
            </div>
            <div className="auth-layout__feature">
              <DollarSign size={20} />
              <span>Gestão Financeira</span>
            </div>
            <div className="auth-layout__feature">
              <Brain size={20} />
              <span>IA Gerente</span>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-layout__form-area">
        <div className="auth-layout__form-container">
          {children}
        </div>
      </div>
    </div>
  )
}
