/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts (both in dev and prod).
 * Used to initialize Sentry and other monitoring tools.
 */

export async function register() {
  // Only run on server (not in Edge Runtime or client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Optional: runs before the server starts handling requests
export async function onRequestError(
  err: Error,
  request: Request,
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  },
) {
  // Sentry automatically captures this via its instrumentation
  // This hook is for custom error handling (e.g., logging to CloudWatch)
  console.error('Request error:', {
    error: err.message,
    path: context.routePath,
    type: context.routeType,
  });
}
