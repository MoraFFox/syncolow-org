
import { test as authTest, expect } from './fixtures/auth.fixture';
import { mockSupabase } from './fixtures/supabase-mocks';

authTest.describe('Notification Delivery', () => {
  
  authTest('should generate a notification for a high value order', async ({ page }) => {
    // Debug network
    page.on('request', request => console.log('>>', request.method(), request.url()));
    page.on('response', response => console.log('<<', response.status(), response.url()));

    // Apply global Supabase mocks
    await mockSupabase(page);
    
    // Specific mocks for this test
    await page.route('**/rest/v1/products*', async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
            { id: 'prod-1', name: 'Solar Panel System', price: 1200, stock: 100, category: 'Solar' }
        ]) });
    });
    await page.route('**/rest/v1/companies*', async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
            { id: 'comp-1', name: 'Test Company', email: 'test@comp.com' }
        ]) });
    });

    // 1. Navigate to Orders page
    await page.goto('/orders');
    
    // 2. Open New Order Wizard
    try {
        await page.getByRole('button', { name: 'Create Order' }).click({ timeout: 10000 });
    } catch (e) {
        console.log('Create Order button not found. Page content:');
        // console.log(await page.content());
        throw e;
    }
    
    // Wait for dialog to open
    await page.waitForSelector('div[role="dialog"]');
    
    // 3. Step 1: Client Details
    // Use a robust selector for the client dropdown trigger
    const clientTrigger = page.locator('button[role="combobox"]:has-text("Select client")');
    await clientTrigger.waitFor({ state: 'visible' });
    await clientTrigger.click();
    
    // Select the company from the dropdown
    const companyOption = page.getByRole('option', { name: 'Test Company' });
    await companyOption.waitFor({ state: 'visible' });
    await companyOption.click();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    
    // 4. Step 2: Order Items
    const productTrigger = page.locator('button[role="combobox"]:has-text("Select products...")');
    await productTrigger.waitFor({ state: 'visible' });
    await productTrigger.click();
    await page.getByPlaceholder('Search products...').fill('Solar Panel System');
    await page.getByRole('option', { name: 'Solar Panel System' }).click();
    // Close popover
    await page.keyboard.press('Escape');
    
    // Set quantity to reach high value (> $10,000)
    // Price is 1200. Need 9 items -> 10800.
    const quantityInput = page.locator('input[type="number"]').first();
    await quantityInput.fill('10');
    
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    
    // 5. Step 3: Review & Submit
    await page.getByRole('button', { name: 'Submit Order' }).click();
    
    // 6. Verify Success Toast
    await expect(page.getByText('Order created successfully')).toBeVisible();
    
    // 7. Trigger Notification Generation
    // The app generates notifications on mount or when data changes if list is empty.
    // We might need to reload to force the generation logic in AppShell to run again
    // or wait for the store to update.
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 8. Verify Bell Icon Badge
    // The bell icon should have a badge if a notification was generated
    const bellButton = page.locator('button').filter({ has: page.locator('svg.lucide-bell') });
    await expect(bellButton).toBeVisible();
    
    // Check for the badge (absolute positioned span)
    // We can check if the text "1" or similar exists inside the button
    // or check for the specific badge class
    await expect(bellButton.locator('span.absolute').first()).toBeVisible();
    
    // 9. Verify Notification Content
    await bellButton.click();
    // Wait for popover content
    await expect(page.getByRole('dialog')).toBeVisible(); 
    
    // Check for "High Value Order" text
    await expect(page.getByText('High Value Order Received')).toBeVisible();
  });

});
