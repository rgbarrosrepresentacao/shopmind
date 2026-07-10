import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Pure Node.js loader for .env.local (no dependencies required)
try {
  const envPath = path.resolve(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envLines = envContent.split(/\r?\n/);
    for (const line of envLines) {
      if (line.trim().startsWith('#') || !line.includes('=')) continue;
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (err) {
  console.warn('Falha ao carregar .env.local de forma nativa:', err);
}

process.env.E2E_MOCK_AI = 'true';

// Detect if we should run in slow motion (500ms delay between actions)
const isSlowMode = process.env.PW_SLOW_MO || process.env.npm_lifecycle_event?.includes('slow');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['./tests/e2e/helpers/summary-reporter.ts'],
  ],
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
      slowMo: isSlowMode ? 500 : undefined,
    },
  },
  webServer: {
    command: 'npx next start -p 3001 -H 127.0.0.1',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: true,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      E2E_MOCK_AI: 'true',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'critical',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testMatch: [
        /01-auth\.spec\.ts/,
        /02-multilojas\.spec\.ts/,
        /04-produto-mestre\.spec\.ts/,
        /06-pdv-caixa\.spec\.ts/,
        /07-pdv-pagamento-multiplo\.spec\.ts/,
        /08-estoque\.spec\.ts/,
        /10-compras\.spec\.ts/,
        /12-financeiro\.spec\.ts/,
        /13-centro-comando\.spec\.ts/,
        /17-regressao-geral\.spec\.ts/
      ],
    },
    {
      name: 'full',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /global\.setup\.ts/,
    },
  ],
});
