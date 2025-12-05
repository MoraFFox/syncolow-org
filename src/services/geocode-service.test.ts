
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeService } from './geocode-service';

global.fetch = vi.fn();

describe('GeocodeService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Clear cache if possible, or just rely on new mock values
    // Since geocodeService is a singleton, cache persists. 
    // We might need to mock the cache or just use different addresses.
  });

  it('should return coordinates for a valid address', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ lat: 30.0, lng: 31.0 }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geocodeService.geocode('Cairo, Egypt');
    expect(result).toEqual([30.0, 31.0]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/geo?address='));
  });

  it('should return null for invalid address', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await geocodeService.geocode('Invalid Address');
    expect(result).toBeNull();
  });

  it('should return address for reverse geocoding', async () => {
      const mockResponse = {
          ok: true,
          json: async () => ({ formattedAddress: '123 Main St' }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await geocodeService.reverseGeocode(30.0, 31.0);
      expect(result).toBe('123 Main St');
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/geo?lat=30&lng=31'));
  });
});
