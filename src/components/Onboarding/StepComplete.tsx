'use client';

/**
 * @file src/components/Onboarding/StepComplete.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Onboarding step 6 (Complete) — dark-migrated to canonical .fp-* in Story 14.5.
 *
 * @description
 * Final "You're all set!" screen with a Go-to-Dashboard primary CTA and a
 * secondary link to Settings. Story 14.5 replaced the legacy light-mode button
 * background with .fp-btn-primary and switched the body copy and secondary
 * link to the canonical dark text palette.
 */

import Link from 'next/link';

interface Props {
  onGoToDashboard: () => void;
}

export default function StepComplete({ onGoToDashboard }: Props) {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl animate-bounce" role="img" aria-label="Party popper">
        🎉
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#e2e8f0' }}>
          You&apos;re all set!
        </h2>
        <p style={{ color: '#94a3b8' }}>
          Flipper AI is configured and ready to find deals for you. Head to your dashboard to run
          your first scan.
        </p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onGoToDashboard}
          className="fp-btn-primary w-full py-3 px-6 font-semibold"
        >
          Go to Dashboard →
        </button>
        <Link
          href="/settings"
          className="block text-sm underline transition-colors"
          style={{ color: '#475569' }}
        >
          Adjust settings later
        </Link>
      </div>
    </div>
  );
}
