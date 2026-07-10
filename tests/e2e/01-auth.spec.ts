import { test, expect } from './helpers/custom-test';
import { login, logout } from './helpers/login';
import { SEED_DATA } from './helpers/seed';

test.describe('Autenticação Manual', () => {
  test('Deve logar como dono com sucesso e deslogar manualmente', async ({ page }) => {
    await login(page, SEED_DATA.owner.email, SEED_DATA.owner.password);
    await expect(page.locator('h1:has-text("Painel")').or(page.locator('h1'))).toBeVisible();
    await expect(page.locator('aside')).toContainText('diretoaoponto.rs@gmail.com');
    await logout(page);
  });
});

test.describe('Autenticação de Sessão Salva (storageState)', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test('Deve carregar a sessão salva do dono e abrir o painel autenticado', async ({ page, context }) => {
    // 1. Log dos cookies restaurados
    const cookies = await context.cookies();
    console.log('--- DEBUG COOKIES INICIO ---');
    console.log(JSON.stringify(cookies, null, 2));
    console.log('--- DEBUG COOKIES FIM ---');

    // 2. Ir direto ao dashboard
    await page.goto('/dashboard');
    
    // Esperar um pouco para ver se redireciona
    await page.waitForTimeout(3000);

    // 3. Validar se a barra lateral (aside) está visível
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside')).toContainText('diretoaoponto.rs@gmail.com');
  });
});
