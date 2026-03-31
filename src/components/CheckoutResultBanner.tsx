/**
 * @file src/components/CheckoutResultBanner.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.0
 * @brief Client component that reads checkout result from URL search params.
 *
 * @description
 * Reads ?checkout=success&tier=FLIPPER or ?checkout=cancelled from the URL
 * and displays a corresponding toast notification. Cleans up the URL params
 * after showing the message.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastContainer';
import { BILLING_SUBSCRIPTION_SYNCED_EVENT } from '@/lib/billing-events';

const USAGE_POLL_ATTEMPTS = 20;
const USAGE_POLL_INTERVAL_MS = 400;

export default function CheckoutResultBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const hasShown = useRef(false);

  useEffect(() => {
    if (hasShown.current) return;

    const checkout = searchParams.get('checkout');
    if (!checkout) return;

    hasShown.current = true;

    if (checkout === 'success') {
      const tierParam = searchParams.get('tier');
      const tierLabel = tierParam || 'your new plan';
      showToast({
        type: 'success',
        title: 'Subscription activated!',
        message: `Welcome to ${tierLabel}! Your account has been upgraded. Enjoy your new features.`,
        duration: 8000,
      });

      void (async () => {
        router.replace('/settings', { scroll: false });
        router.refresh();

        const expected = tierParam?.toUpperCase();
        const hasExpectedTier = expected === 'FLIPPER' || expected === 'PRO';

        if (!hasExpectedTier) {
          window.dispatchEvent(new CustomEvent(BILLING_SUBSCRIPTION_SYNCED_EVENT));
          return;
        }

        for (let i = 0; i < USAGE_POLL_ATTEMPTS; i++) {
          try {
            const res = await fetch('/api/usage');
            if (res.ok) {
              const json = await res.json();
              const payload = json.data ?? json;
              const current = String(payload.tier ?? '').toUpperCase();
              if (current === expected) {
                break;
              }
            }
          } catch {
            /* retry */
          }
          await new Promise((r) => setTimeout(r, USAGE_POLL_INTERVAL_MS));
        }

        window.dispatchEvent(new CustomEvent(BILLING_SUBSCRIPTION_SYNCED_EVENT));
      })();
    } else if (checkout === 'cancelled') {
      showToast({
        type: 'info',
        title: 'Checkout cancelled',
        message: 'No changes were made to your subscription. You can upgrade anytime.',
        duration: 6000,
      });
      router.replace('/settings', { scroll: false });
    }
  }, [searchParams, router, showToast]);

  return null;
}
