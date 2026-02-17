'use client';

/**
 * StepBudget — Budget range slider for item flipping.
 * Author: ASPEN
 * Company: Axovia AI
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
      <p className="text-gray-600 text-sm">
        What&apos;s your typical budget per item? This helps Flipper AI surface the right
        opportunities.
      </p>
      <div className="space-y-3">
        {BUDGET_RANGES.map(({ id, label }) => {
          const isSelected = selected === id;
          return (
            <label
              key={id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
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
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}
              />
              <span className="font-medium text-gray-800">{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
