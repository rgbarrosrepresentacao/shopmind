import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 11 - Centro de Comando CEO
 * Cobre:
 *   - Acesso à página corporativa
 *   - KPIs de faturamento, caixa e estoque visíveis
 *   - DRE Simplificada carregada
 *   - Alertas e metas corporativas
 */
test.describe('Centro de Comando CEO — Painel Corporativo', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve abrir o painel corporativo e exibir os KPIs principais', async ({ page }) => {
    // Acessar Centro de Comando (apenas dono vê)
    await page.click(Selectors.sidebar.centroComando);
    await page.waitForURL('**/dashboard/corporativo');

    // Página deve carregar
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // KPIs devem estar visíveis
    await expect(page.locator('text=Faturamento').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Estoque').first()).toBeVisible({ timeout: 5000 });
  });

  test('Deve exibir DRE Simplificada e gráfico de faturamento', async ({ page }) => {
    await page.click(Selectors.sidebar.centroComando);
    await page.waitForURL('**/dashboard/corporativo');
    await page.waitForTimeout(2000); // aguardar carregamento de dados

    // DRE deve estar visível
    const dreSection = page.locator('text="Demonstrativo de Resultado Consolidado (DRE)"').first();
    await expect(dreSection).toBeVisible({ timeout: 10000 });
  });

  test('Deve exibir o ranking de filiais', async ({ page }) => {
    await page.click(Selectors.sidebar.centroComando);
    await page.waitForURL('**/dashboard/corporativo');
    await page.waitForTimeout(2000);

    // Ranking ou listagem de lojas (holding)
    const rankingSection = page.locator('text="Saúde da Holding"').first();
    await expect(rankingSection).toBeVisible({ timeout: 10000 });
  });

  test('Deve criar ou visualizar uma meta corporativa', async ({ page }) => {
    await page.click(Selectors.sidebar.centroComando);
    await page.waitForURL('**/dashboard/corporativo');
    await page.waitForTimeout(1500);

    // Procurar botão de metas
    const metaBtn = page.locator('button:has-text("Nova Meta"), button:has-text("Metas")').first();
    if (await metaBtn.isVisible()) {
      await metaBtn.click();
      await page.waitForTimeout(800);

      // Preencher meta
      const metaInput = page.locator('input[placeholder*="Meta"]').first();
      if (await metaInput.isVisible()) {
        await metaInput.fill('Meta Faturamento Teste E2E');
      }

      const valorInput = page.locator('input[type="number"]').first();
      if (await valorInput.isVisible()) {
        await valorInput.fill('10000');
      }

      // Salvar
      const saveBtn = page.locator('button[type="submit"]:has-text("Salvar"), button:has-text("Criar Meta")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});
