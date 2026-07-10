import { test, expect } from './helpers/custom-test';
import { Selectors } from './helpers/selectors';

test.describe('Usuários e Permissões (RBAC)', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test('Deve visualizar colaboradores de teste cadastrados', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();

    // Acessar Usuários
    await page.click(Selectors.sidebar.usuarios);
    await page.waitForURL('**/dashboard/usuarios');

    // Verificar colaboradores de teste criados no setup
    await expect(page.locator('td:has-text("caixa.teste@shopmind.com")').first()).toBeVisible();
    await expect(page.locator('td:has-text("estoque.teste@shopmind.com")').first()).toBeVisible();
    await expect(page.locator('td:has-text("gerente.teste@shopmind.com")').first()).toBeVisible();
  });
});
