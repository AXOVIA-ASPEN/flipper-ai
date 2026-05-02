'use client';

/**
 * @file src/components/Onboarding/StepBudget.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Onboarding step 4 (Budget) — dark-migrated to canonical .fp-* in Story 14.5.
 *
 * @description
 * Single-select radio list of typical per-item budget ranges (micro → premium).
 * Each row renders as an .fp-glass-sm card with purple selection affordance
 * and a custom radio dot. Story 14.5 replaced the blue/gray selection palette
 * with canonical dark tokens (#7c3aed for the filled dot, rgba(109,40,217,*)
 * for the card border/bg).
 */

export const BUDGET_RANGES = [
  { id: 'micro', label: 'Micro ($1–$50)', min: 1, max: 50 },
  { id: 'small', label: 'Small ($50–$200)', min: 50, max: 200 },
  { id: 'medium', label: 'Medium ($200–$500)', min: 200, max: 500 },
  { id: 'large', label: 'Large ($500–$2,000)', min: 500, max: 2000 },
  { id: 'premium', label: 'Premium ($2,000+)', min: 2000, max: 999999 },
] as const;

export type BudgetRangeId = (typeof BUDGET_RANGES)[number]['id'];

interface Props {
  selected: BudgetRangeId;
  onChange: (id: BudgetRangeId) => void;
}

export default function StepBudget({ selected, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#94a3b8' }}>
        What&apos;s your typical budget per item? This helps Flipper AI surface the right
        opportunities.
      </p>
      <div className="space-y-3">
        {BUDGET_RANGES.map(({ id, label }) => {
          const isSelected = selected === id;
          return (
            <label
              key={id}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors fp-glass-sm"
              style={
                isSelected
                  ? { border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)' }
                  : { border: '2px solid rgba(255,255,255,0.06)' }
              }
            >
              <input
                type="radio"
                name="budget"
                value={id}
                checked={isSelected}
                onChange={() => onChange(id)}
                className="sr-only"
                aria-label={label}
              />
              <div
                className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                style={
                  isSelected
                    ? { borderColor: '#8b5cf6', background: '#8b5cf6' }
                    : { borderColor: 'rgba(255,255,255,0.15)', background: 'transparent' }
                }
              />
              <span className="font-medium" style={{ color: '#e2e8f0' }}>
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
