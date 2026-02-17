/**
 * useSseEvents — React hook for consuming real-time SSE notifications.
 *
 * Usage:
 *   const { events, isConnected, lastError } = useSseEvents(['listing.found', 'alert.high-value']);
 *
 * Features:
 *  - Auto-connects to GET /api/events on mount
 *  - Auto-reconnects on disconnect (exponential backoff, max 30s)
 *  - Cleans up EventSource on unmount
 *  - Optional event filtering by type
 *  - Exposes connection state and last error
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SseEventType } from '@/lib/sse-emitter';

export interface SseNotification<T = unknown> {
  type: SseEventType;
  data: T;
  receivedAt: number;
  id?: string;
}

export interface UseSseEventsOptions {
  /** Filter to only these event types. If omitted, all events are captured. */
  eventTypes?: SseEventType[];
  /** Max events to keep in memory (default: 50). Older events are dropped. */
  maxEvents?: number;
  /** Disable auto-reconnect (default: false). */
  noReconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000). */
  reconnectDelayMs?: number;
  /** Max reconnect delay in ms (default: 30000). */
  maxReconnectDelayMs?: number;
}

export interface UseSseEventsReturn<T = unknown> {
  events: SseNotification<T>[];
  isConnected: boolean;
  lastError: string | null;
  clearEvents: () => void;
}

const DEFAULT_MAX_EVENTS = 50;
const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;

export function useSseEvents<T = unknown>(
  options: UseSseEventsOptions = {}
): UseSseEventsReturn<T> {
  const {
    eventTypes,
    maxEvents = DEFAULT_MAX_EVENTS,
    noReconnect = false,
    reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
    maxReconnectDelayMs = DEFAULT_MAX_RECONNECT_DELAY_MS,
  } = options;

  const [events, setEvents] = useState<SseNotification<T>[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDelay = useRef(reconnectDelayMs);
  const unmounted = useRef(false);

  const pushEvent = useCallback(
    (notification: SseNotification<T>) => {
      setEvents((prev) => {
        const next = [notification, ...prev];
        return next.length > maxEvents ? next.slice(0, maxEvents) : next;
      });
    },
    [maxEvents]
  );

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const es = new EventSource('/api/events');
    esRef.current = es;

    es.onopen = () => {
      if (unmounted.current) return;
      setIsConnected(true);
      setLastError(null);
      currentDelay.current = reconnectDelayMs; // reset backoff
    };

    es.onerror = () => {
      if (unmounted.current) return;
      setIsConnected(false);
      setLastError('Connection lost');
      es.close();

      if (!noReconnect) {
        const delay = Math.min(currentDelay.current * 2, maxReconnectDelayMs);
        currentDelay.current = delay;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    // Register handlers for all tracked event types
    const typesToTrack: SseEventType[] = eventTypes ?? [
      'listing.found',
      'job.complete',
      'job.failed',
      'opportunity.created',
      'opportunity.updated',
      'alert.high-value',
    ];

    for (const type of typesToTrack) {
      es.addEventListener(type, (e: MessageEvent) => {
        if (unmounted.current) return;
        try {
          const data = JSON.parse(e.data) as T;
          pushEvent({ type, data, receivedAt: Date.now(), id: e.lastEventId || undefined });
        } catch {
          // Malformed JSON — skip
        }
      });
    }
  }, [eventTypes, noReconnect, reconnectDelayMs, maxReconnectDelayMs, pushEvent]);

  useEffect(() => {
    unmounted.current = false;
    connect();

    return () => {
      unmounted.current = true;
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, isConnected, lastError, clearEvents };
}
