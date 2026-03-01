import { headers } from 'next/headers';
import { logger } from './logger';

/**
 * Get a child logger bound with the current request's ID.
 * Call from Server Components or Route Handlers (reads from Next.js headers).
 * Falls back to a random ID if middleware hasn't set one.
 */
export async function getRequestLogger() {
  const headerStore = await headers();
  const requestId = headerStore.get('x-request-id') ?? crypto.randomUUID();
  return {
    requestId,
    log: logger.child({ requestId }),
  };
}
