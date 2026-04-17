'use client';

/**
 * @file src/components/Onboarding/StepLocation.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Onboarding step 5 (Location) — dark-migrated to canonical .fp-* in Story 14.5.
 *
 * @description
 * Captures a ZIP / postal code and a search radius (10/25/50/100/250 mi) so
 * the scanner can filter local marketplace deals. Story 14.5 replaced the
 * manual light-mode form classes with the canonical .fp-input on the ZIP
 * field and .fp-glass-sm + inline purple selection style on the radius chips.
 */

const RADIUS_OPTIONS = [10, 25, 50, 100, 250] as const;

interface Props {
  zip: string;
  radius: number;
  onZipChange: (zip: string) => void;
  onRadiusChange: (radius: number) => void;
}

export default function StepLocation({ zip, radius, onZipChange, onRadiusChange }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm" style={{ color: '#94a3b8' }}>
        Set your location to find deals near you on platforms like Craigslist and Facebook
        Marketplace.
      </p>

      {/* ZIP code */}
      <div>
        <label
          htmlFor="zip-code"
          className="block text-sm font-medium mb-1"
          style={{ color: '#94a3b8' }}
        >
          ZIP / Postal Code
        </label>
        <input
          id="zip-code"
          type="text"
          value={zip}
          onChange={(e) => onZipChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="e.g. 90210"
          maxLength={5}
          pattern="\d{5}"
          className="fp-input"
          aria-label="ZIP code"
        />
      </div>

      {/* Radius */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: '#94a3b8' }}
        >
          Search Radius
        </label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => {
            const isSelected = radius === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRadiusChange(r)}
                className="px-3 py-1.5 text-sm rounded-lg fp-glass-sm transition-colors"
                style={
                  isSelected
                    ? {
                        border: '2px solid rgba(109,40,217,0.5)',
                        background: 'rgba(109,40,217,0.1)',
                        color: '#e2e8f0',
                        fontWeight: 500,
                      }
                    : { border: '2px solid rgba(255,255,255,0.06)', color: '#94a3b8' }
                }
                aria-pressed={isSelected}
              >
                {r} mi
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs" style={{ color: '#475569' }}>
        You can update your location anytime in Settings.
      </p>
    </div>
  );
}
