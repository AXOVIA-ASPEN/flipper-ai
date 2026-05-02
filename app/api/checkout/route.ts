/**
 * @file app/api/checkout/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-01
 * @version 1.0
 * @brief POST /api/checkout — Create a Stripe Checkout session for subscription upgrade.
 *
 * @description
 * Creates a Stripe Checkout session for subscription upgrades. Finds or creates
 * a Stripe customer by email, stores the customer ID on the user record, and
 * returns the hosted checkout URL. Supports FLIPPER and PRO tiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { SubscriptionTier } from '@/lib/subscription-tiers';
import prisma from '@/lib/db';

import { handleError, ValidationError, UnauthorizedError } from '@/lib/errors';
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser?.email) {
      throw new UnauthorizedError('Unauthorized');
    }

    const body = await req.json();
    const { tier } = body as { tier: SubscriptionTier };

    if (!tier || !['FLIPPER', 'PRO'].includes(tier)) {
      throw new ValidationError('Invalid tier. Must be FLIPPER or PRO.');
    }

    const priceId = STRIPE_PRICE_IDS[tier as keyof typeof STRIPE_PRICE_IDS];

    // Find or create Stripe customer
    const customers = await stripe.customers.list({
      email: sessionUser.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: sessionUser.email,
        name: sessionUser.name || undefined,
        metadata: { source: 'flipper-ai' },
      });
      customerId = customer.id;
    }

    // Store Stripe customer ID on user record (updateMany: no throw if email missing in DB)
    const persist = await prisma.user.updateMany({
      where: { email: sessionUser.email },
      data: { stripeCustomerId: customerId },
    });
    if (persist.count === 0) {
      console.warn(
        `[Checkout] No user row for email ${sessionUser.email} — stripeCustomerId not persisted; checkout session still created`
      );
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3200';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?checkout=success&tier=${tier}`,
      cancel_url: `${baseUrl}/settings?checkout=cancelled`,
      metadata: {
        userId: sessionUser.email,
        tier,
      },
      subscription_data: {
        metadata: { tier },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return handleError(error, req.url);
  }
}
