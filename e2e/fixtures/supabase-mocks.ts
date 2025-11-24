import { Page } from '@playwright/test';

export async function mockSupabase(page: Page) {
  console.log('Setting up Supabase mocks...');
  
  // Mock generic Supabase REST endpoints - use a very broad pattern
  await page.route('**/*supabase.co/rest/v1/**', async route => {
    const url = route.request().url();
    const method = route.request().method();
    
    console.log(`Intercepted Supabase request: ${method} ${url}`);

    if (url.includes('/orders')) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]) // Return empty list by default
        });
        return;
    }

    if (url.includes('/products')) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { 
                    id: 'prod_1', 
                    name: 'Solar Panel System', 
                    price: 1200, 
                    stock: 100,
                    sku: 'SOL-100',
                    category: 'Solar',
                    manufacturer: 'SunTech'
                }
            ])
        });
        return;
    }

    if (url.includes('/companies')) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { id: 'comp_1', name: 'Test Company', email: 'test@company.com' }
            ])
        });
        return;
    }

    if (url.includes('/manufacturers')) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { id: 'SunTech', name: 'SunTech' }
            ])
        });
        return;
    }

    // Default mock for other endpoints to prevent 401s
    await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
    });
  });
}
