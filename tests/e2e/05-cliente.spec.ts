import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

test.describe('Gestão de Clientes e Fidelidade', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test('Deve cadastrar cliente e validar fidelidade e compartilhamento de dados', async ({ page }) => {
    // 1. Ir para a home do dashboard
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();

    // 2. Garantir Matriz ativa
    await page.click('aside >> .relative >> button');
    const matrizItem = page.locator('button:has-text("teste loja")').or(page.locator('button:has-text("Matriz")')).first();
    await matrizItem.click();
    await page.waitForTimeout(2000);

    // 3. Acessar Clientes
    await page.click(Selectors.sidebar.clientes);
    await page.waitForURL('**/dashboard/clientes');

    // 4. Criar o cliente de teste se não existir
    const clienteExistente = page.locator('td:has-text("Carlos Teste")').first();
    const existe = await clienteExistente.isVisible();

    if (!existe) {
      await page.click('button:has-text("Novo Cliente")');
      
      await page.fill('input[placeholder="Ex: João Silva"]', 'Carlos Teste');
      await page.fill('input[placeholder*="Ex: (11)"]', '11999999999');
      await page.fill('input[placeholder="Ex: 000.000.000-00"]', '000.000.000-00');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // 5. Trocar para Filial Centro e verificar se o cliente aparece
    await page.click('aside >> .relative >> button');
    const filialSwitcher = page.locator('button:has-text("Loja Filial Centro")').first();
    await filialSwitcher.click();
    await page.waitForTimeout(2000);

    await page.click(Selectors.sidebar.clientes);
    await expect(page.locator('td:has-text("Carlos Teste")')).toBeVisible();

    // 6. Abrir o perfil do cliente na filial e validar a fidelidade inicial
    // Clicar para ver o perfil do cliente
    const perfilBtn = page.locator('tr:has-text("Carlos Teste")').locator('button').first();
    await perfilBtn.click();
    await page.waitForTimeout(2000);

    // Validar pontos = 0, cashback = 0, classificação = Bronze
    await expect(page.locator('body')).toContainText('Bronze');
    // Pode mostrar "0 pontos" ou "0,00" dependendo do formato
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/0.*pont|0,00/i);

    // Voltar para Matriz
    await page.click('aside >> .relative >> button');
    const matrizSwitcherFinal = page.locator('button:has-text("teste loja")').or(page.locator('button:has-text("Matriz")')).first();
    await matrizSwitcherFinal.click();
    await page.waitForTimeout(2000);
  });
});
