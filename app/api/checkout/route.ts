/**
 * POST /api/checkout — Create a Stripe Checkout session for subscription upgrade.
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { SubscriptionTier } from '@/lib/subscription-tiers';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
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
      email: session.user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: { source: 'flipper-ai' },
      });
      customerId = customer.id;
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?checkout=success&tier=${tier}`,
      cancel_url: `${baseUrl}/settings?checkout=cancelled`,
      metadata: {
        userId: session.user.email,
        tier,
      },
      subscription_data: {
        metadata: { tier },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return handleError(error, request.url);
  }
}
