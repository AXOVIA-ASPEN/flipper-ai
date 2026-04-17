'use client';

/**
 * @file src/components/Onboarding/WizardLayout.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Shared onboarding wizard layout — dark-migrated to canonical .fp-* in Story 14.5.
 *
 * @description
 * Renders the onboarding wizard shell: progress bar, title, step content, and
 * Back/Next navigation. Story 14.5 replaced the light blue/white palette with
 * the canonical dark glassmorphism system: .fp-glass card, .fp-prog-track /
 * .fp-prog-fill progress bar, .fp-btn-primary / .fp-btn-ghost buttons. No
 * business-logic changes.
 */

import React from 'react';

interface WizardLayoutProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}

export default function WizardLayout({
  currentStep,
  totalSteps,
  title,
  children,
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Continue',
  nextDisabled = false,
  showBack = true,
}: WizardLayoutProps) {
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fp-glass w-full max-w-lg p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
              Step {currentStep} of {totalSteps}
            </span>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm underline"
                style={{ color: '#94a3b8' }}
                aria-label="Skip onboarding"
              >
                Skip setup
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Onboarding progress"
            className="fp-prog-track w-full"
          >
            <div
              className="fp-prog-fill"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)',
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#e2e8f0' }}>
          {title}
        </h1>

        {/* Content */}
        <div className="mb-8">{children}</div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {showBack && onBack ? (
            <button type="button" onClick={onBack} className="fp-btn-ghost text-sm">
              ← Back
            </button>
          ) : (
            <div />
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="fp-btn-primary text-sm"
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
