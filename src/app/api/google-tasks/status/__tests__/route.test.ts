import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cookies
const mockCookieGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({
    get: mockCookieGet,
  }),
}));

// Import after mocks
import { GET } from '../route';

describe('Google Tasks Status API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return connected: true when tokens cookie exists', async () => {
      mockCookieGet.mockReturnValue({
        value: JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connected).toBe(true);
    });

    it('should return connected: false when tokens cookie is missing', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connected).toBe(false);
    });

    it('should return connected: false when tokens cookie is null', async () => {
      mockCookieGet.mockReturnValue(null);

      const response = await GET();
      const data = await response.json();

      expect(data.connected).toBe(false);
    });
  });
});
