import { Page, expect } from '@playwright/test';

/**
 * Assertions reutilizáveis para os testes E2E do ShopMind
 */

/** Valida que o dashboard principal está carregado com a sidebar visível */
export async function assertDashboardLoaded(page: Page) {
  await expect(page.locator('aside')).toBeVisible({ timeout: 8000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Valida que um toast de sucesso foi exibido */
export async function assertSuccessToast(page: Page, text?: string) {
  const toastLocator = text
    ? page.locator(`[role="status"]:has-text("${text}"), .toast:has-text("${text}")`)
    : page.locator('[role="status"], .toast-success, [data-type="success"]');
  await expect(toastLocator.first()).toBeVisible({ timeout: 5000 });
}

/** Valida que o caixa está aberto (formulário de abertura não visível) */
export async function assertCaixaAberto(page: Page) {
  const formularioFechado = page.locator('text=Fundo de Troco Inicial');
  const estaFechado = await formularioFechado.isVisible();
  expect(estaFechado).toBeFalsy();
  await expect(page.locator('input[placeholder*="Pesquisar"]')).toBeVisible({ timeout: 8000 });
}

/** Valida que o produto aparece no catálogo do PDV */
export async function assertProductInCatalog(page: Page, productName: string) {
  await page.fill('input[placeholder*="Pesquisar"]', productName);
  await page.waitForTimeout(800);
  await expect(page.locator(`button:has-text("${productName}")`).first()).toBeVisible({ timeout: 5000 });
}

/** Valida que o produto aparece na tabela de listagem */
export async function assertProductInList(page: Page, productName: string) {
  await expect(page.locator(`td:has-text("${productName}")`).first()).toBeVisible({ timeout: 8000 });
}

/** Valida que a loja ativa no StoreSwitcher é a esperada */
export async function assertActiveStore(page: Page, storeName: string) {
  await expect(page.locator('aside')).toContainText(storeName, { timeout: 5000 });
}

/** Valida que o recibo foi exibido após uma venda */
export async function assertReceiptVisible(page: Page) {
  const receipt = page.locator(
    'text=Venda finalizada, text=Recibo, text=Comprovante, text=Cupom'
  ).first();
  await expect(receipt).toBeVisible({ timeout: 10000 });
}

/** Valida que o estoque de um produto é o esperado */
export async function assertStockLevel(page: Page, productName: string, expectedStock: number) {
  const row = page.locator(`tr:has-text("${productName}")`).first();
  await expect(row).toContainText(String(expectedStock), { timeout: 5000 });
}
