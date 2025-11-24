import { Page } from '@playwright/test';

export const mockAiResponse = async (page: Page, endpoint: string, response: any) => {
  await page.route(`**/${endpoint}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
};

export const mockDailyBriefing = async (page: Page) => {
  await mockAiResponse(page, 'api/ai/daily-briefing', {
    summary: "This is a mocked daily briefing.",
    metrics: {
      revenue: 1000,
      orders: 50
    },
    insights: [
      "Sales are up 10%",
      "Inventory is low on Coffee Beans"
    ]
  });
};

export const mockImageGeneration = async (page: Page) => {
  await mockAiResponse(page, 'api/ai/generate-image', {
    url: "https://via.placeholder.com/300",
    prompt: "Mocked image prompt"
  });
};
