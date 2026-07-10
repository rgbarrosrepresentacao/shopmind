import CompraFormClient from '@/components/compras/compra-form-client';

export const metadata = {
  title: 'ShopMind — Nova Compra',
  description: 'Registre uma nova entrada de mercadoria com controle de custos e margem.',
};

export default function NovaCompraPage() {
  return <CompraFormClient />;
}
