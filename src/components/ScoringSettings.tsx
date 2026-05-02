/**
 * @file src/components/ScoringSettings.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.1
 * @brief Opportunity scoring threshold and platform fee-rate configuration.
 *
 * @description
 * Lets the user adjust the opportunity-flag threshold (range slider) and
 * per-platform selling fee rates (numeric inputs). Saves are debounced via
 * onMouseUp/onBlur. Story 14.8 migrated to canonical glass surfaces, .fp-input
 * fields, and .fp-btn-primary / .fp-btn-ghost buttons. The slider thumb
 * styling is owned by Story 14.1's globals.css range-thumb pseudo-element
 * rules — no inline thumb override is present in this file. Save semantics
 * and value validation are preserved verbatim.
 */

'use client';

import { useState, useEffect } from 'react';

interface ScoringSettingsData {
  opportunityThreshold: number;
  feeRateEbay: number;
  feeRateMercari: number;
  feeRateFacebook: number;
  feeRateOfferup: number;
  feeRateCraigslist: number;
  holdingCostDailyRate: number;
}

const DEFAULT_SETTINGS: ScoringSettingsData = {
  opportunityThreshold: 70,
  feeRateEbay: 13.0,
  feeRateMercari: 10.0,
  feeRateFacebook: 5.0,
  feeRateOfferup: 12.9,
  feeRateCraigslist: 0.0,
  holdingCostDailyRate: 2.0,
};

const PLATFORM_FEE_LABELS: Array<{ key: keyof ScoringSettingsData; label: string }> = [
  { key: 'feeRateEbay', label: 'eBay' },
  { key: 'feeRateMercari', label: 'Mercari' },
  { key: 'feeRateFacebook', label: 'Facebook Marketplace' },
  { key: 'feeRateOfferup', label: 'OfferUp' },
  { key: 'feeRateCraigslist', label: 'Craigslist' },
];

export default function ScoringSettings() {
  const [settings, setSettings] = useState<ScoringSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/user/settings');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch settings');
      }

      setSettings({
        opportunityThreshold: result.data.opportunityThreshold,
        feeRateEbay: result.data.feeRateEbay,
        feeRateMercari: result.data.feeRateMercari,
        feeRateFacebook: result.data.feeRateFacebook,
        feeRateOfferup: result.data.feeRateOfferup,
        feeRateCraigslist: result.data.feeRateCraigslist,
        holdingCostDailyRate: result.data.holdingCostDailyRate ?? 2.0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(updates: Partial<ScoringSettingsData>) {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save settings');
      }

      setSettings({
        opportunityThreshold: result.data.opportunityThreshold,
        feeRateEbay: result.data.feeRateEbay,
        feeRateMercari: result.data.feeRateMercari,
        feeRateFacebook: result.data.feeRateFacebook,
        feeRateOfferup: result.data.feeRateOfferup,
        feeRateCraigslist: result.data.feeRateCraigslist,
        holdingCostDailyRate: result.data.holdingCostDailyRate ?? 2.0,
      });

      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefaults() {
    await saveSettings(DEFAULT_SETTINGS);
  }

  if (loading) {
    return (
      <div className="fp-glass-sm p-6">
        <h2 className="text-2xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Scoring &amp; Fees</h2>
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="fp-glass-sm p-6">
        <h2 className="text-2xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Scoring &amp; Fees</h2>
        <p style={{ color: '#fca5a5' }}>{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="fp-glass-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold" style={{ color: '#e2e8f0' }}>Scoring &amp; Fees</h2>
        <button
          onClick={handleResetToDefaults}
          disabled={saving}
          className="fp-btn-ghost"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="fp-alert-warn mb-4 p-3 text-xs" style={{ color: '#fcd34d' }}>
        Changing weights or fees will recompute opportunity scores on your next scan.
      </div>

      {error && (
        <div className="fp-alert-danger mb-4 p-3" style={{ color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="fp-alert-success mb-4 p-3" style={{ color: '#6ee7b7' }}>
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Opportunity Threshold Slider */}
        <div>
          <label
            htmlFor="opportunity-threshold"
            className="block text-sm font-medium mb-1"
            style={{ color: '#e2e8f0' }}
          >
            Opportunity Threshold:{' '}
            <span className="fp-metric-num text-sm" style={{ color: '#c4b5fd' }}>
              {settings.opportunityThreshold}
            </span>
          </label>
          <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>
            Minimum value score (0–100) for a listing to be flagged as an opportunity. Default: 70.
          </p>
          <input
            id="opportunity-threshold"
            type="range"
            min="10"
            max="100"
            value={settings.opportunityThreshold}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              setSettings({ ...settings, opportunityThreshold: value });
            }}
            onMouseUp={(e) => {
              const value = parseInt((e.target as HTMLInputElement).value, 10);
              saveSettings({ opportunityThreshold: value });
            }}
            onTouchEnd={(e) => {
              const value = parseInt((e.target as HTMLInputElement).value, 10);
              saveSettings({ opportunityThreshold: value });
            }}
            disabled={saving}
            className="w-full"
            aria-label="Opportunity threshold"
            aria-valuemin={10}
            aria-valuemax={100}
            aria-valuenow={settings.opportunityThreshold}
            aria-valuetext={`Opportunity threshold ${settings.opportunityThreshold}`}
          />
          <div className="flex justify-between text-xs" style={{ color: '#94a3b8' }}>
            <span>10</span>
            <span>55</span>
            <span>100</span>
          </div>
        </div>

        {/* Platform Fee Rates */}
        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-medium mb-1" style={{ color: '#e2e8f0' }}>Platform Selling Fee Rates (%)</h3>
          <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>
            Enter the selling fee percentage for each platform (0–50). These are used to calculate profit estimates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORM_FEE_LABELS.map(({ key, label }) => (
              <div key={key}>
                <label
                  htmlFor={`fee-${key}`}
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#e2e8f0' }}
                >
                  {label}
                </label>
                <div className="relative">
                  <input
                    id={`fee-${key}`}
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={settings[key] as number}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setSettings({ ...settings, [key]: value });
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 50) {
                        saveSettings({ [key]: value });
                      }
                    }}
                    disabled={saving}
                    className="fp-input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Holding Cost Rate */}
        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-medium mb-1" style={{ color: '#e2e8f0' }}>Holding Cost Rate ($/day)</h3>
          <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>
            Daily cost to hold purchased inventory (storage, opportunity cost). Used in the Inventory view.
          </p>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}>$</span>
            <input
              id="holding-cost-daily-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={settings.holdingCostDailyRate}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  setSettings({ ...settings, holdingCostDailyRate: value });
                }
              }}
              onBlur={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  saveSettings({ holdingCostDailyRate: value });
                }
              }}
              disabled={saving}
              className="fp-input w-full pl-7"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
