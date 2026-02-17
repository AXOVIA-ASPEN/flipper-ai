'use client';

/**
 * StepMarketplaces — Select which marketplaces to monitor.
 * Author: ASPEN
 * Company: Axovia AI
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
      <p className="text-gray-600 text-sm">Choose the platforms you want Flipper AI to scan:</p>
      <div className="space-y-3">
        {MARKETPLACES.map(({ id, label, icon }) => {
          const isSelected = selected.includes(id);
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
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(id)}
                className="sr-only"
                aria-label={label}
              />
              <span className="text-2xl">{icon}</span>
              <span className="font-medium text-gray-800">{label}</span>
              {isSelected && <span className="ml-auto text-blue-500">✓</span>}
            </label>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-sm text-amber-600">Select at least one marketplace to continue.</p>
      )}
    </div>
  );
}
