import { test as base, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockSupabase } from './supabase-mocks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path for the auth state storage
const AUTH_FILE = path.join(__dirname, '../../.auth/user.json');
const AUTH_DIR = path.dirname(AUTH_FILE);

// Ensure .auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export const test = base.extend<{ page: Page }>({
    page: async ({ page }, use) => {
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

        // Block Service Worker registration to prevent network interception issues
        await page.addInitScript(() => {
            // @ts-ignore
            if (window.navigator.serviceWorker) {
                // @ts-ignore
                window.navigator.serviceWorker.register = () => Promise.reject(new Error('SW registration blocked by Playwright'));
            }
        });

        // Apply global Supabase mocks
        await mockSupabase(page);

        // Check if we have a valid auth state
        const fileName = AUTH_FILE;

        const email = process.env.TEST_USER_EMAIL || 'test@example.com';
        const password = process.env.TEST_USER_PASSWORD || 'password123';

        // Mock Supabase Auth API (Login) - Redundant but keeping for safety
        await page.route('**/auth/v1/token?grant_type=password', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: "fake-access-token",
                    token_type: "bearer",
                    expires_in: 3600,
                    refresh_token: "fake-refresh-token",
                    user: {
                        id: "test-user-id",
                        aud: "authenticated",
                        role: "authenticated",
                        email: email,
                        confirmed_at: new Date().toISOString(),
                        last_sign_in_at: new Date().toISOString(),
                        app_metadata: { provider: "email", providers: ["email"] },
                        user_metadata: { full_name: "Test User" },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                })
            });
        });

        // Mock Supabase Auth API (Refresh Token)
        await page.route('**/auth/v1/token?grant_type=refresh_token', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: "fake-access-token-refreshed",
                    token_type: "bearer",
                    expires_in: 3600,
                    refresh_token: "fake-refresh-token-new",
                    user: {
                        id: "test-user-id",
                        aud: "authenticated",
                        role: "authenticated",
                        email: email,
                        confirmed_at: new Date().toISOString(),
                        last_sign_in_at: new Date().toISOString(),
                        app_metadata: { provider: "email", providers: ["email"] },
                        user_metadata: { full_name: "Test User" },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                })
            });
        });

        // Mock Supabase User API
        await page.route('**/auth/v1/user', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: "test-user-id",
                    aud: "authenticated",
                    role: "authenticated",
                    email: email,
                    confirmed_at: new Date().toISOString(),
                    last_sign_in_at: new Date().toISOString(),
                    app_metadata: { provider: "email", providers: ["email"] },
                    user_metadata: { full_name: "Test User" },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });
        });

        // Check if auth file exists
        if (fs.existsSync(fileName)) {
            const state = JSON.parse(fs.readFileSync(fileName, 'utf-8'));

            if (state.cookies) {
                await page.context().addCookies(state.cookies);
            }

            if (state.origins) {
                await page.addInitScript(({ origins, baseUrl }) => {
                    const originState = origins.find((o: any) => o.origin === baseUrl || o.origin === window.location.origin);
                    if (originState) {
                        for (const { name, value } of originState.localStorage) {
                            localStorage.setItem(name, value);
                        }
                    }
                }, { origins: state.origins, baseUrl: 'http://localhost:3001' });
            }
            console.log('Restored auth state from file');
        } else {
            // Perform login
            const response = await page.goto('/login');
            console.log(`Navigated to /login. Status: ${response?.status()}`);
            console.log(`Current URL: ${page.url()}`);

            // Wait for any input to be visible to ensure page loaded
            try {
                await page.waitForSelector('input', { timeout: 5000 });
            } catch (e) {
                console.log('Input not found. Page content:', await page.content());
                throw e;
            }

            await page.fill('input[type="email"]', email);
            await page.fill('input[type="password"]', password);
            await page.click('button[type="submit"]');

            // Wait for navigation to dashboard or success toast
            await expect(page).toHaveURL(/\/dashboard|^\/$/);

            // Save state
            await page.context().storageState({ path: fileName });
        }

        await use(page);
    }
});

export { expect } from '@playwright/test';
