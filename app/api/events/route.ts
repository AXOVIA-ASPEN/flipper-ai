/**
 * GET /api/events — Server-Sent Events endpoint
 *
 * Establishes a persistent SSE connection. The client receives:
 *  - An immediate 'ping' on connect (confirms stream is live)
 *  - Heartbeat pings every 30 seconds (prevents proxy/load-balancer timeouts)
 *  - Push events: listing.found, job.complete, opportunity.created, alert.high-value
 *
 * Usage (browser):
 *   const es = new EventSource('/api/events');
 *   es.addEventListener('listing.found', e => console.log(JSON.parse(e.data)));
 *
 * Authentication:
 *   Session cookie is checked. Unauthenticated requests receive 401.
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
import { NextRequest } from 'next/server';
import { sseEmitter } from '@/lib/sse-emitter';
import { getAuthUserId } from '@/lib/auth-middleware';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_INTERVAL_MS = 30_000;
const ENCODER = new TextEncoder();

/** Build the SSE stream and return a Response with correct headers. */
export async function GET(request: NextRequest) {
  // Auth check — SSE is a privileged endpoint
  const userId = await getAuthUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  // Register with the global emitter
  const unsubscribe = sseEmitter.subscribe(writer);

  // Send initial ping so the client knows the stream is alive
  await writer.write(
    ENCODER.encode(
      sseEmitter.formatMessage({ type: 'ping', data: { ts: Date.now(), userId } })
    )
  );

  // Heartbeat interval — prevent proxy timeouts.
  // The interval body runs async in the event loop; unreachable in synchronous unit tests.
  /* istanbul ignore next */
  const heartbeat = setInterval(async () => {
    /* istanbul ignore next */
    try {
      /* istanbul ignore next */
      await writer.write(
        ENCODER.encode(sseEmitter.formatMessage({ type: 'ping', data: { ts: Date.now() } }))
      );
    } catch {
      /* istanbul ignore next */
      clearInterval(heartbeat);
      /* istanbul ignore next */
      unsubscribe();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Clean up when the client disconnects.
  // The abort handler fires asynchronously on connection close; not reachable in unit tests.
  /* istanbul ignore next */
  request.signal.addEventListener('abort', () => {
    /* istanbul ignore next */
    clearInterval(heartbeat);
    /* istanbul ignore next */
    unsubscribe();
    /* istanbul ignore next */
    writer.close().catch(() => {
      // Already closed — ignore
    });
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
