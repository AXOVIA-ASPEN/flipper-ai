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
import IntegrationsSettings from '@/components/IntegrationsSettings';

export default function SettingsPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
        <Suspense>
          <CheckoutResultBanner />
        </Suspense>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>Configure your Flipper.ai experience</p>

        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <BillingSettings />
        </div>
        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <UsageDisplay />
        </div>
        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <ThemeSettings />
        </div>
        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <NotificationSettings />
        </div>
        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <ScoringSettings />
        </div>
        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <LogisticsSettings />
        </div>
        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <MessagingSettings />
        </div>
        {/* Story 12.1: Google Calendar and other integrations */}
        <div className="fp-glass" style={{ padding: 24, marginBottom: 16 }}>
          <Suspense>
            <IntegrationsSettings />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
