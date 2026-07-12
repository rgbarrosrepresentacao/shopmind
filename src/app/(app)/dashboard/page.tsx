import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get active user
  const { data: { user } } = await supabase.auth.getUser();

  // Get profile to find the loja_id
  const { data: profile } = await supabase
    .from('usuarios')
    .select('loja_id')
    .eq('id', user?.id)
    .maybeSingle();

  // 1. Fetch store info
  const { data: store } = await supabase
    .from('lojas')
    .select('id, nome_loja, slug')
    .eq('id', profile?.loja_id)
    .single();

  // 2. Fetch current subscription
  const { data: subscription } = await supabase
    .from('assinaturas')
    .select('plano_id')
    .maybeSingle();

  let plan = null;
  if (subscription) {
    const { data: fetchedPlan } = await supabase
      .from('planos')
      .select('limite_produtos')
      .eq('id', subscription.plano_id)
      .maybeSingle();
    plan = fetchedPlan;
  }

  // 3. Fetch active products for stock analysis and insights (filtered by loja_id)
  const { data: activeProducts } = await supabase
    .from('produtos')
    .select('nome, estoque_atual, estoque_minimo, preco_venda, preco_custo')
    .eq('loja_id', profile?.loja_id)
    .eq('status', 'ativo')
    .is('deleted_at', null);

  const products = activeProducts || [];
  const productCount = products.length;
  const lowStockProducts = products.filter(p => Number(p.estoque_atual) < Number(p.estoque_minimo));

  // 4. Count clients (filtered by loja_id)
  const { count: clientCount } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('loja_id', profile?.loja_id);

  // 5. Fetch sales data (for statistics/real summary, filtered by loja_id)
  const { data: sales } = await supabase
    .from('vendas')
    .select('id, total, status, created_at, forma_pagamento, clientes(nome)')
    .eq('loja_id', profile?.loja_id)
    .order('created_at', { ascending: false });

  const salesList = sales || [];

  // Helper for timezone conversion to Brazil/SP
  const getLocalDate = (dateInput?: Date | string | number): Date => {
    const d = dateInput ? new Date(dateInput) : new Date();
    return new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  };

  // A. Today's stats
  const startOfToday = getLocalDate();
  startOfToday.setHours(0, 0, 0, 0);

  const salesToday = salesList.filter(sale => {
    const saleDate = getLocalDate(sale.created_at);
    return saleDate >= startOfToday;
  });

  const activeSalesToday = salesToday.filter(s => s.status === 'concluida');
  const totalRevenueToday = activeSalesToday.reduce((acc, sale) => acc + Number(sale.total), 0);
  const totalSalesCountToday = activeSalesToday.length;

  // B. Yesterday's stats
  const startOfYesterday = getLocalDate();
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(startOfToday);
  endOfYesterday.setMilliseconds(-1);

  const salesYesterday = salesList.filter(sale => {
    const saleDate = getLocalDate(sale.created_at);
    return saleDate >= startOfYesterday && saleDate <= endOfYesterday;
  });

  const activeSalesYesterday = salesYesterday.filter(s => s.status === 'concluida');
  const totalRevenueYesterday = activeSalesYesterday.reduce((acc, sale) => acc + Number(sale.total), 0);
  const salesCountYesterday = activeSalesYesterday.length;

  // C. Trends
  let revenueTrend = "Estável";
  let isRevenuePositive = true;
  if (totalRevenueYesterday > 0) {
    const pctChange = ((totalRevenueToday - totalRevenueYesterday) / totalRevenueYesterday) * 100;
    revenueTrend = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`;
    isRevenuePositive = pctChange >= 0;
  } else if (totalRevenueToday > 0) {
    revenueTrend = "+100%";
    isRevenuePositive = true;
  }

  let salesTrend = "Estável";
  let isSalesPositive = true;
  if (salesCountYesterday > 0) {
    const pctChange = ((totalSalesCountToday - salesCountYesterday) / salesCountYesterday) * 100;
    salesTrend = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`;
    isSalesPositive = pctChange >= 0;
  } else if (totalSalesCountToday > 0) {
    salesTrend = "+100%";
    isSalesPositive = true;
  }

  // D. Weekly Sales History (last 7 days, including today)
  const salesHistoryData = [];
  for (let i = 6; i >= 0; i--) {
    const d = getLocalDate();
    d.setDate(d.getDate() - i);
    const dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    const daySales = salesList.filter(sale => {
      const saleDate = getLocalDate(sale.created_at);
      return sale.status === 'concluida' &&
             saleDate.getDate() === d.getDate() &&
             saleDate.getMonth() === d.getMonth() &&
             saleDate.getFullYear() === d.getFullYear();
    });
    
    const dayTotal = daySales.reduce((acc, s) => acc + Number(s.total), 0);
    salesHistoryData.push({ name: dateLabel, valor: dayTotal });
  }

  // E. Payment Methods Distribution
  const methodCounts: Record<string, number> = { dinheiro: 0, pix: 0, cartao_credito: 0, cartao_debito: 0, multiplo: 0 };
  let totalActiveSales = 0;
  salesList.forEach(sale => {
    if (sale.status === 'concluida') {
      const method = sale.forma_pagamento;
      if (method in methodCounts) {
        methodCounts[method]++;
        totalActiveSales++;
      }
    }
  });

  const paymentMethodsData = [
    { name: "Pix", value: totalActiveSales > 0 ? Math.round((methodCounts.pix / totalActiveSales) * 100) : 0 },
    { name: "Crédito", value: totalActiveSales > 0 ? Math.round((methodCounts.cartao_credito / totalActiveSales) * 100) : 0 },
    { name: "Dinheiro", value: totalActiveSales > 0 ? Math.round((methodCounts.dinheiro / totalActiveSales) * 100) : 0 },
    { name: "Débito", value: totalActiveSales > 0 ? Math.round((methodCounts.cartao_debito / totalActiveSales) * 100) : 0 },
  ];

  // F. Recent Sales List (top 5)
  const recentSales = salesList
    .slice(0, 5)
    .map(sale => {
      const saleDate = getLocalDate(sale.created_at);
      const today = getLocalDate();
      const yesterday = getLocalDate();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateStr = "";
      if (saleDate.getDate() === today.getDate() && saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear()) {
        dateStr = `Hoje, ${saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (saleDate.getDate() === yesterday.getDate() && saleDate.getMonth() === yesterday.getMonth() && saleDate.getFullYear() === yesterday.getFullYear()) {
        dateStr = `Ontem, ${saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        dateStr = saleDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
      
      return {
        id: `VD-${sale.id.slice(0, 4).toUpperCase()}`,
        client: (sale.clientes as any)?.nome || "Consumidor Final",
        total: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(sale.total)),
        status: sale.status,
        date: dateStr
      };
    });

  // G. Fetch top-selling product for this store to generate real insights
  const { data: soldItems } = await supabase
    .from('venda_itens')
    .select('produto_nome, quantidade')
    .eq('loja_id', profile?.loja_id);

  const itemCounts: Record<string, number> = {};
  (soldItems || []).forEach((item: any) => {
    itemCounts[item.produto_nome] = (itemCounts[item.produto_nome] || 0) + Number(item.quantidade);
  });

  let bestSeller = "";
  let bestSellerQty = 0;
  Object.entries(itemCounts).forEach(([name, count]) => {
    if (count > bestSellerQty) {
      bestSellerQty = count;
      bestSeller = name;
    }
  });

  // H. Compile 100% Real Database-Driven Insights
  const insights = [];

  // 1. Revenue Insight
  if (totalRevenueToday > 0) {
    const trendText = revenueTrend !== "Estável" ? ` (uma variação de ${revenueTrend} em relação a ontem)` : "";
    insights.push({
      type: "insight" as const,
      title: "Desempenho Comercial",
      message: `Hoje registramos um faturamento de R$ ${totalRevenueToday.toFixed(2)} em ${totalSalesCountToday} vendas${trendText}. Continue com o excelente trabalho!`,
      priority: "media" as const,
      actionLabel: "Ver Vendas",
    });
  } else if (totalRevenueYesterday > 0) {
    insights.push({
      type: "insight" as const,
      title: "Aguardando Vendas",
      message: `Ontem sua loja faturou R$ ${totalRevenueYesterday.toFixed(2)}. Abra seu caixa e inicie as vendas hoje para manter o ritmo!`,
      priority: "media" as const,
      actionLabel: "Abrir Caixa",
    });
  } else {
    insights.push({
      type: "insight" as const,
      title: "Comece a Vender",
      message: "Nenhum faturamento registrado ontem ou hoje. Abra o caixa no PDV e realize sua primeira venda para ativar os gráficos!",
      priority: "media" as const,
      actionLabel: "Ir para o PDV",
    });
  }

  // 2. Stock Insight
  if (lowStockProducts.length > 0) {
    const critical = [...lowStockProducts].sort((a, b) => {
      const pctA = Number(a.estoque_minimo) > 0 ? Number(a.estoque_atual) / Number(a.estoque_minimo) : 0;
      const pctB = Number(b.estoque_minimo) > 0 ? Number(b.estoque_atual) / Number(b.estoque_minimo) : 0;
      return pctA - pctB;
    })[0];

    insights.push({
      type: "insight" as const,
      title: "Estoque Crítico Detectado",
      message: `Seu estoque de '${critical.nome}' está muito baixo (restam apenas ${critical.estoque_atual} unidades). O estoque mínimo de segurança é de ${critical.estoque_minimo} unidades.`,
      priority: "alta" as const,
      actionLabel: "Repor Estoque",
    });
  } else if (products.length > 0) {
    insights.push({
      type: "insight" as const,
      title: "Estoque Saudável",
      message: `Excelente! Todos os seus ${products.length} produtos cadastrados e ativos estão com níveis de estoque acima do mínimo de segurança.`,
      priority: "baixa" as const,
      actionLabel: "Ver Estoque",
    });
  } else {
    insights.push({
      type: "insight" as const,
      title: "Nenhum Produto Cadastrado",
      message: "Cadastre seus produtos no painel para que a IA e o sistema possam acompanhar e monitorar seus níveis de estoque em tempo real.",
      priority: "alta" as const,
      actionLabel: "Cadastrar Produto",
    });
  }

  // 3. AI Recommendation / Best Seller Insight
  if (bestSeller) {
    insights.push({
      type: "recommendation" as const,
      title: "Produto em Destaque",
      message: `'${bestSeller}' é o produto mais vendido na sua loja, com um total acumulado de ${bestSellerQty} unidades vendidas. Garanta que o estoque esteja sempre abastecido!`,
      recommendationType: "compra" as const,
    });
  } else if (products.length > 0) {
    const expensive = [...products].sort((a, b) => Number(b.preco_venda) - Number(a.preco_venda))[0];
    insights.push({
      type: "recommendation" as const,
      title: "Ajuste Sugerido de Preço",
      message: `Considere otimizar a margem do seu produto de maior valor, '${expensive.nome}' (atualmente R$ ${Number(expensive.preco_venda).toFixed(2)}). Um leve ajuste pode impulsionar o lucro!`,
      recommendationType: "preco" as const,
    });
  } else {
    insights.push({
      type: "recommendation" as const,
      title: "Configure sua Loja",
      message: "Cadastre seus produtos e comece a vender para habilitar as recomendações inteligentes da IA Gerente baseadas em vendas reais.",
      recommendationType: "estoque" as const,
    });
  }

  const productLimit = plan?.limite_produtos || 1000;

  return (
    <DashboardClient
      store={store || { id: '', nome_loja: 'Minha Loja', slug: 'loja' }}
      productCount={productCount || 0}
      clientCount={clientCount || 0}
      totalRevenue={totalRevenueToday}
      totalSalesCount={totalSalesCountToday}
      productLimit={productLimit}
      revenueTrend={revenueTrend}
      isRevenuePositive={isRevenuePositive}
      salesTrend={salesTrend}
      isSalesPositive={isSalesPositive}
      salesHistoryData={salesHistoryData}
      paymentMethodsData={paymentMethodsData}
      recentSales={recentSales}
      insights={insights}
    />
  );
}
