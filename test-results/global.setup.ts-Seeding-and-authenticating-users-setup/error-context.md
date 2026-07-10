# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: global.setup.ts >> Seeding and authenticating users
- Location: tests\e2e\global.setup.ts:9:6

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('aside')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('aside')

```

```yaml
- alert
```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | import { Selectors } from './selectors';
  3  | 
  4  | export async function login(page: Page, email = 'diretoaoponto.rs@gmail.com', password = '17269405') {
  5  |   await page.goto('/login');
  6  |   
  7  |   // Fill inputs
  8  |   await page.fill(Selectors.login.email, email);
  9  |   await page.fill(Selectors.login.password, password);
  10 |   
  11 |   // Click login
  12 |   await page.click(Selectors.login.submit);
  13 |   
  14 |   // Verify redirect to dashboard
  15 |   await page.waitForURL('**/dashboard**');
> 16 |   await expect(page.locator('aside')).toBeVisible();
     |                                       ^ Error: expect(locator).toBeVisible() failed
  17 | }
  18 | 
  19 | export async function logout(page: Page) {
  20 |   await page.goto('/dashboard'); // Go to dashboard to ensure sidebar is loaded
  21 |   await page.click('button:has-text("Sair da conta")');
  22 |   await page.waitForURL('**/login');
  23 | }
  24 | 
  25 | export async function loginIfNeeded(page: Page, email = 'diretoaoponto.rs@gmail.com', password = '17269405') {
  26 |   await page.goto('/dashboard');
  27 |   const isAsideVisible = await page.locator('aside').isVisible();
  28 |   if (!isAsideVisible) {
  29 |     await page.goto('/login');
  30 |     await page.fill(Selectors.login.email, email);
  31 |     await page.fill(Selectors.login.password, password);
  32 |     await page.click(Selectors.login.submit);
  33 |     await page.waitForURL('**/dashboard**');
  34 |     await expect(page.locator('aside')).toBeVisible();
  35 |   }
  36 | }
  37 | 
```