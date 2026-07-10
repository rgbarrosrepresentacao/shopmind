import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

test.describe('Produto Mestre e Distribuição', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test('Deve cadastrar produto mestre, distribuir, desativar e reativar nas filiais', async ({ page }) => {
    // 1. Ir para a home do dashboard
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();

    // 2. Garantir que a Matriz está ativa
    await page.click('aside >> .relative >> button');
    const matrizItem = page.locator('button:has-text("teste loja")').or(page.locator('button:has-text("Matriz")')).first();
    await matrizItem.click();
    await page.waitForTimeout(2000);

    // 3. Acessar Novo Produto
    await page.goto('/dashboard/produtos/novo');
    const nomeInput = page.getByLabel('Nome do Produto *');
    await expect(nomeInput).toBeVisible({ timeout: 10000 });

    // Preencher Geral
    const uniqueSuffix = Date.now().toString().slice(-6);
    await nomeInput.fill('Produto Teste Premium');
    await page.getByLabel('Código SKU Mestre').fill(`SKU-E2E-${uniqueSuffix}`);
    await page.getByLabel('Código de Barras Global (EAN) *').fill(`7890000${uniqueSuffix}`);
    
    // Selecionar categoria se houver
    const catSelect = page.locator('select').first();
    const options = await catSelect.locator('option').allInnerTexts();
    if (options.length > 1) {
      await catSelect.selectOption({ index: 1 });
    }

    // Ir para a aba de Distribuição
    await page.click('button:has-text("Distribuição & Filiais")');
    await page.waitForTimeout(500);

    // Desmarcar todas para configurar manualmente apenas as desejadas
    await page.click('label:has-text("Marcar todas as filiais")');
    await page.waitForTimeout(300);

    // Configurar Matriz
    const matrizRow = page.locator('tr:has-text("Matriz")').or(page.locator('tr:has-text("teste loja")')).first();
    // Marcar checkbox
    await matrizRow.locator('[role="checkbox"]').click();
    
    // Preencher estoque, preço venda, preço custo
    await matrizRow.locator('input[type="number"]').nth(0).fill('20');
    await matrizRow.locator('input[type="number"]').nth(3).fill('25.00');
    await matrizRow.locator('input[type="number"]').nth(4).fill('10.00');

    // Configurar Filial Centro
    const filialRow = page.locator('tr:has-text("Loja Filial Centro")').first();
    // Marcar checkbox
    await filialRow.locator('[role="checkbox"]').click();
    
    // Preencher estoque, preço venda, preço custo
    await filialRow.locator('input[type="number"]').nth(0).fill('15');
    await filialRow.locator('input[type="number"]').nth(3).fill('27.00');
    await filialRow.locator('input[type="number"]').nth(4).fill('11.00');

    // Salvar
    await page.click('button:has-text("Salvar Alterações")');
    await page.waitForURL('**/dashboard/produtos');
    await expect(page.locator('td:has-text("Produto Teste Premium")').first()).toBeVisible();

    // 4. Editar produto mestre e remover filial Centro
    await page.locator('tr:has-text("Produto Teste Premium") >> button:has-text("Editar")').first().click(); // click edit
    await page.waitForURL('**/dashboard/produtos/**');
    await page.click('button:has-text("Distribuição & Filiais")');

    // Desmarcar Filial Centro
    const filialRowEdit = page.locator('tr:has-text("Loja Filial Centro")').first();
    await filialRowEdit.locator('[role="checkbox"]').click();
    
    await page.click('button:has-text("Salvar Alterações")');
    await page.waitForURL('**/dashboard/produtos');

    // 5. Trocar para Filial Centro e verificar se o produto sumiu
    await page.click('aside >> .relative >> button');
    const filialSwitcher = page.locator('button:has-text("Loja Filial Centro")').first();
    await filialSwitcher.click();
    await page.waitForTimeout(2000);

    // Deve estar vazia ou não listar o produto
    await page.click(Selectors.sidebar.produtos);
    await expect(page.locator('td:has-text("Produto Teste Premium")').first()).not.toBeVisible();

    // 6. Voltar para Matriz e reativar produto na Filial
    await page.click('aside >> .relative >> button');
    const matrizSwitcher = page.locator('button:has-text("teste loja")').or(page.locator('button:has-text("Matriz")')).first();
    await matrizSwitcher.click();
    await page.waitForTimeout(2000);

    await page.click(Selectors.sidebar.produtos);
    await page.locator('tr:has-text("Produto Teste Premium") >> button:has-text("Editar")').first().click();
    await page.waitForURL('**/dashboard/produtos/**');
    await page.click('button:has-text("Distribuição & Filiais")');

    // Marcar Filial Centro de volta
    const filialRowReactivate = page.locator('tr:has-text("Loja Filial Centro")').first();
    await filialRowReactivate.locator('[role="checkbox"]').click();
    await page.click('button:has-text("Salvar Alterações")');
    await page.waitForURL('**/dashboard/produtos');

    // 7. Trocar para Filial Centro e certificar que voltou a aparecer
    await page.click('aside >> .relative >> button');
    const filialSwitcherReactivate = page.locator('button:has-text("Loja Filial Centro")').first();
    await filialSwitcherReactivate.click();
    await page.waitForTimeout(2000);

    await page.click(Selectors.sidebar.produtos);
    await expect(page.locator('td:has-text("Produto Teste Premium")').first()).toBeVisible();

    // Voltar para Matriz
    await page.click('aside >> .relative >> button');
    const matrizSwitcherFinal = page.locator('button:has-text("teste loja")').or(page.locator('button:has-text("Matriz")')).first();
    await matrizSwitcherFinal.click();
    await page.waitForTimeout(2000);
  });
});
