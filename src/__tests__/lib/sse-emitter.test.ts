/**
 * Tests for SseEmitter — real-time notification broadcaster
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
import { SseEmitter } from '@/lib/sse-emitter';

// Re-export class for testing (we need a fresh instance per test)
// Note: The singleton is exported as `sseEmitter`; we test the class directly.

// Helper: create a mock WritableStreamDefaultWriter
function makeMockWriter(failOnWrite = false) {
  const written: Uint8Array[] = [];
  const writer: WritableStreamDefaultWriter<Uint8Array> = {
    write: jest.fn(async (chunk: Uint8Array) => {
      if (failOnWrite) throw new Error('Stream closed');
      written.push(chunk);
    }),
    close: jest.fn(async () => {}),
    abort: jest.fn(async () => {}),
    closed: Promise.resolve(undefined as unknown as undefined),
    desiredSize: 1,
    ready: Promise.resolve(undefined as unknown as undefined),
    releaseLock: jest.fn(),
  };
  return { writer, written };
}

describe('SseEmitter', () => {
  // Helper: access SseEmitter class (not the singleton) for isolated tests
  let emitter: SseEmitter;

  beforeEach(() => {
    emitter = new SseEmitter();
  });

  // -------------------------------------------------------------------------
  // formatMessage
  // -------------------------------------------------------------------------
  describe('formatMessage()', () => {
    it('formats a basic event with event + data lines', () => {
      const msg = emitter.formatMessage({ type: 'ping', data: { ts: 1 } });
      expect(msg).toContain('event: ping');
      expect(msg).toContain('data: {"ts":1}');
      expect(msg).toMatch(/\n\n$/); // double newline at end
    });

    it('includes id field when provided', () => {
      const msg = emitter.formatMessage({ type: 'listing.found', data: { id: 'abc' }, id: 'evt-1' });
      expect(msg).toContain('id: evt-1');
    });

    it('omits id field when not provided', () => {
      const msg = emitter.formatMessage({ type: 'ping', data: {} });
      expect(msg).not.toContain('id:');
    });

    it('serializes complex data as JSON', () => {
      const data = { title: 'Test', price: 99.99, tags: ['a', 'b'] };
      const msg = emitter.formatMessage({ type: 'alert.high-value', data });
      expect(msg).toContain(JSON.stringify(data));
    });
  });

  // -------------------------------------------------------------------------
  // subscribe / connectionCount
  // -------------------------------------------------------------------------
  describe('subscribe()', () => {
    it('increments connectionCount', () => {
      const { writer: w1 } = makeMockWriter();
      const { writer: w2 } = makeMockWriter();
      expect(emitter.connectionCount).toBe(0);
      emitter.subscribe(w1);
      expect(emitter.connectionCount).toBe(1);
      emitter.subscribe(w2);
      expect(emitter.connectionCount).toBe(2);
    });

    it('returned unsubscribe decrements connectionCount', () => {
      const { writer } = makeMockWriter();
      const unsub = emitter.subscribe(writer);
      expect(emitter.connectionCount).toBe(1);
      unsub();
      expect(emitter.connectionCount).toBe(0);
    });

    it('calling unsubscribe twice is safe (idempotent)', () => {
      const { writer } = makeMockWriter();
      const unsub = emitter.subscribe(writer);
      unsub();
      expect(() => unsub()).not.toThrow();
      expect(emitter.connectionCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // emit
  // -------------------------------------------------------------------------
  describe('emit()', () => {
    it('returns 0 when no clients are connected', async () => {
      const delivered = await emitter.emit({ type: 'ping', data: {} });
      expect(delivered).toBe(0);
    });

    it('delivers to all connected clients', async () => {
      const { writer: w1 } = makeMockWriter();
      const { writer: w2 } = makeMockWriter();
      emitter.subscribe(w1);
      emitter.subscribe(w2);
      const delivered = await emitter.emit({ type: 'job.complete', data: { jobId: '123' } });
      expect(delivered).toBe(2);
      expect(w1.write).toHaveBeenCalledTimes(1);
      expect(w2.write).toHaveBeenCalledTimes(1);
    });

    it('returns count of successfully-delivered clients', async () => {
      const { writer: ok } = makeMockWriter(false);
      const { writer: dead } = makeMockWriter(true); // will throw
      emitter.subscribe(ok);
      emitter.subscribe(dead);
      const delivered = await emitter.emit({ type: 'ping', data: {} });
      expect(delivered).toBe(1); // only the healthy client
    });

    it('prunes dead clients after emit', async () => {
      const { writer: dead } = makeMockWriter(true);
      emitter.subscribe(dead);
      expect(emitter.connectionCount).toBe(1);
      await emitter.emit({ type: 'ping', data: {} });
      expect(emitter.connectionCount).toBe(0);
    });

    it('encoded bytes are valid UTF-8 SSE format', async () => {
      const { writer, written } = makeMockWriter();
      emitter.subscribe(writer);
      await emitter.emit({ type: 'listing.found', data: { title: 'Camera' } });
      expect(written.length).toBe(1);
      const decoded = new TextDecoder().decode(written[0]);
      expect(decoded).toContain('event: listing.found');
      expect(decoded).toContain('"title":"Camera"');
    });

    it('emits all SSE event types', async () => {
      const types: Array<import('@/lib/sse-emitter').SseEventType> = [
        'listing.found',
        'job.complete',
        'job.failed',
        'opportunity.created',
        'opportunity.updated',
        'alert.high-value',
        'ping',
      ];
      const { writer } = makeMockWriter();
      emitter.subscribe(writer);
      for (const type of types) {
        await emitter.emit({ type, data: {} });
      }
      expect(writer.write).toHaveBeenCalledTimes(types.length);
    });
  });

  // -------------------------------------------------------------------------
  // ping
  // -------------------------------------------------------------------------
  describe('ping()', () => {
    it('emits a ping event with ts field', async () => {
      const { writer, written } = makeMockWriter();
      emitter.subscribe(writer);
      await emitter.ping();
      const decoded = new TextDecoder().decode(written[0]);
      expect(decoded).toContain('event: ping');
      expect(decoded).toContain('"ts":');
    });

    it('returns delivered count', async () => {
      const { writer: w1 } = makeMockWriter();
      const { writer: w2 } = makeMockWriter();
      emitter.subscribe(w1);
      emitter.subscribe(w2);
      const count = await emitter.ping();
      expect(count).toBe(2);
    });

    it('returns 0 with no clients', async () => {
      const count = await emitter.ping();
      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // disconnectAll
  // -------------------------------------------------------------------------
  describe('disconnectAll()', () => {
    it('clears all clients', () => {
      const { writer: w1 } = makeMockWriter();
      const { writer: w2 } = makeMockWriter();
      emitter.subscribe(w1);
      emitter.subscribe(w2);
      expect(emitter.connectionCount).toBe(2);
      emitter.disconnectAll();
      expect(emitter.connectionCount).toBe(0);
    });

    it('subsequent emit delivers to no one', async () => {
      const { writer } = makeMockWriter();
      emitter.subscribe(writer);
      emitter.disconnectAll();
      const delivered = await emitter.emit({ type: 'ping', data: {} });
      expect(delivered).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Singleton
  // -------------------------------------------------------------------------
  describe('singleton sseEmitter', () => {
    it('is an instance of SseEmitter', async () => {
      const { sseEmitter } = await import('@/lib/sse-emitter');
      expect(sseEmitter).toBeInstanceOf(SseEmitter);
    });

    it('exports formatMessage as a method', async () => {
      const { sseEmitter } = await import('@/lib/sse-emitter');
      expect(typeof sseEmitter.formatMessage).toBe('function');
    });
  });
});
