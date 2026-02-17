'use client';

/**
 * StepLocation — ZIP code + search radius for local deals.
 * Author: ASPEN
 * Company: Axovia AI
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
      <p className="text-gray-600 text-sm">
        Set your location to find deals near you on platforms like Craigslist and Facebook
        Marketplace.
      </p>

      {/* ZIP code */}
      <div>
        <label
          htmlFor="zip-code"
          className="block text-sm font-medium text-gray-700 mb-1"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="ZIP code"
        />
      </div>

      {/* Radius */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Radius
        </label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadiusChange(r)}
              className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-colors ${
                radius === r
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
              aria-pressed={radius === r}
            >
              {r} mi
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        You can update your location anytime in Settings.
      </p>
    </div>
  );
}
