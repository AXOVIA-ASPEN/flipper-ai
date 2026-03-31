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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Scoring &amp; Fees</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Scoring &amp; Fees</h2>
        <p className="text-red-500">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Scoring &amp; Fees</h2>
        <button
          onClick={handleResetToDefaults}
          disabled={saving}
          className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset to Defaults
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-600 dark:text-green-400">
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Opportunity Threshold Slider */}
        <div>
          <label
            htmlFor="opportunity-threshold"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Opportunity Threshold: {settings.opportunityThreshold}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
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
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>10</span>
            <span>55</span>
            <span>100</span>
          </div>
        </div>

        {/* Platform Fee Rates */}
        <div className="border-t dark:border-gray-700 pt-4">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Platform Selling Fee Rates (%)</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Enter the selling fee percentage for each platform (0–50). These are used to calculate profit estimates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORM_FEE_LABELS.map(({ key, label }) => (
              <div key={key}>
                <label
                  htmlFor={`fee-${key}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                    className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Holding Cost Rate */}
        <div className="border-t dark:border-gray-700 pt-4">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Holding Cost Rate ($/day)</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Daily cost to hold purchased inventory (storage, opportunity cost). Used in the Inventory view.
          </p>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
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
              className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
