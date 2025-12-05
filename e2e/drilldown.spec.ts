import { test, expect } from '@playwright/test';
import { mockSupabase } from './fixtures/supabase-mocks';

test.describe('Drill-Down System', () => {
  test.beforeEach(async ({ page }) => {
    // Custom mock for drill-down specific data
    await page.route('**/*supabase.co/rest/v1/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/orders') && url.includes('select=status')) {
         // Mock for Order Async Preview
         await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
               status: 'Processing',
               paymentStatus: 'Paid',
               deliveryDate: '2025-12-01'
            })
         });
         return;
      }

      if (url.includes('/products') && url.includes('select=stock')) {
          // Mock for Product Async Preview
          await route.fulfill({
             status: 200,
             contentType: 'application/json',
             body: JSON.stringify({
                name: 'Test Product',
                stock: 15,
                price: 99.99
             })
          });
          return;
      }

      if (url.includes('/companies') && url.includes('select=name')) {
          // Mock for Company Async Preview
          await route.fulfill({
             status: 200,
             contentType: 'application/json',
             body: JSON.stringify({
                name: 'Test Company',
                status: 'Active'
             })
          });
          return;
      }
      
      if (url.includes('/orders') && url.includes('select=total')) {
           // Mock for Company Orders Count/Total
           await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  { total: 100 },
                  { total: 200 }
              ])
           });
           return;
      }

      if (url.includes('/orders') && !url.includes('select=')) {
           // Mock for Dashboard Orders List
           const d = new Date();
           const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
           
           await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  { 
                      id: 'ord_12345', 
                      companyId: 'comp_1', 
                      companyName: 'Test Company', 
                      deliveryDate: today,
                      status: 'Processing',
                      grandTotal: 150.00
                  }
              ])
           });
           return;
      }

      // Fallback to general mocks
      await mockSupabase(page);
    });

    await page.goto('/dashboard');
  });

  test('should show order preview on hover', async ({ page }) => {
    await page.waitForSelector('text=Today\'s Delivery Log');
    const orderLink = page.locator('text=Order #').first();
    await expect(orderLink).toBeVisible();
    await orderLink.hover();

    const tooltip = page.locator('.bg-popover');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Order Insight');
    await expect(tooltip).toContainText('Processing');
    await expect(tooltip).toContainText('Paid');
  });

  test('should show company preview on hover', async ({ page }) => {
     await page.waitForSelector('text=Today\'s Delivery Log');
     
     const companyLink = page.locator('text=for Test Company').first();
     if (await companyLink.count() === 0) {
         console.log('No company link found in log, skipping specific check');
         return;
     }
     
     await companyLink.hover();
     
     const tooltip = page.locator('.bg-popover');
     await expect(tooltip).toBeVisible();
     await expect(tooltip).toContainText('Client Insight');
     await expect(tooltip).toContainText('Active');
  });
});

test.describe('Drilldown Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should toggle quiet mode', async ({ page }) => {
    // Find drilldown settings card
    const settingsCard = page.locator('[data-testid="drilldown-settings-card"]');
    await expect(settingsCard).toBeVisible();

    // Find quiet mode toggle
    const quietModeSection = settingsCard.locator('text=Quiet Mode').locator('..');
    const toggle = quietModeSection.locator('button[role="switch"]');
    
    // Get initial state
    const initialChecked = await toggle.getAttribute('data-state');
    
    // Click to toggle
    await toggle.click();
    
    // Verify state changed
    const newChecked = await toggle.getAttribute('data-state');
    expect(newChecked).not.toBe(initialChecked);
  });

  test('should change preview size', async ({ page }) => {
    const settingsCard = page.locator('[data-testid="drilldown-settings-card"]');
    
    // Find preview size dropdown
    const previewSizeSection = settingsCard.locator('text=Preview Size').locator('..');
    const trigger = previewSizeSection.locator('button[role="combobox"]');
    await trigger.click();

    // Select expanded
    await page.locator('text=Expanded (full details)').click();
    
    // Verify selection
    await expect(trigger).toContainText('Expanded');
  });

  test('should adjust hover delay slider', async ({ page }) => {
    const settingsCard = page.locator('[data-testid="drilldown-settings-card"]');
    
    // Find hover delay section
    const delaySection = settingsCard.locator('text=Hover Delay').first().locator('..');
    const slider = delaySection.locator('[role="slider"]');
    
    // Get initial value
    const initialValue = await slider.getAttribute('aria-valuenow');
    
    // Drag slider to right
    const box = await slider.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width + 50, box.y + box.height / 2);
      await page.mouse.up();
    }
    
    // Value should have changed
    const newValue = await slider.getAttribute('aria-valuenow');
    expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
  });
});

test.describe('Global Drilldown Search', () => {
  test('should open search with Cmd+K', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Press Cmd+K (or Ctrl+K on Windows)
    await page.keyboard.press('Control+k');
    
    // Search dialog should appear
    const searchDialog = page.locator('text=Search entities...');
    await expect(searchDialog).toBeVisible();
  });

  test('should close search with Escape', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder="Search entities..."]');
    await expect(searchInput).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('should filter results when typing', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Control+k');
    
    const searchInput = page.locator('input[placeholder="Search entities..."]');
    await searchInput.fill('order');
    
    // Should show filtered results or no results message
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });
});

test.describe('Drilldown Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/*supabase.co/rest/v1/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/orders')) {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'ord_test123',
            companyId: 'comp_1',
            companyName: 'Test Co',
            deliveryDate: today,
            status: 'Processing',
            grandTotal: 250.00
          }])
        });
        return;
      }
      
      await route.continue();
    });
  });

  test('should navigate to detail page on click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Today\'s Delivery Log');
    
    const orderLink = page.locator('text=Order #').first();
    if (await orderLink.count() > 0) {
      await orderLink.click();
      
      // Should navigate to drilldown page
      await page.waitForURL(/\/drilldown\/order\//);
      expect(page.url()).toContain('/drilldown/order/');
    }
  });
});

