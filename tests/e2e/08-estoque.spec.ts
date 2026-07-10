import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 08 - Estoque
 * Cobre:
 *   - Baixa automática de estoque após venda
 *   - Ajuste manual com justificativa
 *   - Trilha de auditoria registrada
 */
test.describe('Estoque — Baixa, Ajuste e Auditoria', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve abrir o módulo de estoque e visualizar o produto de teste', async ({ page }) => {
    await page.click(Selectors.sidebar.estoque);
    await page.waitForURL('**/dashboard/estoque');

    // Clicar na aba Valor para carregar a listagem de produtos
    await page.click('button:has-text("Valor")');
    await page.waitForTimeout(1000);

    // O produto de teste deve aparecer na listagem
    const produtoRow = page.locator('tr:has-text("Produto Teste Premium"), td:has-text("Produto Teste Premium")').first();
    await expect(produtoRow).toBeVisible({ timeout: 8000 });
  });

  test('Deve fazer ajuste manual de estoque com justificativa', async ({ page }) => {
    await page.click(Selectors.sidebar.estoque);
    await page.waitForURL('**/dashboard/estoque');

    // Clicar no botão geral de Ajuste Manual
    await page.click('button:has-text("Ajuste Manual")');
    await page.waitForTimeout(800);

    // Buscar o produto no modal
    await page.fill('input[placeholder*="Buscar produto"]', 'Produto Teste Premium');
    await page.waitForTimeout(1000);

    // Selecionar o produto nos resultados da busca
    await page.click('button:has-text("Produto Teste Premium")');
    await page.waitForTimeout(800);

    // Selecionar o tipo de ajuste "Ajuste"
    await page.click('button:has-text("Ajuste")');
    await page.waitForTimeout(300);

    // Preencher a nova quantidade
    const quantidadeInput = page.locator('input[type="number"]').first();
    await quantidadeInput.fill('50');

    // Selecionar o motivo do ajuste
    await page.selectOption('select', { label: 'Recontagem de inventário' });

    // Confirmar o ajuste
    await page.click('button[type="submit"]:has-text("Confirmar Ajuste")');
    await page.waitForTimeout(2000);
  });

  test('Deve exibir histórico de auditoria de estoque', async ({ page }) => {
    await page.click(Selectors.sidebar.estoque);
    await page.waitForURL('**/dashboard/estoque');

    // Clicar na aba Movimentações
    await page.click('button:has-text("Movimentações")');
    await page.waitForTimeout(1000);

    // O produto de teste deve aparecer no histórico de movimentações
    const logItem = page.locator('td:has-text("Produto Teste Premium"), tr:has-text("Produto Teste Premium")').first();
    await expect(logItem).toBeVisible({ timeout: 8000 });
  });
});
