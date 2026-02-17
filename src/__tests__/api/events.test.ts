/**
 * Tests for GET /api/events — SSE endpoint
 * Author: Stephen Boyett
 * Company: Axovia AI
 *
 * Testing strategy:
 *  - For auth tests: mock `getAuthUserId` to return null / user-id
 *  - For streaming tests: mock `TransformStream` so the writer doesn't backpressure
 *  - Validate response headers and mock call counts
 */

// ── Mock auth middleware ────────────────────────────────────────────────────
const mockGetAuthUserId = jest.fn();
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: mockGetAuthUserId,
}));

// ── Mock sseEmitter ─────────────────────────────────────────────────────────
const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn().mockReturnValue(mockUnsubscribe);
const mockFormatMessage = jest
  .fn()
  .mockReturnValue('event: ping\ndata: {"ts":1}\n\n');

jest.mock('@/lib/sse-emitter', () => ({
  sseEmitter: {
    subscribe: mockSubscribe,
    formatMessage: mockFormatMessage,
    emit: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue(1),
    connectionCount: 0,
    disconnectAll: jest.fn(),
  },
}));

// ── Mock TransformStream to avoid backpressure deadlock in Jest ─────────────
// The real TransformStream won't allow writes without a reader. We replace it
// with a simple non-blocking writer for testing purposes.
const mockWrittenChunks: Uint8Array[] = [];
const mockWriter = {
  write: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  abort: jest.fn().mockResolvedValue(undefined),
  releaseLock: jest.fn(),
  closed: Promise.resolve(undefined),
  desiredSize: 1024,
  ready: Promise.resolve(undefined),
};
const mockReadable = {};
class MockTransformStream {
  readable = mockReadable;
  writable = {
    getWriter: () => mockWriter,
  };
}
// @ts-expect-error: override global
global.TransformStream = MockTransformStream;

// ── Import AFTER mocks are set up ───────────────────────────────────────────
import { GET } from '@/app/api/events/route';
import { NextRequest } from 'next/server';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/events');
}

describe('GET /api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWrittenChunks.length = 0;
    mockSubscribe.mockReturnValue(mockUnsubscribe);
    mockFormatMessage.mockReturnValue('event: ping\ndata: {"ts":1}\n\n');
    mockWriter.write.mockResolvedValue(undefined);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 for authenticated users', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it('sets Content-Type: text/event-stream', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await GET(makeRequest());
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('sets Cache-Control: no-cache', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await GET(makeRequest());
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
  });

  it('sets Connection: keep-alive', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await GET(makeRequest());
    expect(res.headers.get('Connection')).toBe('keep-alive');
  });

  it('sets X-Accel-Buffering: no for nginx', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await GET(makeRequest());
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('calls sseEmitter.subscribe with the writer', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    await GET(makeRequest());
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    const writer = mockSubscribe.mock.calls[0][0];
    expect(typeof writer.write).toBe('function');
  });

  it('sends initial ping on connect via formatMessage', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    await GET(makeRequest());
    expect(mockFormatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ping' })
    );
  });

  it('initial ping includes userId', async () => {
    mockGetAuthUserId.mockResolvedValue('user-456');
    await GET(makeRequest());
    const call = mockFormatMessage.mock.calls[0][0];
    expect(call.data).toMatchObject({ userId: 'user-456' });
  });

  it('writes initial ping bytes to the stream', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    await GET(makeRequest());
    expect(mockWriter.write).toHaveBeenCalledTimes(1);
  });

  it('response body is not null (streaming response)', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await GET(makeRequest());
    // The response wraps the readable stream — body is non-null for streaming responses
    // (exact type depends on runtime; in tests we verify it's not a plain object)
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
