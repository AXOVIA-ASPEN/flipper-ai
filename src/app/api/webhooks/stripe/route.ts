/**
 * POST /api/webhooks/stripe — Handle Stripe webhook events.
 * Updates user subscription tier on checkout completion / cancellation.
 * Author: ASPEN
 * Company: Axovia AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_TO_TIER } from '@/lib/stripe';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tier = session.metadata?.tier || 'FLIPPER';
        const email = session.customer_details?.email || session.metadata?.userId;
        if (email) {
          await updateUserTier(email, tier);
          console.log(`✅ User ${email} upgraded to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = PRICE_TO_TIER[priceId] || subscription.metadata?.tier || 'FREE';
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        if (customer.email) {
          await updateUserTier(customer.email, tier);
          console.log(`✅ Subscription updated: ${customer.email} → ${tier}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        if (customer.email) {
          await updateUserTier(customer.email, 'FREE');
          console.log(`✅ Subscription cancelled: ${customer.email} → FREE`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Update user subscription tier in the database.
 * TODO: Replace with actual Prisma call once DB is connected.
 */
async function updateUserTier(email: string, tier: string): Promise<void> {
  // Placeholder — wire to Prisma when DB is ready:
  // await prisma.user.update({ where: { email }, data: { subscriptionTier: tier } });
  console.log(`[DB] Would update ${email} to tier ${tier}`);
}
