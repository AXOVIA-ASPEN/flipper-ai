/**
 * Server-Sent Events (SSE) emitter — in-process pub/sub for real-time notifications.
 *
 * Architecture:
 *  - Each connected client registers a WritableStreamDefaultWriter via subscribe().
 *  - emit() broadcasts a named event + JSON payload to all connected clients.
 *  - Disconnected clients are pruned automatically on write errors.
 *
 * Event types:
 *  - 'listing.found'       → New high-value listing discovered by a scraper
 *  - 'job.started'         → Scraper job entered RUNNING state
 *  - 'job.progress'        → Scraper job progress milestone (25/50/75% or every 5 items)
 *  - 'job.complete'        → Scraper job finished
 *  - 'job.failed'          → Scraper job failed
 *  - 'opportunity.created' → New flip opportunity identified
 *  - 'opportunity.updated' → Opportunity status changed
 *  - 'alert.high-value'    → Item score exceeds user threshold
 *  - 'ping'                → Heartbeat to keep connection alive
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

export type SseEventType =
  | 'listing.found'
  | 'job.started'
  | 'job.progress'
  | 'job.complete'
  | 'job.failed'
  | 'opportunity.created'
  | 'opportunity.updated'
  | 'alert.high-value'
  | 'listing.sold'
  | 'listing.price_changed'
  | 'listing.expiring'
  | 'listing.unavailable'
  | 'ping';

/**
 * Returns true when a scraper processing-loop index should trigger a `job.progress`
 * SSE emission. Fires every `interval` items (default 5) and at the 25/50/75% marks.
 * Same index that hits both the interval and a percentage milestone still returns
 * true only once — callers emit once per true value.
 *
 * @param current zero-based index of the just-processed listing
 * @param total   total count of listings in the batch, or null when unknown
 * @param interval emit-every-N interval (default 5)
 */
export function shouldEmitProgress(
  current: number,
  total: number | null,
  interval: number = 5
): boolean {
  if ((current + 1) % interval === 0) return true;
  if (total && total > 0) {
    const pct = Math.round(((current + 1) / total) * 100);
    if ([25, 50, 75].includes(pct)) return true;
  }
  return false;
}

export interface SseEvent<T = unknown> {
  type: SseEventType;
  data: T;
  id?: string;
}

type ClientWriter = WritableStreamDefaultWriter<Uint8Array>;

/**
 * Global SSE emitter singleton.
 * In serverless environments each cold start will have a fresh emitter,
 * but within a running Node.js process this provides process-wide broadcasting.
 */
export class SseEmitter {
  private clients: Set<ClientWriter> = new Set();
  private encoder = new TextEncoder();

  /** Format a message per the SSE wire protocol (RFC 8895). */
  formatMessage(event: SseEvent): string {
    const lines: string[] = [];
    if (event.id) lines.push(`id: ${event.id}`);
    lines.push(`event: ${event.type}`);
    lines.push(`data: ${JSON.stringify(event.data)}`);
    lines.push(''); // blank line terminates event
    return lines.join('\n') + '\n';
  }

  /** Register a new client connection. Returns an unsubscribe function. */
  subscribe(writer: ClientWriter): () => void {
    this.clients.add(writer);
    return () => {
      this.clients.delete(writer);
    };
  }

  /** Emit an event to all connected clients. Prunes dead connections. */
  async emit<T>(event: SseEvent<T>): Promise<number> {
    const message = this.formatMessage(event as SseEvent);
    const encoded = this.encoder.encode(message);
    const dead: ClientWriter[] = [];
    let delivered = 0;

    for (const writer of this.clients) {
      try {
        await writer.write(encoded);
        delivered++;
      } catch {
        // Connection closed — queue for removal
        dead.push(writer);
      }
    }

    for (const writer of dead) {
      this.clients.delete(writer);
    }

    return delivered;
  }

  /** Send a ping to all clients (keeps connections alive). */
  async ping(): Promise<number> {
    return this.emit({ type: 'ping', data: { ts: Date.now() } });
  }

  /** Count of currently-connected clients. */
  get connectionCount(): number {
    return this.clients.size;
  }

  /** Disconnect all clients (useful for testing / graceful shutdown). */
  disconnectAll(): void {
    this.clients.clear();
  }
}

// Singleton — exported for use in route handlers and event producers.
export const sseEmitter = new SseEmitter();
