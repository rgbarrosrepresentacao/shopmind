import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 06 - PDV: Abertura de Caixa e Venda em Dinheiro
 * Cobre:
 *   - Abertura de caixa pelo PDV
 *   - Caixa continua aberto após reload
 *   - Venda em dinheiro com cliente
 *   - Recibo exibido
 *   - Nova venda limpa carrinho
 */
test.describe('PDV — Caixa e Venda em Dinheiro', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[Browser PageError] ${err.message}`));
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve abrir o caixa e permanecer aberto após recarregar', async ({ page }) => {
    // Ir para PDV
    await page.click(Selectors.sidebar.pdv);
    await page.waitForURL('**/dashboard/pdv');
    
    // Aguardar a hidratação do React terminar para registrar os event listeners do botão
    await page.waitForTimeout(3000);

    // Aguardar o loader do caixa sumir e a página renderizar um dos dois estados possíveis
    const formLocator = page.locator('text=Fundo de Troco Inicial');
    const searchLocator = page.locator('input[placeholder*="Pesquisar"]');
    await expect(formLocator.or(searchLocator)).toBeVisible({ timeout: 15000 });

    const isFormVisible = await formLocator.isVisible();
    if (isFormVisible) {
      // Preencher valor e abrir caixa
      await page.fill('input[type="number"]', '100.00');
      await page.click('button:has-text("Abrir Caixa & Liberar PDV")');
    }

    // Caixa deve estar aberto agora — o catálogo de produtos/campo de pesquisa deve aparecer
    await expect(searchLocator).toBeVisible({ timeout: 15000 });

    // Recarregar a página
    await page.reload();
    await page.waitForTimeout(2000);

    // Caixa deve ainda estar aberto — o formulário de abertura NÃO deve estar visível
    const formApareceDepoisReload = await page.locator('text=Fundo de Troco Inicial').isVisible();
    expect(formApareceDepoisReload).toBeFalsy();

    // Catálogo deve ser visível
    await expect(page.locator('input[placeholder*="Pesquisar"]')).toBeVisible();
  });

  test('Deve realizar venda em dinheiro com cliente e exibir recibo', async ({ page }) => {
    await page.click(Selectors.sidebar.pdv);
    await page.waitForURL('**/dashboard/pdv');
    
    // Aguardar a hidratação do React terminar para registrar os event listeners do botão
    await page.waitForTimeout(3000);

    // Aguardar o loader do caixa sumir e a página renderizar um dos dois estados possíveis
    const formLocator = page.locator('text=Fundo de Troco Inicial');
    const searchLocator = page.locator('input[placeholder*="Pesquisar"]');
    await expect(formLocator.or(searchLocator)).toBeVisible({ timeout: 15000 });

    const isFormVisible = await formLocator.isVisible();
    if (isFormVisible) {
      await page.fill('input[type="number"]', '100.00');
      await page.click('button:has-text("Abrir Caixa & Liberar PDV")');
    }

    // Aguardar catálogo carregar (com timeout maior e robusto)
    await page.waitForSelector('input[placeholder*="Pesquisar"]', { timeout: 15000 });

    // Buscar e adicionar produto de teste ao carrinho
    await page.fill('input[placeholder*="Pesquisar"]', 'Produto Teste Premium');
    await page.waitForTimeout(1000);

    // Clicar no primeiro card de produto visível
    const productCard = page.locator('button:has-text("Produto Teste Premium")').first();
    await productCard.click();
    await page.waitForTimeout(500);

    // Selecionar cliente
    await page.click('button:has-text("Pesquisar cliente")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="Digitar nome"]', 'Carlos Teste');
    await page.waitForTimeout(1000);
    const clienteItem = page.locator('button:has-text("Carlos Teste")').first();
    await clienteItem.click();

    // Concluir venda
    await page.click('button:has-text("Concluir Venda (F2)")');
    await page.waitForTimeout(500);

    // Na tela de pagamento — confirmar com dinheiro (padrão já é dinheiro)
    // Inserir valor exato
    await page.click('button:has-text("Valor Exato")');
    await page.waitForTimeout(300);

    // Confirmar venda
    await page.click('button:has-text("Confirmar Venda (F2)")');
    await page.waitForTimeout(3000);

    // Recibo deve aparecer
    await expect(page.locator('text=Venda finalizada').or(page.locator('text=Recibo').or(page.locator('text=Comprovante')))).toBeVisible({ timeout: 8000 });
  });
});
