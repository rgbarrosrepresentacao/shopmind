import { Page, expect } from '@playwright/test';
import { Selectors } from './selectors';

export async function login(page: Page, email = 'diretoaoponto.rs@gmail.com', password = '17269405') {
  await page.goto('/login');
  
  // Fill inputs
  await page.fill(Selectors.login.email, email);
  await page.fill(Selectors.login.password, password);
  
  // Click login
  await page.click(Selectors.login.submit);
  
  // Verify redirect to dashboard
  await page.waitForURL('**/dashboard**');
  await expect(page.locator('aside')).toBeVisible();
}

export async function logout(page: Page) {
  await page.goto('/dashboard'); // Go to dashboard to ensure sidebar is loaded
  await page.click('button:has-text("Sair da conta")');
  await page.waitForURL('**/login');
}

export async function loginIfNeeded(page: Page, email = 'diretoaoponto.rs@gmail.com', password = '17269405') {
  await page.goto('/dashboard');
  const isAsideVisible = await page.locator('aside').isVisible();
  if (!isAsideVisible) {
    await page.goto('/login');
    await page.fill(Selectors.login.email, email);
    await page.fill(Selectors.login.password, password);
    await page.click(Selectors.login.submit);
    await page.waitForURL('**/dashboard**');
    await expect(page.locator('aside')).toBeVisible();
  }
}
