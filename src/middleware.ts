/**
 * Next.js Middleware - Request monitoring & metrics
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add request timing header
  response.headers.set('X-Request-Start', Date.now().toString());

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
