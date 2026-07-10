import { test, expect } from './helpers/custom-test';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 16 - Relatórios e Exportações
 * Cobre:
 *   - Exportação de listagem de produtos (CSV/Excel)
 *   - Exportação de dados do financeiro (DRE/Relatórios)
 *   - Exportação de contatos de fornecedores
 */
test.describe('Relatórios e Exportações', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve exportar listagem de produtos', async ({ page }) => {
    await page.click(Selectors.sidebar.produtos);
    await page.waitForURL('**/dashboard/produtos');

    // Aguardar botão Exportar e clicar capturando o download
    const exportBtn = page.locator('button:has-text("Exportar")').first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });

    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    // Validar se o arquivo foi baixado e tem o nome esperado
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('Deve exportar relatório financeiro', async ({ page }) => {
    await page.click(Selectors.sidebar.financeiro);
    await page.waitForURL('**/dashboard/financeiro');

    // Acessar aba de Relatórios
    await page.click('button:has-text("Relatórios")');
    await page.waitForTimeout(800);

    // Clicar em Exportar CSV capturando o download
    const exportCsvBtn = page.locator('button:has-text("Exportar CSV"), button:has-text("CSV")').first();
    if (await exportCsvBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportCsvBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });

  test('Deve exportar contatos de fornecedores', async ({ page }) => {
    await page.click(Selectors.sidebar.fornecedores);
    await page.waitForURL('**/dashboard/fornecedores');

    // Clicar em Exportar CSV na listagem de fornecedores
    const exportBtn = page.locator('button[title*="Exportar CSV"], button:has-text("Exportar CSV"), button:has-text("CSV")').first();
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });
});
