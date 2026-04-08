/**
 * @file app/settings/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-01
 * @version 2.0
 * @brief Settings page — billing, usage, theme, notifications, scoring, logistics.
 *
 * @description
 * Server Component that renders all user settings sections. Wraps the
 * CheckoutResultBanner in Suspense for client-side search param handling
 * after Stripe checkout redirects.
 */

import { Suspense } from 'react';
import ThemeSettings from '@/components/ThemeSettings';
import NotificationSettings from '@/components/NotificationSettings';
import ScoringSettings from '@/components/ScoringSettings';
import LogisticsSettings from '@/components/LogisticsSettings';
import MessagingSettings from '@/components/MessagingSettings';
import BillingSettings from '@/components/BillingSettings';
import UsageDisplay from '@/components/UsageDisplay';
import CheckoutResultBanner from '@/components/CheckoutResultBanner';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Suspense>
        <CheckoutResultBanner />
      </Suspense>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-8">
        <BillingSettings />
        <UsageDisplay />
        <ThemeSettings />
        <NotificationSettings />
        <ScoringSettings />
        <LogisticsSettings />
        <MessagingSettings />
      </div>
    </div>
  );
}
