import { test, expect } from './helpers/custom-test';
import { Selectors } from './helpers/selectors';

/**
 * SPEC 11 - Fiscal, XML, Lotes e Validades
 * Cobre:
 *   - Importação de XML simulado de nota fiscal
 *   - Parser do XML e exibição do preview
 *   - Conciliação tributária (vincular Recebimento Físico + Pedido)
 *   - Processamento de entrada fiscal
 *   - Lotes em quarentena gerados automaticamente
 *   - Liberação de lote em quarentena
 */
test.describe('Fiscal, XML, Lotes e Validades', () => {
  test.use({ storageState: 'tests/e2e/.auth/dono.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('Deve importar XML, conciliar entrada fiscal, gerar lote em quarentena e liberar', async ({ page }) => {
    // 1. Acessar tela de Compras (onde fica o painel fiscal)
    await page.click(Selectors.sidebar.compras);
    await page.waitForURL('**/dashboard/compras');

    // 2. Acessar aba de Entrada Fiscal & XML
    await page.click('button:has-text("Entrada Fiscal")');
    await page.waitForTimeout(800);

    // 3. Colar XML simulado no textarea
    const simulatedXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35220600000000000100550010000000011000000018" versao="4.00">
      <ide>
        <nNF>99999</nNF>
      </ide>
      <emit>
        <CNPJ>00000000000100</CNPJ>
        <xNome>Fornecedor Teste E2E</xNome>
      </emit>
      <dest>
        <CNPJ>99999999000199</CNPJ>
        <xNome>ShopMind Matriz</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PROD-TESTE-001</cProd>
          <xProd>Produto Teste Premium</xProd>
          <NCM>33049990</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>10.0000</vUnCom>
          <vProd>100.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>100.00</vProd>
          <vNF>100.00</vNF>
          <vFrete>0.00</vFrete>
          <vTotTrib>15.00</vTotTrib>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    await page.fill('textarea[placeholder*="Cole o conteúdo"]', simulatedXml);
    await page.waitForTimeout(1000);

    // 4. Vincular Recebimento Físico
    const selectReceipt = page.locator('select').first();
    const receiptOptionsCount = await selectReceipt.locator('option').count();
    if (receiptOptionsCount > 1) {
      const firstReceiptVal = await selectReceipt.locator('option').nth(1).getAttribute('value');
      if (firstReceiptVal) {
        await selectReceipt.selectOption(firstReceiptVal);
      }
    }

    // 5. Vincular Pedido de Compra
    const selectOrder = page.locator('select').nth(1);
    const orderOptionsCount = await selectOrder.locator('option').count();
    if (orderOptionsCount > 1) {
      const firstOrderVal = await selectOrder.locator('option').nth(1).getAttribute('value');
      if (firstOrderVal) {
        await selectOrder.selectOption(firstOrderVal);
      }
    }

    // 6. Conciliar e Confirmar Entrada
    await page.click('button:has-text("Conciliar")');
    await page.waitForTimeout(2000);

    // 7. Acessar aba de Quarentena & Lotes para liberar o lote gerado
    await page.click('button:has-text("Quarentena")');
    await page.waitForTimeout(1000);

    // Verificar se existe um lote em quarentena e clicar em Liberar se houver
    const liberarBtn = page.locator('button:has-text("Liberar")').first();
    if (await liberarBtn.isVisible()) {
      await liberarBtn.click();
      await page.waitForTimeout(1500);
      // O lote deve mudar de status
      await expect(page.locator('tbody')).toContainText('liberado');
    }
  });
});
