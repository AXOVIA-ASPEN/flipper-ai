/**
 * Tests for request-context utility
 */

const mockChildLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(() => mockChildLogger),
  },
}));

const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({
    get: mockHeadersGet,
  })),
}));

import { getRequestLogger } from '@/lib/request-context';
import { logger } from '@/lib/logger';

describe('getRequestLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a child logger bound with the request ID from headers', async () => {
    mockHeadersGet.mockReturnValue('test-request-id-123');

    const result = await getRequestLogger();

    expect(result.requestId).toBe('test-request-id-123');
    expect(logger.child).toHaveBeenCalledWith({ requestId: 'test-request-id-123' });
    expect(result.log).toBe(mockChildLogger);
  });

  it('generates a fallback UUID when x-request-id header is missing', async () => {
    mockHeadersGet.mockReturnValue(null);

    const result = await getRequestLogger();

    expect(result.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(logger.child).toHaveBeenCalledWith({
      requestId: expect.stringMatching(/^[0-9a-f]{8}-/),
    });
  });
});
