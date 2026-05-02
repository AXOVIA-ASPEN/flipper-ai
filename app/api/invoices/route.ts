/**
 * @file app/api/invoices/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief GET /api/invoices — list the authed user's recent Stripe invoices.
 *
 * @description
 * Returns the most recent paid/pending/failed invoices for the current user's
 * Stripe customer record. Used by `BillingSettings.tsx` to render the canonical
 * invoice-history table required by Story 14.8 AC #5. Returns an empty array
 * (success: true, data: []) for users without a Stripe customer or with no
 * invoices on record. Non-Stripe-subscribed users see the canonical EmptyState
 * in the UI rather than an error.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { handleError, UnauthorizedError } from '@/lib/errors';

export interface InvoiceRow {
  id: string;
  number: string | null;
  createdAt: number;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

function mapStatus(stripeStatus: string | null | undefined): InvoiceRow['status'] {
  if (stripeStatus === 'paid') return 'paid';
  if (stripeStatus === 'open' || stripeStatus === 'draft') return 'pending';
  return 'failed';
}

export async function GET() {
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
      return NextResponse.json({ success: true, data: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: customers.data[0].id,
      limit: 12,
    });

    const rows: InvoiceRow[] = invoices.data.map((inv) => ({
      id: inv.id ?? '',
      number: inv.number ?? null,
      createdAt: inv.created,
      amount: inv.amount_paid || inv.amount_due,
      currency: inv.currency,
      status: mapStatus(inv.status),
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdfUrl: inv.invoice_pdf ?? null,
    }));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return handleError(error);
  }
}
