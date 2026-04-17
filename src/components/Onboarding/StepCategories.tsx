'use client';

/**
 * @file src/components/Onboarding/StepCategories.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Onboarding step 3 (Categories) — dark-migrated to canonical .fp-* in Story 14.5.
 *
 * @description
 * Multi-select niche-category picker rendered as a responsive grid. Each card
 * uses .fp-glass-sm with inline-style purple selection affordance. Story 14.5
 * replaced the legacy light-mode selection palette and checkmark color with
 * canonical rgba(109,40,217,*) tokens and #8b5cf6.
 */

export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'clothing', label: 'Clothing & Apparel', icon: '👕' },
  { id: 'toys', label: 'Toys & Games', icon: '🧸' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'tools', label: 'Tools & Hardware', icon: '🔧' },
  { id: 'collectibles', label: 'Collectibles', icon: '🏆' },
  { id: 'books', label: 'Books & Media', icon: '📚' },
  { id: 'sports', label: 'Sports & Outdoors', icon: '⚽' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

interface Props {
  selected: CategoryId[];
  onChange: (selected: CategoryId[]) => void;
}

export default function StepCategories({ selected, onChange }: Props) {
  const toggle = (id: CategoryId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#94a3b8' }}>
        Which categories are you most interested in flipping?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(({ id, label, icon }) => {
          const isSelected = selected.includes(id);
          return (
            <label
              key={id}
              className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors fp-glass-sm"
              style={
                isSelected
                  ? { border: '2px solid rgba(109,40,217,0.5)', background: 'rgba(109,40,217,0.1)' }
                  : { border: '2px solid rgba(255,255,255,0.06)' }
              }
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(id)}
                className="sr-only"
                aria-label={label}
              />
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
                {label}
              </span>
              {isSelected && (
                <span className="ml-auto text-xs" style={{ color: '#8b5cf6' }}>
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
