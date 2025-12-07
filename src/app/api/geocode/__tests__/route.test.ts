import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Store original env
const originalEnv = process.env;

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mocks
import { GET } from '../route';

describe('Geocode API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up env
    process.env = {
      ...originalEnv,
      GOOGLE_GEOCODING_API_KEY: 'test-api-key-123',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET with address parameter', () => {
    it('should geocode address successfully', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: 30.0444, lng: 31.2357 },
            },
            formatted_address: 'Cairo, Egypt',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const request = new NextRequest('http://localhost/api/geocode?address=Cairo');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        lat: 30.0444,
        lng: 31.2357,
        formattedAddress: 'Cairo, Egypt',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('address=Cairo')
      );
    });

    it('should return 404 when address not found', async () => {
      const mockResponse = {
        status: 'ZERO_RESULTS',
        results: [],
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const request = new NextRequest('http://localhost/api/geocode?address=InvalidAddress12345');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Address not found');
      expect(data.details).toBe('ZERO_RESULTS');
    });

    it('should return 500 on geocoding API error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost/api/geocode?address=Cairo');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Geocoding failed');
    });

    it('should encode address in URL', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            geometry: { location: { lat: 0, lng: 0 } },
            formatted_address: 'Test',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const request = new NextRequest('http://localhost/api/geocode?address=123 Main St, City');
      await GET(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('123 Main St, City'))
      );
    });
  });

  describe('GET with lat/lng parameters (reverse geocoding)', () => {
    it('should reverse geocode coordinates successfully', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            formatted_address: 'Cairo, Egypt',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const request = new NextRequest('http://localhost/api/geocode?lat=30.0444&lng=31.2357');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        formattedAddress: 'Cairo, Egypt',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('latlng=30.0444,31.2357')
      );
    });

    it('should return 404 when location not found', async () => {
      const mockResponse = {
        status: 'ZERO_RESULTS',
        results: [],
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const request = new NextRequest('http://localhost/api/geocode?lat=0&lng=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Location not found');
    });

    it('should return 500 on reverse geocoding API error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost/api/geocode?lat=30&lng=31');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Reverse geocoding failed');
    });
  });

  describe('Missing parameters', () => {
    it('should return 400 when no parameters provided', async () => {
      const request = new NextRequest('http://localhost/api/geocode');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing address or lat/lng parameters');
    });

    it('should return 400 when only lat is provided', async () => {
      const request = new NextRequest('http://localhost/api/geocode?lat=30');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing address or lat/lng parameters');
    });

    it('should return 400 when only lng is provided', async () => {
      const request = new NextRequest('http://localhost/api/geocode?lng=31');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing address or lat/lng parameters');
    });
  });

  describe('Missing API Key', () => {
    it('should return 500 when API key is not configured', async () => {
      // Remove API key
      delete process.env.GOOGLE_GEOCODING_API_KEY;

      // Need to re-import to pick up new env
      vi.resetModules();
      const { GET: GetHandler } = await import('../route');

      const request = new NextRequest('http://localhost/api/geocode?address=Cairo');
      const response = await GetHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error: Missing API Key');
    });
  });
});
