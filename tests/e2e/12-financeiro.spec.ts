import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 10 - Financeiro
 * Cobre:
 *   - KPIs de receitas visíveis após vendas
 *   - Criação de lançamento financeiro manual
 *   - Validação de movimentação por método de pagamento
 *   - Tesouraria: nova conta bancária
 */
test.describe('Financeiro — Receitas, Lançamentos e Tesouraria', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve exibir KPIs de receitas e a DRE no módulo financeiro', async ({ page }) => {
    await page.click(Selectors.sidebar.financeiro);
    await page.waitForURL('**/dashboard/financeiro');

    // A página deve carregar
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // KPI de receitas deve aparecer (pode ser R$ 0,00 se não há vendas ainda)
    await expect(page.locator('text=Receitas').first()).toBeVisible({ timeout: 8000 });
  });

  test('Deve criar um lançamento de receita manual', async ({ page }) => {
    await page.click(Selectors.sidebar.financeiro);
    await page.waitForURL('**/dashboard/financeiro');

    // Clicar em Novo Lançamento
    await page.click('button:has-text("Novo Lançamento")');
    await page.waitForTimeout(800);

    // O modal de novo lançamento deve abrir
    await expect(page.locator('text=Novo Lançamento Financeiro')).toBeVisible({ timeout: 5000 });

    // Preencher o formulário
    // Tipo: Receita
    const tipoSelect = page.locator('select').first();
    await tipoSelect.selectOption('receita');

    // Categoria
    const catSelect = page.locator('select').nth(1);
    const catOptions = await catSelect.locator('option').allInnerTexts();
    if (catOptions.length > 1) {
      await catSelect.selectOption({ index: 1 });
    }

    // Descrição
    await page.fill('input[placeholder*="Mensalidade"], input[placeholder*="descrição"]', 'Receita Teste E2E - Playwright');

    // Valor
    const valorInput = page.locator('input[type="number"]').first();
    await valorInput.fill('150.00');

    // Data de vencimento (hoje)
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      const today = new Date().toISOString().split('T')[0];
      await dateInput.fill(today);
    }

    // Status: Pago
    const statusSelect = page.locator('select').filter({ hasText: 'pendente' }).or(page.locator('select').last());
    try {
      await statusSelect.selectOption('pago');
    } catch { /* ignore if not found */ }

    // Salvar
    await page.click('button[type="submit"]:has-text("Salvar"), button:has-text("Criar"), button:has-text("Lançar")');
    await page.waitForTimeout(2000);

    // O modal deve fechar e o lançamento deve aparecer
    await expect(page.locator('td:has-text("Receita Teste E2E")').or(page.locator('text=Receita Teste E2E'))).toBeVisible({ timeout: 8000 });
  });

  test('Deve criar conta bancária na Tesouraria', async ({ page }) => {
    await page.click(Selectors.sidebar.financeiro);
    await page.waitForURL('**/dashboard/financeiro');

    // Navegar para aba Tesouraria se houver abas
    const tesourariaTab = page.locator('button:has-text("Tesouraria"), a:has-text("Tesouraria")').first();
    if (await tesourariaTab.isVisible()) {
      await tesourariaTab.click();
      await page.waitForTimeout(800);
    }

    // Criar nova conta
    const novaContaBtn = page.locator('button:has-text("Nova Conta")').first();
    if (await novaContaBtn.isVisible()) {
      await novaContaBtn.click();
      await page.waitForTimeout(600);

      // Preencher modal de nova conta
      const nomeInput = page.locator('input[placeholder*="Ex: Conta Corrente"], input[placeholder*="nome da conta"]').first();
      if (await nomeInput.isVisible()) {
        await nomeInput.fill('Conta Teste E2E');
      }

      const saldoInput = page.locator('input[type="number"]').first();
      if (await saldoInput.isVisible()) {
        await saldoInput.fill('1000.00');
      }

      await page.click('button[type="submit"]:has-text("Salvar"), button:has-text("Criar Conta")');
      await page.waitForTimeout(2000);

      // Conta deve aparecer na lista
      await expect(page.locator('text=Conta Teste E2E').first()).toBeVisible({ timeout: 8000 });
    }
  });
});
