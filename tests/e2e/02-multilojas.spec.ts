import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

test.describe('Multi-Lojas e Filiais', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test('Deve gerenciar filiais e trocar de contexto', async ({ page }) => {
    // 1. Ir para a home do dashboard
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();

    // 2. Ir para Multi-Lojas
    await page.click(Selectors.sidebar.multilojas);
    await page.waitForURL('**/dashboard/multilojas');

    // 3. Clicar na aba de Filiais (CRUD) se houver abas
    const filiaisTab = page.locator('button:has-text("Filiais (CRUD)")');
    if (await filiaisTab.isVisible()) {
      await filiaisTab.click();
    }

    // 4. Verificar se a filial de teste já existe
    const filialExistente = page.locator('td:has-text("Loja Filial Centro")').or(page.locator('div:has-text("Loja Filial Centro")')).first();
    const existe = await filialExistente.isVisible();

    if (!existe) {
      // Criar a filial
      await page.click('button:has-text("Nova Filial")');

      // Preencher formulário
      await page.fill('input[placeholder*="Ex: Filial Centro"]', 'Loja Filial Centro');
      await page.fill('input[placeholder*="Ex: filial-centro"]', 'loja-filial-centro');
      await page.fill('input[placeholder*="Ex: Cód Interno"]', 'loja-filial-centro');
      await page.fill('input[placeholder*="Ex: João Silva"]', 'Gerente Teste');
      await page.fill('input[placeholder*="Ex: São Paulo"]', 'Cidade Teste');
      await page.fill('input[placeholder*="Ex: (11)"]', '11999999999');

      // Salvar
      await page.click('button:has-text("Salvar Filial")');

      // Esperar fechar/recarregar
      await page.waitForTimeout(2000);
    }

    // 5. Mudar de loja usando o StoreSwitcher
    // Clica no switcher no sidebar
    await page.click('aside >> .relative >> button');

    // Seleciona a Filial Centro
    const filialItem = page.locator('button:has-text("Loja Filial Centro")').first();
    await filialItem.click();

    // Validar troca (o header deve mostrar a loja ativa ou o switcher atualizar)
    await page.waitForTimeout(2000);
    await expect(page.locator('aside')).toContainText('Loja Filial Centro');

    // 6. Voltar para a Matriz
    await page.click('aside >> .relative >> button');
    // Matriz se chama "teste loja" ou similar. Vamos clicar nela.
    const matrizItem = page.locator('button:has-text("teste loja")').or(page.locator('button:has-text("Matriz")')).first();
    await matrizItem.click();
    await page.waitForTimeout(2000);
  });
});
