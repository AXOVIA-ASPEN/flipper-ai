/**
 * @file app/api/webhooks/stripe/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-01
 * @version 2.0
 * @brief POST /api/webhooks/stripe — Handle Stripe webhook events.
 *
 * @description
 * Processes Stripe webhook events for subscription lifecycle management.
 * Handles checkout completion, subscription creation/update/deletion,
 * and payment failures. Updates user tier in the database and sends
 * notification emails for payment issues. Uses Stripe signature
 * verification for security (NFR-SEC-08).
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_TO_TIER } from '@/lib/stripe';
import Stripe from 'stripe';
import prisma from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { handleError, ValidationError } from '@/lib/errors';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Guard: prevent empty-string bypass of webhook signature verification
if (!webhookSecret && process.env.NODE_ENV === 'production') {
  console.error('🚨 CRITICAL: STRIPE_WEBHOOK_SECRET is not configured — webhook endpoint is INSECURE');
}

export async function POST(req: NextRequest) {
  // Reject requests in production when webhook secret is not configured
  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    console.error('🚨 Rejecting webhook request — STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 });
  }

  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      throw new ValidationError('Missing signature');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: unknown) {
      console.error('Webhook signature verification failed:', err instanceof Error ? err.message : String(err));
      throw new ValidationError('Invalid signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tier = session.metadata?.tier;
        if (!tier || !['FREE', 'FLIPPER', 'PRO'].includes(tier)) {
          console.warn(`[Stripe Webhook] checkout.session.completed missing or invalid tier metadata: "${tier}" — skipping tier update`);
          break;
        }
        const email = session.customer_details?.email || session.metadata?.userId;
        const customerId = typeof session.customer === 'string' ? session.customer : undefined;
        if (email) {
          await updateUserTier(email, tier, customerId);
          console.log(`✅ User ${email} upgraded to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = PRICE_TO_TIER[priceId] || subscription.metadata?.tier;
        if (!tier || !['FREE', 'FLIPPER', 'PRO'].includes(tier)) {
          console.warn(`[Stripe Webhook] subscription.created — unrecognized tier "${tier}" (priceId: ${priceId}) — skipping tier update`);
          break;
        }
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        ) as Stripe.Customer;
        if (customer.email) {
          await updateUserTier(customer.email, tier);
          console.log(`✅ Subscription created: ${customer.email} → ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = PRICE_TO_TIER[priceId] || subscription.metadata?.tier;
        if (!tier || !['FREE', 'FLIPPER', 'PRO'].includes(tier)) {
          console.warn(`[Stripe Webhook] subscription.updated — unrecognized tier "${tier}" (priceId: ${priceId}) — skipping tier update`);
          break;
        }
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

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customer = await stripe.customers.retrieve(
          invoice.customer as string
        ) as Stripe.Customer;
        if (customer.email) {
          console.warn(`[Stripe Webhook] Payment failed for ${customer.email}`);
          try {
            await emailService.sendPaymentFailed({
              name: customer.name || undefined,
              email: customer.email,
            });
          } catch (emailErr) {
            console.error('[Stripe Webhook] Failed to send payment failure email:', emailErr);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return handleError(error, req.url);
  }

  return NextResponse.json({ received: true });
}

/**
 * Update user subscription tier in the database.
 * Uses updateMany instead of update so a missing user returns count: 0
 * rather than throwing — webhooks MUST always return 200 to Stripe.
 */
async function updateUserTier(email: string, tier: string, stripeCustomerId?: string): Promise<void> {
  const data: { subscriptionTier: string; stripeCustomerId?: string } = {
    subscriptionTier: tier,
  };
  if (stripeCustomerId) {
    data.stripeCustomerId = stripeCustomerId;
  }
  const result = await prisma.user.updateMany({
    where: { email },
    data,
  });
  if (result.count === 0) {
    console.warn(`[Stripe Webhook] No user found with email ${email} — tier not updated`);
  }
}
