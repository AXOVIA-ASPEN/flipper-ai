/**
 * @file src/lib/__tests__/maps-service.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Unit tests for maps-service.ts — Google Maps Directions API client.
 *
 * @description
 * Tests cover: missing API key (AC-5), URL encoding for special chars,
 * exponential-backoff retry on 429, ZERO_RESULTS → null, REQUEST_DENIED → ConfigurationError,
 * valid route → correct RouteResult, privacy (no raw addresses in logs).
 */

import { getRoute, invalidateUserRouteCache } from '@/lib/maps-service';
import { ConfigurationError, ExternalServiceError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchWith(
  responses: Array<{ status: number; body?: object }>
): jest.SpyInstance {
  let callCount = 0;
  return jest.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
    const r = responses[callCount] ?? responses[responses.length - 1];
    callCount++;
    return {
      status: r.status,
      json: async () => r.body ?? {},
    } as Response;
  });
}

const OK_RESPONSE = {
  status: 200,
  body: {
    status: 'OK',
    routes: [
      {
        legs: [
          {
            duration: { value: 1800, text: '30 mins' },
            distance: { value: 24140, text: '15.0 mi' },
          },
        ],
      },
    ],
  },
};

const ZERO_RESULTS_RESPONSE = {
  status: 200,
  body: { status: 'ZERO_RESULTS' },
};

const REQUEST_DENIED_RESPONSE = {
  status: 200,
  body: { status: 'REQUEST_DENIED' },
};

const OVER_LIMIT_RESPONSE = {
  status: 200,
  body: { status: 'OVER_DAILY_LIMIT' },
};

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

const ORIG = '123 Main St, Seattle, WA';
const DEST = '456 Oak Ave, Bellevue, WA';
const USER_ID = 'user_test_123';

let logSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  // Suppress logger output in tests
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  delete process.env.GOOGLE_MAPS_API_KEY;
  // Clear route cache between tests to prevent cache hits from polluting subsequent tests
  invalidateUserRouteCache(USER_ID);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getRoute', () => {
  test('returns null when GOOGLE_MAPS_API_KEY is absent (AC-5)', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const result = await getRoute(ORIG, DEST, USER_ID);
    expect(result).toBeNull();
  });

  test('applies encodeURIComponent to origin and destination with special chars', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const fetchSpy = mockFetchWith([OK_RESPONSE]);

    const specialOrigin = '123 Johnson & Johnson Ave, Apt #4B';
    const specialDest = '456 Oak + Pine St, Suite #200';
    await getRoute(specialOrigin, specialDest, USER_ID);

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0] ?? '');
    // Special chars must be encoded
    expect(calledUrl).toContain(encodeURIComponent(specialOrigin));
    expect(calledUrl).toContain(encodeURIComponent(specialDest));
    // Raw special chars must NOT appear in URL
    expect(calledUrl).not.toContain('&origin=123 Johnson');
    expect(calledUrl).not.toContain('#4B&');
    fetchSpy.mockRestore();
  });

  test('retries on 429 up to 3 attempts then throws ExternalServiceError', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const fetchSpy = mockFetchWith([
      { status: 429 },
      { status: 429 },
      { status: 429 },
    ]);

    // Override sleep to avoid waiting in tests
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    await expect(getRoute(ORIG, DEST, USER_ID)).rejects.toBeInstanceOf(ExternalServiceError);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    fetchSpy.mockRestore();
  });

  test('returns null on ZERO_RESULTS (no driving route available)', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const fetchSpy = mockFetchWith([ZERO_RESULTS_RESPONSE]);

    const result = await getRoute(ORIG, DEST, USER_ID);
    expect(result).toBeNull();
    fetchSpy.mockRestore();
  });

  test('throws ConfigurationError on REQUEST_DENIED (bad API key)', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'bad-key';
    const fetchSpy = mockFetchWith([REQUEST_DENIED_RESPONSE]);

    await expect(getRoute(ORIG, DEST, USER_ID)).rejects.toBeInstanceOf(ConfigurationError);
    fetchSpy.mockRestore();
  });

  test('returns correct RouteResult with durationText and deepLinkUrl on valid route', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const fetchSpy = mockFetchWith([OK_RESPONSE]);

    const result = await getRoute(ORIG, DEST, USER_ID);

    expect(result).not.toBeNull();
    expect(result!.durationSeconds).toBe(1800);
    expect(result!.durationText).toBe('30 mins');
    expect(result!.distanceText).toBe('15.0 mi');
    expect(result!.deepLinkUrl).toContain('www.google.com/maps/dir/');
    expect(result!.deepLinkUrl).toContain(encodeURIComponent(ORIG));
    expect(result!.deepLinkUrl).toContain(encodeURIComponent(DEST));
    expect(result!.mapsSearchUrl).toContain(encodeURIComponent(DEST));
    fetchSpy.mockRestore();
  });

  test('throws ExternalServiceError on OVER_QUERY_LIMIT (same path as OVER_DAILY_LIMIT)', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const fetchSpy = mockFetchWith([{ status: 200, body: { status: 'OVER_QUERY_LIMIT' } }]);

    await expect(getRoute(ORIG, DEST, USER_ID)).rejects.toBeInstanceOf(ExternalServiceError);
    fetchSpy.mockRestore();
  });

  test('logs do NOT contain raw origin or destination addresses', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const fetchSpy = mockFetchWith([OK_RESPONSE]);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await getRoute(ORIG, DEST, USER_ID);

    // Check all captured log calls
    const allLogs = [
      ...consoleSpy.mock.calls,
      ...consoleDebugSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
    ]
      .flat()
      .map(String)
      .join(' ');

    expect(allLogs).not.toContain(ORIG);
    expect(allLogs).not.toContain(DEST);

    consoleSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});
