import { test, expect } from '@playwright/test';
import { mockSupabase } from './fixtures/supabase-mocks';

test.describe('Analytics Dashboard', () => {
    test.beforeEach(async ({ page }) => {

        // Intercept Supabase requests - Catch ALL including auth
        await page.route('**/*supabase.co/**', async route => {
            const url = route.request().url();
            const method = route.request().method();

            // Mock Auth Session
            if (url.includes('/auth/v1/user') || url.includes('/auth/v1/session')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            session: {
                                access_token: 'fake-token',
                                user: {
                                    id: 'mock-user-id',
                                    email: 'test@example.com',
                                    user_metadata: { full_name: 'Test User' }
                                }
                            },
                            user: {
                                id: 'mock-user-id',
                                email: 'test@example.com',
                                user_metadata: { full_name: 'Test User' }
                            }
                        }
                    })
                });
                return;
            }

            // Mock Sales Accounts
            if (url.includes('/sales_accounts') && method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 'acc_1', name: 'Retail Sector', codes: ['RET'], color: '#10b981', is_default: false, user_id: 'mock-user-id' },
                        { id: 'acc_2', name: 'Wholesale Corp', codes: ['WHO'], color: '#6366f1', is_default: false, user_id: 'mock-user-id' }
                    ])
                });
                return;
            }

            // Mock Orders
            if (url.includes('/orders') && method === 'GET') {
                const d = new Date();
                const today = d.toISOString().split('T')[0];

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'ord_1',
                            companyId: 'comp_1',
                            customerAccount: 'RET-001',
                            orderDate: today,
                            status: 'Delivered',
                            grandTotal: 500.00,
                            items: [{ productId: 'prod_1', quantity: 2, price: 250 }]
                        },
                        {
                            id: 'ord_2',
                            companyId: 'comp_2',
                            customerAccount: 'WHO-001',
                            orderDate: today,
                            status: 'Processing',
                            grandTotal: 2000.00,
                            items: [{ productId: 'prod_2', quantity: 10, price: 200 }]
                        }
                    ])
                });
                return;
            }

            // Mock Products
            if (url.includes('/products') && method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 'prod_1', name: 'Consumer Widget', stock: 50, price: 250 },
                        { id: 'prod_2', name: 'Bulk Doohickey', stock: 1000, price: 200 }
                    ])
                });
                return;
            }

            // Mock Companies
            if (url.includes('/companies') && method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: 'comp_1', name: 'Retail Customer A' },
                        { id: 'comp_2', name: 'Wholesale Partner B' }
                    ])
                });
                return;
            }

            // Fallback
            await route.continue();
        });

        await page.goto('/analytics');
        // Wait for page core to be ready
        await page.waitForLoadState('networkidle');
    });

    test('should display command center header and default global view', async ({ page }) => {
        await expect(page.getByText(/Tactical Overview/i)).toBeVisible({ timeout: 20000 });

        // Check for Account Selector default state
        const selector = page.getByRole('button', { name: /Global Command/i });
        await expect(selector).toBeVisible({ timeout: 10000 });
    });

    test('should display correct KPIs for Global View', async ({ page }) => {
        // Total Revenue should be 2500 (500 + 2000)
        await expect(page.getByText(/\$2,500/)).toBeVisible({ timeout: 25000 });
    });

    test('should filter by account when selected', async ({ page }) => {
        // Open selector
        await page.getByRole('button', { name: /Global Command/i }).click();

        // Select Retail Sector
        const retailOption = page.getByText('Retail Sector').first();
        await expect(retailOption).toBeVisible({ timeout: 10000 });
        await retailOption.click();

        // Selector should update
        await expect(page.getByRole('button', { name: /Retail Sector/i })).toBeVisible({ timeout: 10000 });

        // Revenue should update to 500 (only Retail order)
        await expect(page.getByText(/\$500/)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/\$2,500/)).not.toBeVisible();
    });

    test('should revert to global view', async ({ page }) => {
        // Switch to Retail
        await page.getByRole('button', { name: /Global Command/i }).click();
        await page.getByText('Retail Sector').first().click();
        await expect(page.getByText(/\$500/)).toBeVisible({ timeout: 10000 });

        // Switch back to Global
        await page.getByRole('button', { name: /Retail Sector/i }).first().click();
        await page.getByText('Global Command').first().click();

        await expect(page.getByText(/\$2,500/)).toBeVisible({ timeout: 10000 });
    });

    test('should display visual reports', async ({ page }) => {
        // Inventory Report
        await expect(page.getByText(/Inventory Report/i)).toBeVisible({ timeout: 20000 });
        // Year Comparison
        await expect(page.getByText(/YEARLY ORBIT/i)).toBeVisible({ timeout: 20000 });
    });
});
