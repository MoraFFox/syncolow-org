import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cookies
const mockCookieDelete = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({
    delete: mockCookieDelete,
  }),
}));

// Import after mocks
import { POST } from '../route';

describe('Google Tasks Disconnect API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should delete tokens cookie and return success', async () => {
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCookieDelete).toHaveBeenCalledWith('google_tasks_tokens');
    });

    it('should always return success even if no cookie exists', async () => {
      // delete() doesn't throw if cookie doesn't exist
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
