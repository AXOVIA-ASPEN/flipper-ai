'use client';

/**
 * WizardLayout — Shared layout for the onboarding wizard.
 * Shows progress bar + step navigation.
 * Author: ASPEN
 * Company: Axovia AI
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">
              Step {currentStep} of {totalSteps}
            </span>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
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
            className="w-full bg-gray-200 rounded-full h-2"
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>

        {/* Content */}
        <div className="mb-8">{children}</div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {showBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
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
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
