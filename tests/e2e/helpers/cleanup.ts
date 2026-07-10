import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

function getEnvVariable(name: string): string {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return '';
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`));
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch (err) {
    // Silent fail if env file can't be read
  }
  return '';
}

export async function cleanupE2EData() {
  const supabaseUrl = getEnvVariable('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getEnvVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key not found. Skipping DB cleanup.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Starting E2E database cleanup...');

  try {
    // 1. Delete test financial transactions from 'financeiro'
    const { error: finError } = await supabase
      .from('financeiro')
      .delete()
      .or('descricao.ilike.%E2E%,descricao.ilike.%Teste%');
    if (finError) console.warn('Clean financeiro error:', finError.message);

    // 2. Delete test transferences from 'transferencias_estoque'
    const { error: transfError } = await supabase
      .from('transferencias_estoque')
      .delete()
      .or('observacao.ilike.%E2E%,observacao.ilike.%Teste%');
    if (transfError) console.warn('Clean transferencias error:', transfError.message);

    // 3. Find E2E Supplier first to safely clean purchase orders
    const { data: suppliers } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('nome', 'Fornecedor Teste E2E');
    
    if (suppliers && suppliers.length > 0) {
      const supplierIds = suppliers.map(s => s.id);
      // Delete purchase order items first due to foreign keys
      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('id')
        .in('fornecedor_id', supplierIds);
      
      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        
        await supabase
          .from('purchase_order_items')
          .delete()
          .in('purchase_order_id', orderIds);

        const { error: ordersDelError } = await supabase
          .from('purchase_orders')
          .delete()
          .in('id', orderIds);
        if (ordersDelError) console.warn('Clean purchase_orders error:', ordersDelError.message);
      }
    }

    // 4. Delete test products
    const { error: prodError } = await supabase
      .from('produtos')
      .delete()
      .or('sku.ilike.SKU-E2E-%,sku.ilike.SKU-REG-%,nome.eq.Produto Teste Premium,nome.eq.Produto Regressao Geral');
    if (prodError) console.warn('Clean produtos error:', prodError.message);

    // 5. Delete test clients
    const { error: cliError } = await supabase
      .from('clientes')
      .delete()
      .or('nome.eq.Carlos Teste,nome.ilike.%E2E%');
    if (cliError) console.warn('Clean clientes error:', cliError.message);

    // 6. Delete test suppliers
    const { error: fornError } = await supabase
      .from('fornecedores')
      .delete()
      .eq('nome', 'Fornecedor Teste E2E');
    if (fornError) console.warn('Clean fornecedores error:', fornError.message);

    console.log('E2E database cleanup finished.');
  } catch (err) {
    console.error('Error executing database cleanup:', err);
  }
}
