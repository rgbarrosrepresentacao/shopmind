import { test, expect } from './helpers/custom-test';
import { login } from './helpers/login';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 12 - IA Gerente e IA CEO
 * Cobre:
 *   - Acesso à página da IA
 *   - Interface de chat carregada
 *   - Sugestões rápidas visíveis
 *   - Resposta mockada ou sem erro de timeout
 *   - Painel de indicadores da IA visível
 *
 * NOTA: Este teste NÃO consome créditos OpenAI.
 * Valida apenas que a interface carrega e está funcionando,
 * sem enviar mensagens que disparariam chamadas de API reais.
 */
test.describe('IA Gerente — Interface e Indicadores', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve carregar a página da IA Gerente com a interface de chat', async ({ page }) => {
    await page.click(Selectors.sidebar.ia);
    await page.waitForURL('**/dashboard/ia');

    // A página deve carregar
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // O chat da IA deve estar visível
    await expect(page.locator('text="IA Gerente Inteligente"').first()).toBeVisible({ timeout: 8000 });
  });

  test('Deve exibir sugestões de perguntas rápidas', async ({ page }) => {
    await page.click(Selectors.sidebar.ia);
    await page.waitForURL('**/dashboard/ia');
    await page.waitForTimeout(2000);

    // Sugestões devem aparecer (chips/buttons de perguntas rápidas)
    const sugestoes = page.locator('button:has-text("estoque"), button:has-text("vendas"), button:has-text("faturamento"), button:has-text("relatório")').first();
    await expect(sugestoes).toBeVisible({ timeout: 8000 });
  });

  test('Deve exibir o painel de KPIs contextuais da IA', async ({ page }) => {
    await page.click(Selectors.sidebar.ia);
    await page.waitForURL('**/dashboard/ia');
    await page.waitForTimeout(1000);

    // Clicar na aba de Insights
    await page.click('button:has-text("Insights Gratuitos")');
    await page.waitForTimeout(500);

    // O painel lateral com dados do negócio deve aparecer
    const kpiPanel = page.locator('text="Alerta de Reposição de Estoque"').first();
    await expect(kpiPanel).toBeVisible({ timeout: 8000 });
  });

  test('Deve ter campo de input para envio de mensagem', async ({ page }) => {
    await page.click(Selectors.sidebar.ia);
    await page.waitForURL('**/dashboard/ia');
    await page.waitForTimeout(2000);

    // Campo de digitação de mensagem
    const inputMensagem = page.locator('input[placeholder*="saúde financeira"]').first();
    await expect(inputMensagem).toBeVisible({ timeout: 8000 });

    // Deve ser possível digitar no campo sem erro
    await inputMensagem.fill('Como estão as vendas de hoje?');
    await expect(inputMensagem).toHaveValue('Como estão as vendas de hoje?');

    // NÃO enviar para não consumir créditos — apenas limpar
    await inputMensagem.fill('');
  });
});
