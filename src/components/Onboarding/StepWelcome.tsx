'use client';

/**
 * @file src/components/Onboarding/StepWelcome.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Onboarding step 1 (Welcome) — dark-migrated to canonical .fp-* in Story 14.5.
 *
 * @description
 * Introduces Flipper AI with a friendly headline, a short value paragraph, and
 * three feature mini-cards. Story 14.5 replaced the legacy light-mode mini-card
 * backgrounds with .fp-glass-sm and switched body text to the canonical dark
 * palette tokens (#e2e8f0 and #94a3b8).
 */

export default function StepWelcome({ name }: { name?: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl" role="img" aria-label="Flipper penguin">
        🐧
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>
          Welcome{name ? `, ${name}` : ''}!
        </h2>
        <p style={{ color: '#94a3b8' }}>
          Flipper AI helps you find underpriced items across multiple marketplaces and flip them for
          profit. Let&apos;s get you set up in under 2 minutes.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="fp-glass-sm p-4 rounded-xl">
          <div className="text-2xl mb-1">🔍</div>
          <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Scan marketplaces</p>
        </div>
        <div className="fp-glass-sm p-4 rounded-xl">
          <div className="text-2xl mb-1">💡</div>
          <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>AI-powered insights</p>
        </div>
        <div className="fp-glass-sm p-4 rounded-xl">
          <div className="text-2xl mb-1">💰</div>
          <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Track profits</p>
        </div>
      </div>
    </div>
  );
}
