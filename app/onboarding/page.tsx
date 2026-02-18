'use client';

/**
 * Onboarding Wizard Page — /onboarding
 *
 * Multi-step wizard that guides new users through initial setup.
 * Progress is persisted to the API so refreshes don't lose state.
 *
 * Steps:
 *   1. Welcome
 *   2. Marketplaces
 *   3. Categories
 *   4. Budget
 *   5. Location
 *   6. Complete
 *
 * Author: ASPEN
 * Company: Axovia AI
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import WizardLayout from '@/components/Onboarding/WizardLayout';
import StepWelcome from '@/components/Onboarding/StepWelcome';
import StepMarketplaces, { MarketplaceId } from '@/components/Onboarding/StepMarketplaces';
import StepCategories, { CategoryId } from '@/components/Onboarding/StepCategories';
import StepBudget, { BudgetRangeId } from '@/components/Onboarding/StepBudget';
import StepLocation from '@/components/Onboarding/StepLocation';
import StepComplete from '@/components/Onboarding/StepComplete';

const TOTAL_STEPS = 6;

const STEP_TITLES: Record<number, string> = {
  1: 'Welcome to Flipper AI',
  2: 'Choose Your Marketplaces',
  3: 'Pick Your Niches',
  4: 'Set Your Budget',
  5: 'Your Location',
  6: "You're ready!",
};

async function saveStep(step: number, complete?: boolean) {
  await fetch('/api/user/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, complete }),
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Step-specific state
  const [marketplaces, setMarketplaces] = useState<MarketplaceId[]>([]);
  const [categories, setCategories] = useState<CategoryId[]>([]);
  const [budget, setBudget] = useState<BudgetRangeId>('small');
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState(25);

  // Load current step from API on mount
  useEffect(() => {
    fetch('/api/user/onboarding')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          if (data.data.onboardingComplete) {
            // Already done — redirect to dashboard
            router.replace('/');
            return;
          }
          // Resume from saved step (minimum 1)
          const savedStep = Math.max(1, Math.min(data.data.onboardingStep || 1, TOTAL_STEPS));
          setStep(savedStep);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const goToStep = useCallback(
    async (nextStep: number) => {
      setStep(nextStep);
      await saveStep(nextStep);
    },
    []
  );

  const handleNext = useCallback(async () => {
    if (step < TOTAL_STEPS) {
      await goToStep(step + 1);
    }
  }, [step, goToStep]);

  const handleBack = useCallback(async () => {
    if (step > 1) {
      await goToStep(step - 1);
    }
  }, [step, goToStep]);

  const handleSkip = useCallback(async () => {
    await saveStep(TOTAL_STEPS, true);
    router.replace('/');
  }, [router]);

  const handleComplete = useCallback(async () => {
    await saveStep(TOTAL_STEPS, true);
    router.replace('/');
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🐧</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isNextDisabled =
    (step === 2 && marketplaces.length === 0);

  return (
    <WizardLayout
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      title={STEP_TITLES[step] ?? ''}
      onBack={step > 1 && step < TOTAL_STEPS ? handleBack : undefined}
      onNext={step < TOTAL_STEPS ? handleNext : undefined}
      onSkip={step < TOTAL_STEPS ? handleSkip : undefined}
      nextLabel={step === TOTAL_STEPS - 1 ? 'Finish Setup' : 'Continue'}
      nextDisabled={isNextDisabled}
      showBack={step > 1}
    >
      {step === 1 && <StepWelcome />}
      {step === 2 && (
        <StepMarketplaces selected={marketplaces} onChange={setMarketplaces} />
      )}
      {step === 3 && (
        <StepCategories selected={categories} onChange={setCategories} />
      )}
      {step === 4 && <StepBudget selected={budget} onChange={setBudget} />}
      {step === 5 && (
        <StepLocation
          zip={zip}
          radius={radius}
          onZipChange={setZip}
          onRadiusChange={setRadius}
        />
      )}
      {step === 6 && <StepComplete onGoToDashboard={handleComplete} />}
    </WizardLayout>
  );
}
