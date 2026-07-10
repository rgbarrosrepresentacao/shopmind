import ClientesPageClient from '@/components/clientes/clientes-page-client';

export const metadata = {
  title: 'ShopMind — Clientes Inteligentes',
  description: 'CRM e segmentação automática de clientes com RFM, prevenção de churn e aniversário.',
};

export default function ClientesPage() {
  return <ClientesPageClient />;
}
