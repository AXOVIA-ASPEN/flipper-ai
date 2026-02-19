/**
 * GET /api/docs - Serve OpenAPI 3.0 specification
 *
 * Returns the full OpenAPI spec as JSON.
 * Use with Swagger UI, Redoc, or Postman collection import.
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi-spec';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
