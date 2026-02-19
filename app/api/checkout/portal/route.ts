/**
 * POST /api/checkout/portal — Create a Stripe Customer Portal session.
 * Allows users to manage their subscription (upgrade/downgrade/cancel).
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new UnauthorizedError('Unauthorized');
    }

    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      throw new NotFoundError('No billing account found. Subscribe first.');
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return handleError(error, request.url);
  }
}
