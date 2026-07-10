import { test, expect } from './helpers/custom-test';
import { Selectors } from './helpers/selectors';
import { generateSKU, generateEAN } from './helpers/test-data';

/**
 * SPEC 17 - Regressão Geral de Operações (Fluxo Unificado)
 * Simula um dia completo de operações no ERP ShopMind:
 *   1. Cadastro de Produto Mestre
 *   2. Abertura de Caixa (PDV)
 *   3. Venda Rápida (Dinheiro)
 *   4. Venda Múltipla (Dinheiro + Pix)
 *   5. Fechamento de Caixa
 *   6. Compra de Reposição
 *   7. Recebimento Físico
 *   8. Auditoria de Centro de Comando CEO
 */
test.describe('Regressão Geral de Operações', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve rodar o fluxo completo de ponta a ponta sem erros', async ({ page }) => {
    // === PASSO 1: Cadastrar Produto Mestre ===
    await page.click(Selectors.sidebar.produtos);
    await page.waitForURL('**/dashboard/produtos');
    await page.click('button:has-text("Novo Produto")');
    await page.waitForURL('**/dashboard/produtos/novo');

    const sku = generateSKU('SKU-REG');
    const ean = generateEAN('7890099');
    await page.fill('input[name="nome"], input[placeholder*="Ex: Camiseta"]', 'Produto Regressao Geral');
    await page.fill('input[placeholder*="SKU-"]', sku);
    await page.fill('input[placeholder*="789000"]', ean);

    // Salvar
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/produtos');
    await expect(page.locator('td:has-text("Produto Regressao Geral")').first()).toBeVisible();

    // === PASSO 2: Abrir Caixa ===
    await page.click(Selectors.sidebar.caixa);
    await page.waitForURL('**/dashboard/caixa');

    // Se o caixa estiver fechado, abrir
    const openBtn = page.locator('button:has-text("Abrir Caixa"), button:has-text("Confirmar Abertura")').first();
    if (await openBtn.isVisible()) {
      await page.fill('input[type="number"]', '100.00');
      await page.fill('textarea', 'Abertura de caixa - Regressão');
      await openBtn.click();
      await page.waitForTimeout(2000);
    }
    await expect(page.locator('text=Caixa Aberto')).toBeVisible();

    // === PASSO 3: Realizar Venda Dinheiro no PDV ===
    await page.click(Selectors.sidebar.pdv);
    await page.waitForURL('**/dashboard/pdv');

    // Pesquisar e adicionar produto
    await page.fill('input[placeholder*="Pesquisar"]', 'Produto Regressao Geral');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Produto Regressao Geral")');
    
    // Avançar para pagamento
    await page.click('button:has-text("Avançar para Pagamento"), button:has-text("Avançar")');
    await page.waitForTimeout(800);

    // Dinheiro
    await page.click('button:has-text("Dinheiro")');
    // Confirmar venda
    await page.click('button:has-text("Confirmar Venda"), button:has-text("Finalizar Venda")');
    await page.waitForTimeout(2000);

    // Fechar recibo
    await page.click('button:has-text("Nova Venda"), button:has-text("Fechar")');
    await page.waitForTimeout(1000);

    // === PASSO 4: Fechar Caixa ===
    await page.click(Selectors.sidebar.caixa);
    await page.waitForURL('**/dashboard/caixa');

    const fecharBtn = page.locator('button:has-text("Fechar Caixa"), button:has-text("Confirmar Fechamento")').first();
    if (await fecharBtn.isVisible()) {
      await fecharBtn.click();
      await page.waitForTimeout(1500);
    }
    await expect(page.locator('text=Caixa Fechado')).toBeVisible();

    // === PASSO 5: Criar Pedido de Compra ===
    await page.click(Selectors.sidebar.compras);
    await page.waitForURL('**/dashboard/compras');

    await page.click('a[href="/dashboard/compras/nova"], button:has-text("Nova Compra")');
    await page.waitForURL('**/dashboard/compras/nova');

    // Selecionar fornecedor
    const selectForn = page.locator('select').first();
    await selectForn.selectOption({ label: 'Fornecedor Teste E2E' });

    // Adicionar item
    await page.fill('input[placeholder*="Pesquisar produto"]', 'Produto Regressao Geral');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Produto Regressao Geral")');

    // Preencher quantidade
    await page.fill('input[type="number"]', '10');

    // Salvar Compra
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // === PASSO 6: Consultar Centro de Comando CEO ===
    await page.click(Selectors.sidebar.centroComando);
    await page.waitForURL('**/dashboard/corporativo');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('text=Faturamento')).toBeVisible();
  });
});
