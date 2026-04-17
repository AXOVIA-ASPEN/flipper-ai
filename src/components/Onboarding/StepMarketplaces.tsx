'use client';

/**
 * @file src/components/Onboarding/StepMarketplaces.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Onboarding step 2 (Marketplaces) — dark-migrated to canonical .fp-* in Story 14.5.
 *
 * @description
 * Multi-select marketplace picker. Each row renders as an .fp-glass-sm card
 * with inline-style selection affordance (purple tinted border and background
 * when selected). Story 14.5 replaced the legacy light-mode selection state
 * with rgba(109,40,217,*) tokens and switched the selected-state checkmark
 * to the canonical purple hex #8b5cf6.
 */

export const MARKETPLACES = [
  { id: 'ebay', label: 'eBay', icon: '🛍️' },
  { id: 'facebook', label: 'Facebook Marketplace', icon: '📘' },
  { id: 'craigslist', label: 'Craigslist', icon: '📌' },
  { id: 'offerup', label: 'OfferUp', icon: '🔵' },
  { id: 'mercari', label: 'Mercari', icon: '🛒' },
] as const;

export type MarketplaceId = (typeof MARKETPLACES)[number]['id'];

interface Props {
  selected: MarketplaceId[];
  onChange: (selected: MarketplaceId[]) => void;
}

export default function StepMarketplaces({ selected, onChange }: Props) {
  const toggle = (id: MarketplaceId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#94a3b8' }}>
        Choose the platforms you want Flipper AI to scan:
      </p>
      <div className="space-y-3">
        {MARKETPLACES.map(({ id, label, icon }) => {
          const isSelected = selected.includes(id);
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
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(id)}
                className="sr-only"
                aria-label={label}
              />
              <span className="text-2xl">{icon}</span>
              <span className="font-medium" style={{ color: '#e2e8f0' }}>{label}</span>
              {isSelected && (
                <span className="ml-auto" style={{ color: '#8b5cf6' }}>
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-sm" style={{ color: '#fbbf24' }}>
          Select at least one marketplace to continue.
        </p>
      )}
    </div>
  );
}
