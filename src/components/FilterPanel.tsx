'use client';

import { FilterState, toggleMultiSelectValue, isMultiSelectActive } from '@/hooks/useFilterParams';

const PLATFORM_OPTIONS = [
  { value: 'CRAIGSLIST', label: 'Craigslist' },
  { value: 'FACEBOOK_MARKETPLACE', label: 'Facebook' },
  { value: 'EBAY', label: 'eBay' },
  { value: 'OFFERUP', label: 'OfferUp' },
  { value: 'MERCARI', label: 'Mercari' },
];

const CATEGORY_OPTIONS = [
  'electronics',
  'furniture',
  'appliances',
  'tools',
  'video games',
  'collectibles',
  'clothing',
  'sports',
  'musical',
  'automotive',
];

interface FilterPanelProps {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string) => void;
  setFilters: (newFilters: Partial<FilterState>) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  /** Show status filter? Dashboard shows listing statuses; opportunities shows opportunity statuses */
  statusOptions?: Array<{ value: string; label: string }>;
}

export default function FilterPanel({
  filters,
  setFilter,
  setFilters,
  clearFilters,
  activeFilterCount,
  statusOptions,
}: FilterPanelProps) {
  const activePlatforms = filters.platforms ? filters.platforms.split(',').filter(Boolean) : [];
  const activeCategories = filters.categories ? filters.categories.split(',').filter(Boolean) : [];
  const activeStatuses = filters.statuses ? filters.statuses.split(',').filter(Boolean) : [];

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 shadow-xl space-y-4">
      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10">
          {activePlatforms.map((p) => (
            <button
              key={p}
              onClick={() =>
                setFilter('platforms', toggleMultiSelectValue(filters.platforms, p))
              }
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/30 border border-blue-400/50 text-xs text-blue-200 hover:bg-blue-500/50 transition-colors"
            >
              {p} <span className="text-blue-300">×</span>
            </button>
          ))}
          {activeCategories.map((c) => (
            <button
              key={c}
              onClick={() =>
                setFilter('categories', toggleMultiSelectValue(filters.categories, c))
              }
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/30 border border-purple-400/50 text-xs text-purple-200 hover:bg-purple-500/50 transition-colors"
            >
              {c} <span className="text-purple-300">×</span>
            </button>
          ))}
          {activeStatuses.map((s) => (
            <button
              key={s}
              onClick={() =>
                setFilter('statuses', toggleMultiSelectValue(filters.statuses, s))
              }
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/30 border border-green-400/50 text-xs text-green-200 hover:bg-green-500/50 transition-colors"
            >
              {s} <span className="text-green-300">×</span>
            </button>
          ))}
          {(filters.minScore || filters.maxScore) && (
            <button
              onClick={() => setFilters({ minScore: '', maxScore: '' })}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/30 border border-yellow-400/50 text-xs text-yellow-200 hover:bg-yellow-500/50 transition-colors"
            >
              Score: {filters.minScore || '0'}–{filters.maxScore || '100'}{' '}
              <span className="text-yellow-300">×</span>
            </button>
          )}
          {(filters.minProfit || filters.maxProfit) && (
            <button
              onClick={() => setFilters({ minProfit: '', maxProfit: '' })}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/30 border border-orange-400/50 text-xs text-orange-200 hover:bg-orange-500/50 transition-colors"
            >
              Profit: ${filters.minProfit || '0'}–{filters.maxProfit ? `$${filters.maxProfit}` : '∞'}{' '}
              <span className="text-orange-300">×</span>
            </button>
          )}
          <button
            onClick={clearFilters}
            className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Platform multi-select */}
        <div>
          <label className="block text-xs text-blue-200/70 mb-2 font-medium">Platform</label>
          <div className="flex flex-wrap gap-1">
            {PLATFORM_OPTIONS.map((platform) => {
              const active = isMultiSelectActive(filters.platforms, platform.value);
              return (
                <button
                  key={platform.value}
                  onClick={() =>
                    setFilter('platforms', toggleMultiSelectValue(filters.platforms, platform.value))
                  }
                  className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-blue-500/40 border-blue-400 text-blue-200 shadow-sm shadow-blue-500/30'
                      : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {platform.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Score range slider */}
        <div>
          <label className="block text-xs text-blue-200/70 mb-2 font-medium">
            Score: {filters.minScore || '0'} – {filters.maxScore || '100'}
          </label>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-blue-200/50 w-6">Min</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.minScore || '0'}
                onChange={(e) =>
                  setFilter('minScore', e.target.value === '0' ? '' : e.target.value)
                }
                className="flex-1 accent-blue-500"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-blue-200/50 w-6">Max</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.maxScore || '100'}
                onChange={(e) =>
                  setFilter('maxScore', e.target.value === '100' ? '' : e.target.value)
                }
                className="flex-1 accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Profit range */}
        <div>
          <label className="block text-xs text-blue-200/70 mb-2 font-medium">Profit Range ($)</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min $"
              value={filters.minProfit}
              onChange={(e) => setFilter('minProfit', e.target.value)}
              className="w-full px-2 py-1.5 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white text-xs placeholder-blue-200/40"
            />
            <span className="text-white/40 text-xs">–</span>
            <input
              type="number"
              placeholder="Max $"
              value={filters.maxProfit}
              onChange={(e) => setFilter('maxProfit', e.target.value)}
              className="w-full px-2 py-1.5 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-1 focus:ring-blue-400/50 text-white text-xs placeholder-blue-200/40"
            />
          </div>
        </div>

        {/* Category multi-select */}
        <div>
          <label className="block text-xs text-blue-200/70 mb-2 font-medium">Category</label>
          <div className="flex flex-wrap gap-1">
            {CATEGORY_OPTIONS.map((cat) => {
              const active = isMultiSelectActive(filters.categories, cat);
              return (
                <button
                  key={cat}
                  onClick={() =>
                    setFilter('categories', toggleMultiSelectValue(filters.categories, cat))
                  }
                  className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-purple-500/40 border-purple-400 text-purple-200 shadow-sm shadow-purple-500/30'
                      : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status multi-select */}
        {statusOptions && statusOptions.length > 0 && (
          <div>
            <label className="block text-xs text-blue-200/70 mb-2 font-medium">Status</label>
            <div className="flex flex-wrap gap-1">
              {statusOptions.map((option) => {
                const active = isMultiSelectActive(filters.statuses, option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      setFilter('statuses', toggleMultiSelectValue(filters.statuses, option.value))
                    }
                    className={`px-2 py-1 rounded-lg border text-xs font-medium transition-all duration-200 ${
                      active
                        ? 'bg-green-500/40 border-green-400 text-green-200 shadow-sm shadow-green-500/30'
                        : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
