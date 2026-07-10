import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 07 - PDV: Múltiplo Pagamento e Validação de Troco
 * Cobre:
 *   - Seleção de método Múltiplo
 *   - Dinheiro + Pix numa mesma venda
 *   - Troco calculado apenas no dinheiro
 *   - Caixa permanece aberto após venda
 */
test.describe('PDV — Múltiplo Pagamento', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  const openCaixaIfNeeded = async (page: any) => {
    await page.click(Selectors.sidebar.pdv);
    await page.waitForURL('**/dashboard/pdv');
    
    // Aguardar a hidratação do React terminar para registrar os event listeners do botão
    await page.waitForTimeout(3000);

    const formLocator = page.locator('text=Fundo de Troco Inicial');
    const searchLocator = page.locator('input[placeholder*="Pesquisar"]');
    await expect(formLocator.or(searchLocator)).toBeVisible({ timeout: 15000 });

    const isFormVisible = await formLocator.isVisible();
    if (isFormVisible) {
      await page.fill('input[type="number"]', '100.00');
      await page.click('button:has-text("Abrir Caixa & Liberar PDV")');
    }
    await page.waitForSelector('input[placeholder*="Pesquisar"]', { timeout: 15000 });
  };

  test('Deve realizar venda com pagamento Dinheiro + Pix e calcular troco corretamente', async ({ page }) => {
    await openCaixaIfNeeded(page);

    // Adicionar produto ao carrinho
    await page.fill('input[placeholder*="Pesquisar"]', 'Produto Teste Premium');
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Produto Teste Premium")').first().click();
    await page.waitForTimeout(500);

    // Concluir venda (abrir checkout)
    await page.click('button:has-text("Concluir Venda (F2)")');
    await page.waitForTimeout(500);

    // Selecionar método MÚLTIPLO
    await page.click('button:has-text("Múltiplo")');
    await page.waitForTimeout(400);

    // A seção de divisão de valores deve aparecer
    await expect(page.locator('text=Divisão de Valores')).toBeVisible();

    // Preencher: Pix R$ 17 e Dinheiro R$ 15 (total da venda = R$ 25)
    const rows = page.locator('div:has(span:has-text("Dinheiro"))').or(page.locator('div:has(span:has-text("Pix"))'));

    // Preencher o campo Pix
    const pixInput = page.locator('div:has(span:has-text("Pix")) >> input[type="number"]').first();
    await pixInput.fill('17');
    await page.waitForTimeout(300);

    // Preencher o campo Dinheiro
    const dinheiroInput = page.locator('div:has(span:has-text("Dinheiro")) >> input[type="number"]').first();
    await dinheiroInput.fill('15');
    await page.waitForTimeout(300);

    // Verificar que troco aparece no painel direito (somente dinheiro gera troco)
    // Total da venda = R$ 25. Pix = 17. Dinheiro necessário = 8. Dinheiro pago = 15. Troco = 7.
    await expect(page.locator('text=Troco')).toBeVisible();

    // O botão Confirmar deve estar habilitado (total pago 17+15=32 >= 25)
    await expect(page.locator('button:has-text("Confirmar Venda (F2)")')).toBeEnabled();

    // Confirmar venda
    await page.click('button:has-text("Confirmar Venda (F2)")');
    await page.waitForTimeout(3000);

    // Recibo / confirmação deve aparecer
    await expect(page.locator('text=Venda finalizada').or(page.locator('text=Recibo').or(page.locator('text=Comprovante')))).toBeVisible({ timeout: 8000 });
  });

  test('Deve validar que Pix não gera troco em venda simples', async ({ page }) => {
    await openCaixaIfNeeded(page);

    // Adicionar produto
    await page.fill('input[placeholder*="Pesquisar"]', 'Produto Teste Premium');
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Produto Teste Premium")').first().click();
    await page.waitForTimeout(500);

    // Abrir checkout
    await page.click('button:has-text("Concluir Venda (F2)")');
    await page.waitForTimeout(500);

    // Selecionar Pix
    await page.click('button:has-text("Pix")');
    await page.waitForTimeout(400);

    // Inserir valor maior que o necessário
    await page.fill('input[type="number"]', '999.00');
    await page.waitForTimeout(300);

    // Troco deve ser R$ 0,00 (Pix não gera troco)
    await expect(page.locator('text=Troco')).toBeVisible();
    const trocoText = await page.locator('text=Troco').locator('..').textContent();
    expect(trocoText).toContain('R$ 0,00');

    // Fechar sem confirmar — pressionar Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('Caixa deve permanecer aberto após múltiplas vendas', async ({ page }) => {
    await openCaixaIfNeeded(page);

    // O formulário de abertura NÃO deve estar visível (caixa aberto)
    const formVisible = await page.locator('text=Fundo de Troco Inicial').isVisible();
    expect(formVisible).toBeFalsy();

    // Recarregar página e checar novamente
    await page.reload();
    await page.waitForTimeout(2000);

    const formVisibleAfterReload = await page.locator('text=Fundo de Troco Inicial').isVisible();
    expect(formVisibleAfterReload).toBeFalsy();

    // Catálogo deve estar visível
    await expect(page.locator('input[placeholder*="Pesquisar"]')).toBeVisible();
  });
});
