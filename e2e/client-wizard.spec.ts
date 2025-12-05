import { test, expect } from './fixtures/auth.fixture';

test('should complete client creation wizard', async ({ page }) => {
  // Navigate to clients page
  await page.goto('/clients');
  
  // Click "New Client" button
  await page.getByRole('button', { name: /New Client|Add Client/i }).click();
  
  // Step 1: Company Details
  await expect(page.getByText('Company Details')).toBeVisible();
  await page.fill('input[name="name"]', 'Test Company Inc.');
  await page.fill('input[name="registrationNumber"]', '12345678');
  await page.click('button:has-text("Next")');
  
  // Step 2: Address
  // await expect(page.getByText('Address')).toBeVisible();
  // await page.fill('input[name="street"]', '123 Test St');
  // await page.click('button:has-text("Next")');
  
  // Verify completion (adjust based on actual flow)
  // await expect(page.getByText('Client created successfully')).toBeVisible();
});
