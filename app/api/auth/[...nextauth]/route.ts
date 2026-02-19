/**
 * NextAuth.js API Route Handler
 * Handles all authentication requests (signin, signout, callback, etc.)
 */

import { handlers } from '@/lib/auth';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export const dynamic = 'force-dynamic';
export const { GET, POST } = handlers;
