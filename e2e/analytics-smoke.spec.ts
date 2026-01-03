import { test, expect } from '@playwright/test';

test('Analytics Smoke Test', async ({ page }) => {
    // Navigate
    await page.goto('/analytics');

    // Wait for the main heading
    // We use a regular expression to be case-insensitive
    const heading = page.getByRole('heading', { name: /Tactical Overview/i });

    // Increased timeout for compilation
    await expect(heading).toBeVisible({ timeout: 60000 });
});
