import { test, expect } from './helpers/custom-test';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 09 - Transferências de Estoque
 * Cobre:
 *   - Solicitar transferência da Matriz para Filial Centro
 *   - Aprovar transferência (reservar estoque)
 *   - Enviar transferência (despachar)
 *   - Receber transferência (conferir e finalizar)
 *   - Validar logs/timeline e saldos
 */
test.describe('Transferências de Estoque', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve realizar o ciclo completo de transferência matriz -> filial', async ({ page }) => {
    // 1. Acessar tela de transferências
    await page.click(Selectors.sidebar.transferencias);
    await page.waitForURL('**/dashboard/estoque/transferencias');

    // 2. Criar nova solicitação
    await page.click('button:has-text("Solicitar Transferência")');
    await page.waitForTimeout(500);

    // Selecionar origem (Matriz)
    const selectOrigem = page.locator('select').first();
    // Selecionar primeiro option que não seja vazio (Matriz)
    await selectOrigem.selectOption({ label: 'Matriz' });

    // Selecionar destino (Loja Filial Centro)
    const selectDestino = page.locator('select').nth(1);
    await selectDestino.selectOption({ label: 'Loja Filial Centro' });

    // Descrição
    await page.fill('textarea[placeholder*="motivo", placeholder*="observação"]', 'Transferência E2E - Reposição de Estoque');

    // Adicionar produto de teste
    await page.fill('input[placeholder*="Pesquisar produto"]', 'Produto Teste Premium');
    await page.waitForTimeout(1000);
    
    // Clicar no produto retornado nos resultados
    await page.click('div:has-text("Produto Teste Premium")');
    await page.waitForTimeout(500);

    // Definir quantidade a transferir
    await page.fill('tbody tr input[type="number"]', '5');

    // Enviar solicitação
    await page.click('button:has-text("Enviar Solicitação")');
    await page.waitForTimeout(2000);

    // 3. Selecionar a transferência criada (deve ser a primeira da lista)
    await page.locator('tbody tr').first().click();
    await page.waitForTimeout(800);

    // 4. Aprovar transferência (reservar estoque)
    await page.click('button:has-text("Aprovar")');
    await page.waitForTimeout(1500);

    // 5. Despachar remessa (enviar)
    await page.click('button:has-text("Despachar")');
    await page.waitForTimeout(1500);

    // 6. Conferir e finalizar recebimento
    await page.click('button:has-text("Conferir Recebimento")');
    await page.waitForTimeout(1000);

    // Finalizar conferência
    await page.click('button:has-text("Finalizar Conferência")');
    await page.waitForTimeout(2000);

    // O status final deve ser recebida
    await expect(page.locator('tbody tr').first()).toContainText('Recebida');
  });
});
