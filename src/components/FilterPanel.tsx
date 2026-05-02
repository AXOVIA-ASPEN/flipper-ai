/**
 * @file src/components/FilterPanel.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2025-01-01
 * @version 1.1
 * @brief Reusable filter panel for opportunities and dashboard listing views.
 *
 * @description
 * Provides multi-select platform/category/status filters, score range sliders,
 * and profit range number inputs. Renders active filter chips above the filter
 * grid. Accepts a statusOptions prop so callers can supply context-appropriate
 * status values (listing statuses vs opportunity statuses).
 */

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
    <div className="fp-glass" style={{ padding: 24, marginBottom: 24 }}>
      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10" style={{ marginBottom: 16 }}>
          {activePlatforms.map((p) => (
            <button
              key={p}
              onClick={() =>
                setFilter('platforms', toggleMultiSelectValue(filters.platforms, p))
              }
              className="fp-badge fp-badge-purple flex items-center gap-1"
            >
              {p} <span style={{ opacity: 0.7 }}>×</span>
            </button>
          ))}
          {activeCategories.map((c) => (
            <button
              key={c}
              onClick={() =>
                setFilter('categories', toggleMultiSelectValue(filters.categories, c))
              }
              className="fp-badge fp-badge-purple flex items-center gap-1"
            >
              {c} <span style={{ opacity: 0.7 }}>×</span>
            </button>
          ))}
          {activeStatuses.map((s) => (
            <button
              key={s}
              onClick={() =>
                setFilter('statuses', toggleMultiSelectValue(filters.statuses, s))
              }
              className="fp-badge fp-badge-purple flex items-center gap-1"
            >
              {s} <span style={{ opacity: 0.7 }}>×</span>
            </button>
          ))}
          {(filters.minScore || filters.maxScore) && (
            <button
              onClick={() => setFilters({ minScore: '', maxScore: '' })}
              className="fp-badge fp-badge-purple flex items-center gap-1"
            >
              Score: {filters.minScore || '0'}–{filters.maxScore || '100'}{' '}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          {(filters.minProfit || filters.maxProfit) && (
            <button
              onClick={() => setFilters({ minProfit: '', maxProfit: '' })}
              className="fp-badge fp-badge-purple flex items-center gap-1"
            >
              Profit: ${filters.minProfit || '0'}–{filters.maxProfit ? `$${filters.maxProfit}` : '∞'}{' '}
              <span style={{ opacity: 0.7 }}>×</span>
            </button>
          )}
          <button
            onClick={clearFilters}
            className="px-2 py-1 rounded-full border border-white/20 text-xs transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Platform multi-select */}
        <div>
          <label
            className="block mb-2"
            style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}
          >
            Platform
          </label>
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
                      ? 'shadow-sm'
                      : 'hover:opacity-90'
                  }`}
                  style={
                    active
                      ? { background: 'rgba(124,58,237,0.4)', borderColor: 'rgba(167,139,250,0.6)', color: '#c4b5fd', boxShadow: '0 0 12px rgba(124,58,237,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }
                  }
                >
                  {platform.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Score range slider */}
        <div>
          <label
            className="block mb-2"
            style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}
          >
            Score: {filters.minScore || '0'} – {filters.maxScore || '100'}
          </label>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs w-6" style={{ color: '#64748b' }}>Min</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.minScore || '0'}
                onChange={(e) =>
                  setFilter('minScore', e.target.value === '0' ? '' : e.target.value)
                }
                aria-label="Minimum score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(filters.minScore || '0')}
                aria-valuetext={`Minimum score ${filters.minScore || '0'}`}
                className="flex-1"
                style={{ accentColor: '#7c3aed' }}
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs w-6" style={{ color: '#64748b' }}>Max</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.maxScore || '100'}
                onChange={(e) =>
                  setFilter('maxScore', e.target.value === '100' ? '' : e.target.value)
                }
                aria-label="Maximum score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(filters.maxScore || '100')}
                aria-valuetext={`Maximum score ${filters.maxScore || '100'}`}
                className="flex-1"
                style={{ accentColor: '#7c3aed' }}
              />
            </div>
          </div>
        </div>

        {/* Profit range */}
        <div>
          <label
            className="block mb-2"
            style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}
          >
            Profit Range ($)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min $"
              value={filters.minProfit}
              onChange={(e) => setFilter('minProfit', e.target.value)}
              className="fp-input w-full"
            />
            <span className="text-xs" style={{ color: '#475569' }}>–</span>
            <input
              type="number"
              placeholder="Max $"
              value={filters.maxProfit}
              onChange={(e) => setFilter('maxProfit', e.target.value)}
              className="fp-input w-full"
            />
          </div>
        </div>

        {/* Category multi-select */}
        <div>
          <label
            className="block mb-2"
            style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}
          >
            Category
          </label>
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
                      ? 'shadow-sm'
                      : 'hover:opacity-90'
                  }`}
                  style={
                    active
                      ? { background: 'rgba(124,58,237,0.4)', borderColor: 'rgba(167,139,250,0.6)', color: '#c4b5fd', boxShadow: '0 0 12px rgba(124,58,237,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }
                  }
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
            <label
              className="block mb-2"
              style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}
            >
              Status
            </label>
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
                        ? 'shadow-sm'
                        : 'hover:opacity-90'
                    }`}
                    style={
                      active
                        ? { background: 'rgba(124,58,237,0.4)', borderColor: 'rgba(167,139,250,0.6)', color: '#c4b5fd', boxShadow: '0 0 12px rgba(124,58,237,0.3)' }
                        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }
                    }
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
