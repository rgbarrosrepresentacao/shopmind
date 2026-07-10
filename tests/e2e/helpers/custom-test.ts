import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom test fixture que valida a sessão antes de cada teste
 * e pausa o navegador em caso de falha quando executado em modo headed (visual).
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const isSetup = testInfo.file.includes('global.setup.ts');
    const isAuthSpec = testInfo.file.includes('01-auth.spec.ts');
    const flagPath = path.join(process.cwd(), 'tests', 'e2e', '.auth', 'auth-failed.flag');

    // 1. Se o teste de autenticação inicial falhou anteriormente, abortar imediatamente
    if (fs.existsSync(flagPath) && !isSetup && !isAuthSpec) {
      throw new Error('Sessão E2E inválida ou login não concluído - Suíte abortada devido a falha no teste obrigatório (01-auth.spec.ts)');
    }

    // 2. Validar a sessão se não for o setup ou o teste de login
    if (!isSetup && !isAuthSpec) {
      try {
        await page.goto('/dashboard');
        await page.waitForSelector('aside, input[type="email"]', { timeout: 10000 });

        const isAsideVisible = await page.locator('aside').isVisible();
        const isLoginPage = page.url().includes('/login');

        if (!isAsideVisible || isLoginPage) {
          throw new Error('Sessão E2E inválida ou login não concluído');
        }
      } catch (err) {
        console.error(`\n❌ FALHA DE AUTENTICAÇÃO ANTES DO TESTE: ${testInfo.title}`);
        console.error(`   Causa: Sessão E2E inválida ou login não concluído`);
        throw new Error(`Sessão E2E inválida ou login não concluído (Erro: ${err instanceof Error ? err.message : String(err)})`);
      }
    }

    // 3. Executar o teste
    await use(page);

    // 4. Tratar falhas ao final do teste
    if (testInfo.status !== testInfo.expectedStatus) {
      // Se falhou no 01-auth.spec.ts, criar flag para abortar os próximos testes
      if (isAuthSpec) {
        console.error('\n❌ ERRO CRÍTICO: Falha no teste obrigatório de login (01-auth.spec.ts). Registrando flag de aborto.');
        try {
          const authDir = path.join(process.cwd(), 'tests', 'e2e', '.auth');
          if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
          }
          fs.writeFileSync(flagPath, 'failed', 'utf-8');
        } catch (e) {
          console.error('Erro ao escrever flag de falha do E2E:', e);
        }
      }

      const isHeaded = !page.context().browser()?.browserType().name() || 
                       process.argv.includes('--headed') || 
                       process.argv.includes('--debug') ||
                       process.env.PWTEST_HEADED === '1';
      
      if (isHeaded) {
        console.log(`\n❌ TESTE FALHOU: ${testInfo.title}`);
        console.log(`   Arquivo: ${testInfo.file}`);
        console.log(`   Erro: ${testInfo.error?.message?.substring(0, 200)}`);
        console.log(`\n🔍 Navegador pausado para inspeção manual.`);
        console.log(`   Feche o DevTools ou pressione "Resume" para continuar.\n`);
        
        try {
          await page.pause();
        } catch {
          // ignore
        }
      }
    }
  },
});

export { expect };
