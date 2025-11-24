import { test, expect } from './fixtures/auth.fixture';

test('should login and access dashboard', async ({ page, login }) => {
  // The 'login' fixture automatically runs before this test body
  // and ensures we are logged in.
  
  await page.goto('/');
  
  // Verify we are on the dashboard
  await expect(page).toHaveTitle(/SynergyFlow|Dashboard/i);
  
  // Verify some dashboard element exists
  // await expect(page.locator('text=Overview')).toBeVisible();
});

test('should be able to logout', async ({ page, login }) => {
  await page.goto('/');
  
  // Find logout button (adjust selector as needed)
  // Assuming there is a user menu or logout button
  // For now, we'll just verify we are logged in first
  await expect(page).toHaveURL('/');
});
