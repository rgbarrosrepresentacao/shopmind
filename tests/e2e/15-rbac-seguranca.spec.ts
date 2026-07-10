import { test, expect } from './helpers/custom-test';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 15 - RBAC e Segurança de Acesso
 * Cobre:
 *   - Restrição de menus visuais por cargo
 *   - Bloqueio de acesso a rotas restritas via URL direta
 *   - Isolamento de privilégios entre Caixa e Estoquista
 */
test.describe('RBAC e Segurança de Acesso', () => {

  test.describe('Acessos do Caixa', () => {
    test.use({ storageState: 'tests/e2e/.auth/caixa.json' });

    test('Caixa deve visualizar apenas menus operacionais de venda', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.locator('aside')).toBeVisible();

      // Menus permitidos
      await expect(page.locator(Selectors.sidebar.dashboard)).toBeVisible();
      await expect(page.locator(Selectors.sidebar.pdv)).toBeVisible();
      await expect(page.locator(Selectors.sidebar.caixa)).toBeVisible();
      await expect(page.locator(Selectors.sidebar.clientes)).toBeVisible();

      // Menus restritos (não devem aparecer)
      await expect(page.locator(Selectors.sidebar.financeiro)).not.toBeVisible();
      await expect(page.locator(Selectors.sidebar.multilojas)).not.toBeVisible();
      await expect(page.locator(Selectors.sidebar.usuarios)).not.toBeVisible();
      await expect(page.locator(Selectors.sidebar.centroComando)).not.toBeVisible();
    });

    test('Caixa tentando acessar rota restrita direta deve ser redirecionado', async ({ page }) => {
      await page.goto('/dashboard/multilojas');
      // Deve ser jogado de volta para o dashboard ou home devido ao middleware/RBAC
      await page.waitForURL('**/dashboard');
    });
  });

  test.describe('Acessos do Estoquista', () => {
    test.use({ storageState: 'tests/e2e/.auth/estoquista.json' });

    test('Estoquista deve visualizar menus de estoque e compras mas não de finanças/configurações', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.locator('aside')).toBeVisible();

      // Menus permitidos
      await expect(page.locator(Selectors.sidebar.produtos)).toBeVisible();
      await expect(page.locator(Selectors.sidebar.estoque)).toBeVisible();
      await expect(page.locator(Selectors.sidebar.compras)).toBeVisible();
      await expect(page.locator(Selectors.sidebar.fornecedores)).toBeVisible();

      // Menus restritos
      await expect(page.locator(Selectors.sidebar.usuarios)).not.toBeVisible();
      await expect(page.locator(Selectors.sidebar.financeiro)).not.toBeVisible();
      await expect(page.locator(Selectors.sidebar.multilojas)).not.toBeVisible();
    });

    test('Estoquista tentando acessar rota restrita direta deve ser redirecionado', async ({ page }) => {
      await page.goto('/dashboard/usuarios');
      await page.waitForURL('**/dashboard');
    });
  });
});
