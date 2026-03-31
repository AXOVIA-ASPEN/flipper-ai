/**
 * Unit tests for calculateDistance() in src/lib/distance-calculator.ts
 * Story 5.5: Logistics & Shipping Cost Analysis (FR-SCORE-21)
 */

import { calculateDistance, clearGeocodeCache } from '@/lib/distance-calculator';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeGeoapifyResponse(lat: number, lon: number) {
  return {
    ok: true,
    json: async () => ({
      features: [{ geometry: { coordinates: [lon, lat] } }],
    }),
  };
}

describe('calculateDistance()', () => {
  beforeEach(() => {
    clearGeocodeCache();
    mockFetch.mockReset();
  });

  afterEach(() => {
    delete process.env.GEOAPIFY_API_KEY;
  });

  describe('when GEOAPIFY_API_KEY is not set', () => {
    it('returns null and logs a warning', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await calculateDistance('Tampa, FL', 'Orlando, FL');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GEOAPIFY_API_KEY'));
      consoleSpy.mockRestore();
    });
  });

  describe('when GEOAPIFY_API_KEY is set', () => {
    beforeEach(() => {
      process.env.GEOAPIFY_API_KEY = 'test-key';
    });

    it('returns distance in miles with geoapify method', async () => {
      // Tampa coords: 27.9506, -82.4572  /  Orlando coords: 28.5383, -81.3792
      mockFetch
        .mockResolvedValueOnce(makeGeoapifyResponse(27.9506, -82.4572))
        .mockResolvedValueOnce(makeGeoapifyResponse(28.5383, -81.3792));

      const result = await calculateDistance('Tampa, FL', 'Orlando, FL');
      expect(result).not.toBeNull();
      expect(result!.distanceMiles).toBeGreaterThan(50);
      expect(result!.distanceMiles).toBeLessThan(100);
      expect(result!.calculationMethod).toBe('geoapify');
      expect(result!.fromLocation).toBe('Tampa, FL');
      expect(result!.toLocation).toBe('Orlando, FL');
    });

    it('returns null when first geocode call fails (non-ok)', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Forbidden' });
      const result = await calculateDistance('Bad location', 'Orlando, FL');
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('returns null when second geocode call returns empty features', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockFetch
        .mockResolvedValueOnce(makeGeoapifyResponse(27.9506, -82.4572))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] }),
        });
      const result = await calculateDistance('Tampa, FL', 'No such place');
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('caches geocoding results to avoid duplicate API calls', async () => {
      // First call: Tampa→Orlando = 2 distinct fetches
      mockFetch
        .mockResolvedValueOnce(makeGeoapifyResponse(27.9506, -82.4572)) // Tampa
        .mockResolvedValueOnce(makeGeoapifyResponse(28.5383, -81.3792)) // Orlando
        // Second call Tampa→Miami: Tampa is cached, only Miami needs a fetch
        .mockResolvedValueOnce(makeGeoapifyResponse(25.7617, -80.1918)); // Miami

      await calculateDistance('Tampa, FL', 'Orlando, FL');
      await calculateDistance('Tampa, FL', 'Miami, FL');

      // Only 3 fetches total: Tampa (cached after first call), Orlando, Miami
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('returns null and logs warning when fetch throws', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await calculateDistance('Tampa, FL', 'Orlando, FL');
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('rounds distance to 1 decimal place', async () => {
      // Tampa → Orlando ~84.6 miles
      mockFetch
        .mockResolvedValueOnce(makeGeoapifyResponse(27.9506, -82.4572))
        .mockResolvedValueOnce(makeGeoapifyResponse(28.5383, -81.3792));

      const result = await calculateDistance('Tampa, FL', 'Orlando, FL');
      expect(result).not.toBeNull();
      // Value should equal its own 1-decimal rounded form
      expect(result!.distanceMiles).toBe(Math.round(result!.distanceMiles * 10) / 10);
    });
  });

  describe('clearGeocodeCache()', () => {
    it('clears the in-memory geocode cache', async () => {
      process.env.GEOAPIFY_API_KEY = 'test-key';
      // Tampa→Orlando: 2 distinct fetches
      mockFetch
        .mockResolvedValueOnce(makeGeoapifyResponse(27.9506, -82.4572))
        .mockResolvedValueOnce(makeGeoapifyResponse(28.5383, -81.3792));

      await calculateDistance('Tampa, FL', 'Orlando, FL');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      clearGeocodeCache();
      mockFetch.mockClear();
      mockFetch
        .mockResolvedValueOnce(makeGeoapifyResponse(27.9506, -82.4572))
        .mockResolvedValueOnce(makeGeoapifyResponse(28.5383, -81.3792));

      // After clearing cache, Tampa and Orlando must be fetched again
      await calculateDistance('Tampa, FL', 'Orlando, FL');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
