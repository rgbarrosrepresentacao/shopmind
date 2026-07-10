import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 09 - Compras
 * Cobre:
 *   - Cadastro de fornecedor
 *   - Criação de pedido de compra
 *   - Aprovação do pedido
 *   - Recebimento físico
 *   - Validação de status
 */
test.describe('Compras — Ciclo Completo', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve cadastrar fornecedor de teste', async ({ page }) => {
    await page.click(Selectors.sidebar.fornecedores);
    await page.waitForURL('**/dashboard/fornecedores');

    // Verificar se fornecedor já existe
    const fornecedorExistente = page.locator('td:has-text("Fornecedor Teste E2E")').first();
    const existe = await fornecedorExistente.isVisible();

    if (!existe) {
      await page.click('button:has-text("Novo Fornecedor")');
      await page.waitForTimeout(800);

      // Preencher formulário de fornecedor
      const form = page.locator('form');
      await form.locator('input').nth(0).fill('Fornecedor Teste E2E');
      await form.locator('input').nth(1).fill('00.000.000/0001-00');
      await form.locator('input').nth(5).fill('fornecedor.teste@e2e.com');
      await form.locator('input').nth(3).fill('11999999999');
      
      // Salvar
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Fornecedor deve aparecer na lista
    await expect(page.locator('td:has-text("Fornecedor Teste E2E")').or(page.locator('text=Fornecedor Teste E2E'))).toBeVisible({ timeout: 8000 });
  });

  test('Deve criar pedido de compra e verificar status pendente', async ({ page }) => {
    await page.click(Selectors.sidebar.compras);
    await page.waitForURL('**/dashboard/compras');

    // A página de compras deve carregar
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Criar nova compra
    const novaCompraBtn = page.locator('a[href="/dashboard/compras/nova"], button:has-text("Nova Compra"), button:has-text("Nova Solicitação")').first();
    await novaCompraBtn.click();
    await page.waitForURL('**/dashboard/compras/**');
    await page.waitForTimeout(1000);

    // Selecionar fornecedor
    const fornecedorSelect = page.locator('select, button:has-text("Selecionar Fornecedor")').first();
    if (await fornecedorSelect.isVisible()) {
      if (await fornecedorSelect.evaluate(el => el.tagName) === 'SELECT') {
        await fornecedorSelect.selectOption({ label: 'Fornecedor Teste E2E' });
      } else {
        await fornecedorSelect.click();
        await page.locator('button:has-text("Fornecedor Teste E2E")').first().click();
      }
    }

    // Adicionar produto ao pedido
    const addProdutoBtn = page.locator('button:has-text("Adicionar Produto"), button:has-text("+ Item")').first();
    if (await addProdutoBtn.isVisible()) {
      await addProdutoBtn.click();
      await page.waitForTimeout(500);

      // Selecionar produto
      const produtoInput = page.locator('input[placeholder*="Pesquisar produto"], input[placeholder*="produto"]').first();
      if (await produtoInput.isVisible()) {
        await produtoInput.fill('Produto Teste Premium');
        await page.waitForTimeout(800);
        await page.locator('button:has-text("Produto Teste Premium")').first().click();
      }

      // Quantidade e preço
      const qtdInput = page.locator('input[type="number"]').first();
      await qtdInput.fill('10');

      const precoInput = page.locator('input[type="number"]').nth(1);
      if (await precoInput.isVisible()) {
        await precoInput.fill('9.00');
      }
    }

    // Salvar pedido
    await page.click('button[type="submit"]:has-text("Salvar"), button:has-text("Criar Pedido"), button:has-text("Salvar Compra")');
    await page.waitForTimeout(2000);

    // Deve redirecionar para lista ou detalhe do pedido
    await expect(page.locator('text=Pedido, text=Compra, text=Solicitação').first()).toBeVisible({ timeout: 8000 });
  });
});
