/**
 * Unit tests for cloud-functions.ts
 * Tests Cloud Functions client with fetch mocking
 */

import {
  callCloudFunction,
  scrapeCraigslist,
  scrapeEbay,
  scrapeFacebook,
  scrapeOfferUp,
  scrapeMercari,
  checkHealth,
} from '../cloud-functions';

// Set environment variables before importing module
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FUNCTIONS_URL =
  'https://us-east1-test-project.cloudfunctions.net';

// Mock global fetch
global.fetch = jest.fn();

describe('cloud-functions', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const FUNCTIONS_BASE_URL = 'https://us-east1-test-project.cloudfunctions.net';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('callCloudFunction', () => {
    it('should successfully call a cloud function', async () => {
      const mockResponse = { success: true, data: { result: 'test' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await callCloudFunction('testFunction', { param: 'value' });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${FUNCTIONS_BASE_URL}/testFunction`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ param: 'value' }),
        })
      );
    });

    it('should handle error responses', async () => {
      const errorData = { error: 'Test error' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => errorData,
      } as Response);

      await expect(
        callCloudFunction('testFunction', {})
      ).rejects.toThrow('Test error');
    });

    it('should handle error responses without JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('Not JSON');
        },
      } as Response);

      await expect(
        callCloudFunction('testFunction', {})
      ).rejects.toThrow('Cloud Function error: Bad Gateway');
    });

    it('should handle abort errors', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        callCloudFunction('testFunction', {})
      ).rejects.toThrow('Cloud Function request timed out');
    });

    it('should handle unknown errors', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error string');

      await expect(
        callCloudFunction('testFunction', {})
      ).rejects.toThrow('Unknown error calling Cloud Function');
    });

    it('should clear timeout on successful response', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await callCloudFunction('testFunction', {}, { timeout: 5000 });

      // Verify timeout was cleared (no timeout error if we advance time)
      jest.advanceTimersByTime(5000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Error',
        json: async () => ({ error: 'Test' }),
      } as Response);

      await expect(callCloudFunction('testFunction', {})).rejects.toThrow();

      // Verify timeout was cleared
      jest.advanceTimersByTime(300000);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('scrapeCraigslist', () => {
    it('should call Craigslist scraper with params', async () => {
      const mockResponse = { success: true, listings: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const params = {
        userId: 'user123',
        location: 'seattle',
        category: 'electronics',
        keywords: 'laptop',
        minPrice: 100,
        maxPrice: 500,
      };

      const result = await scrapeCraigslist(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${FUNCTIONS_BASE_URL}/scrapeCraigslist`,
        expect.objectContaining({
          body: JSON.stringify(params),
        })
      );
    });

    it('should use 5 minute timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const promise = scrapeCraigslist({
        userId: 'user123',
        location: 'seattle',
        category: 'electronics',
      });

      jest.advanceTimersByTime(300000);

      await expect(promise).rejects.toThrow('Cloud Function request timed out');
    });
  });

  describe('scrapeEbay', () => {
    it('should call eBay scraper with params', async () => {
      const mockResponse = { success: true, listings: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const params = {
        userId: 'user123',
        keywords: 'vintage watch',
        categoryId: '260324',
        condition: 'Used',
        minPrice: 50,
        maxPrice: 200,
        limit: 10,
      };

      const result = await scrapeEbay(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${FUNCTIONS_BASE_URL}/scrapeEbay`,
        expect.objectContaining({
          body: JSON.stringify(params),
        })
      );
    });
  });

  describe('scrapeFacebook', () => {
    it('should call Facebook scraper with params', async () => {
      const mockResponse = { success: true, listings: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const params = {
        userId: 'user123',
        location: 'san-francisco',
        category: 'furniture',
        keywords: 'sofa',
        minPrice: 0,
        maxPrice: 300,
      };

      const result = await scrapeFacebook(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${FUNCTIONS_BASE_URL}/scrapeFacebook`,
        expect.objectContaining({
          body: JSON.stringify(params),
        })
      );
    });
  });

  describe('scrapeOfferUp', () => {
    it('should call OfferUp scraper with params', async () => {
      const mockResponse = { success: true, listings: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const params = {
        userId: 'user123',
        location: 'portland',
        keywords: 'bicycle',
        minPrice: 100,
        maxPrice: 500,
      };

      const result = await scrapeOfferUp(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${FUNCTIONS_BASE_URL}/scrapeOfferup`,
        expect.objectContaining({
          body: JSON.stringify(params),
        })
      );
    });

    it('should use 5 minute timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const promise = scrapeOfferUp({
        userId: 'user123',
        location: 'portland',
      });

      jest.advanceTimersByTime(300000);

      await expect(promise).rejects.toThrow('Cloud Function request timed out');
    });
  });

  describe('scrapeMercari', () => {
    it('should call Mercari scraper with params', async () => {
      const mockResponse = { success: true, listings: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const params = {
        userId: 'user123',
        keywords: 'sneakers',
        categoryId: '1',
        minPrice: 30,
        maxPrice: 150,
        limit: 20,
      };

      const result = await scrapeMercari(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${FUNCTIONS_BASE_URL}/scrapeMercari`,
        expect.objectContaining({
          body: JSON.stringify(params),
        })
      );
    });
  });

  describe('checkHealth', () => {
    it('should successfully check health', async () => {
      const healthData = { status: 'ok', timestamp: Date.now() };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => healthData,
      } as Response);

      const result = await checkHealth();

      expect(result).toEqual(healthData);
      expect(mockFetch).toHaveBeenCalledWith(`${FUNCTIONS_BASE_URL}/health`);
    });

    it('should handle health check errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkHealth();

      expect(result).toEqual({
        status: 'error',
        error: 'Network error',
      });
    });

    it('should handle unknown health check errors', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error');

      const result = await checkHealth();

      expect(result).toEqual({
        status: 'error',
        error: 'Unknown error',
      });
    });
  });
});
