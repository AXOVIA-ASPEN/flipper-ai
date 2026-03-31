/**
 * @file app/api/checkout/portal/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-01
 * @version 1.0
 * @brief POST /api/checkout/portal — Create a Stripe Customer Portal session.
 *
 * @description
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows authenticated subscribers to update payment methods, view invoices,
 * or cancel their subscription. Requires an existing Stripe customer record.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

import { handleError, NotFoundError, UnauthorizedError } from '@/lib/errors';
export async function POST() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser?.email) {
      throw new UnauthorizedError('Unauthorized');
    }

    const customers = await stripe.customers.list({
      email: sessionUser.email,
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
    return handleError(error);
  }
}
