/**
 * @jest-environment jsdom
 */
/**
 * Tests for useSseEvents hook
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
import { renderHook, act } from '@testing-library/react';
import { useSseEvents } from '@/hooks/useSseEvents';

// ─── EventSource Mock ────────────────────────────────────────────────────────

type ESListener = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Map<string, ESListener[]> = new Map();
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: ESListener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(handler);
  }

  removeEventListener(type: string, handler: ESListener) {
    const handlers = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      handlers.filter((h) => h !== handler)
    );
  }

  dispatchEvent(type: string, data: unknown, lastEventId = '') {
    const event = { data: JSON.stringify(data), lastEventId } as MessageEvent;
    (this.listeners.get(type) ?? []).forEach((h) => h(event));
  }

  triggerOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  triggerError() {
    this.readyState = 2;
    this.onerror?.();
  }

  close() {
    this.readyState = 2;
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  // @ts-expect-error: replace global EventSource with mock
  global.EventSource = MockEventSource;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useSseEvents', () => {
  it('starts disconnected', () => {
    const { result } = renderHook(() => useSseEvents());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.events).toHaveLength(0);
    expect(result.current.lastError).toBeNull();
  });

  it('becomes connected when EventSource opens', () => {
    const { result } = renderHook(() => useSseEvents());
    act(() => {
      MockEventSource.instances[0].triggerOpen();
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.lastError).toBeNull();
  });

  it('receives listing.found events', () => {
    const { result } = renderHook(() =>
      useSseEvents({ eventTypes: ['listing.found'] })
    );
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      MockEventSource.instances[0].dispatchEvent('listing.found', {
        title: 'PlayStation 5',
        price: 150,
      });
    });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].type).toBe('listing.found');
    expect((result.current.events[0].data as Record<string, unknown>).title).toBe(
      'PlayStation 5'
    );
  });

  it('receives alert.high-value events', () => {
    const { result } = renderHook(() =>
      useSseEvents({ eventTypes: ['alert.high-value'] })
    );
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      MockEventSource.instances[0].dispatchEvent('alert.high-value', { score: 95 });
    });
    expect(result.current.events[0].type).toBe('alert.high-value');
  });

  it('receives multiple event types', () => {
    const { result } = renderHook(() =>
      useSseEvents({ eventTypes: ['listing.found', 'job.complete'] })
    );
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      MockEventSource.instances[0].dispatchEvent('listing.found', { id: '1' });
      MockEventSource.instances[0].dispatchEvent('job.complete', { jobId: 'j1' });
    });
    expect(result.current.events).toHaveLength(2);
  });

  it('respects maxEvents limit', () => {
    const { result } = renderHook(() =>
      useSseEvents({ eventTypes: ['listing.found'], maxEvents: 3 })
    );
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      for (let i = 0; i < 5; i++) {
        MockEventSource.instances[0].dispatchEvent('listing.found', { i });
      }
    });
    expect(result.current.events).toHaveLength(3);
  });

  it('clearEvents empties the events array', () => {
    const { result } = renderHook(() => useSseEvents({ eventTypes: ['listing.found'] }));
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      MockEventSource.instances[0].dispatchEvent('listing.found', { id: '1' });
    });
    expect(result.current.events).toHaveLength(1);
    act(() => {
      result.current.clearEvents();
    });
    expect(result.current.events).toHaveLength(0);
  });

  it('sets lastError and isConnected=false on connection error', () => {
    const { result } = renderHook(() => useSseEvents({ noReconnect: true }));
    act(() => {
      MockEventSource.instances[0].triggerError();
    });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.lastError).toBe('Connection lost');
  });

  it('auto-reconnects after error (default behavior)', () => {
    renderHook(() =>
      useSseEvents({ reconnectDelayMs: 100, maxReconnectDelayMs: 200 })
    );
    act(() => {
      MockEventSource.instances[0].triggerError();
    });
    expect(MockEventSource.instances).toHaveLength(1);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(MockEventSource.instances.length).toBeGreaterThan(1);
  });

  it('does NOT auto-reconnect when noReconnect=true', () => {
    renderHook(() => useSseEvents({ noReconnect: true }));
    act(() => {
      MockEventSource.instances[0].triggerError();
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('resets backoff delay on successful reconnect', () => {
    const { result } = renderHook(() =>
      useSseEvents({ reconnectDelayMs: 100, maxReconnectDelayMs: 10000 })
    );
    // Trigger error → reconnect
    act(() => {
      MockEventSource.instances[0].triggerError();
      jest.advanceTimersByTime(200);
    });
    // New instance should exist
    const secondInstance = MockEventSource.instances[1];
    act(() => {
      secondInstance.triggerOpen();
    });
    // Should be connected again
    expect(result.current.isConnected).toBe(true);
    expect(result.current.lastError).toBeNull();
  });

  it('captures receivedAt timestamp for each event', () => {
    const before = Date.now();
    const { result } = renderHook(() => useSseEvents({ eventTypes: ['job.complete'] }));
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      MockEventSource.instances[0].dispatchEvent('job.complete', { done: true });
    });
    const after = Date.now();
    expect(result.current.events[0].receivedAt).toBeGreaterThanOrEqual(before);
    expect(result.current.events[0].receivedAt).toBeLessThanOrEqual(after);
  });

  it('captures lastEventId when provided', () => {
    const { result } = renderHook(() => useSseEvents({ eventTypes: ['listing.found'] }));
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      MockEventSource.instances[0].dispatchEvent('listing.found', {}, 'evt-42');
    });
    expect(result.current.events[0].id).toBe('evt-42');
  });

  it('silently ignores malformed JSON events', () => {
    const { result } = renderHook(() => useSseEvents({ eventTypes: ['listing.found'] }));
    act(() => {
      MockEventSource.instances[0].triggerOpen();
      // Manually fire with broken JSON
      const handlers = (MockEventSource.instances[0] as unknown as { listeners: Map<string, ESListener[]> }).listeners;
      const listingHandlers = handlers?.get('listing.found') ?? [];
      listingHandlers.forEach((h) => h({ data: 'not-valid-json' } as MessageEvent));
    });
    expect(result.current.events).toHaveLength(0);
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useSseEvents());
    const es = MockEventSource.instances[0];
    unmount();
    expect(es.readyState).toBe(2); // CLOSED
  });
});
