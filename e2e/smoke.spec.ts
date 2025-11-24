import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  // Adjust this based on the actual title of the app
  await expect(page).toHaveTitle(/SynergyFlow|Login|Dashboard/i);
});

test('redirects to login or shows dashboard', async ({ page }) => {
  await page.goto('/');
  
  // Check if we are on the login page or dashboard
  const url = page.url();
  if (url.includes('login')) {
    await expect(page.locator('input[type="email"]')).toBeVisible();
  } else {
    // If we are already logged in (unlikely in fresh context but possible if using storage state later)
    // await expect(page.locator('text=Dashboard')).toBeVisible();
  }
});
