'use client';

import { useState, useEffect } from 'react';
import { Settings, DollarSign, Target } from 'lucide-react';

interface PlatformFeeSettings {
  ebayFeeRate: number;
  mercariFeeRate: number;
  facebookFeeRate: number;
  offerupFeeRate: number;
  craigslistFeeRate: number;
  opportunityThreshold: number;
  discountThreshold: number;
}

export default function PlatformFeeSettings() {
  const [settings, setSettings] = useState<PlatformFeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch settings on mount
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
        ebayFeeRate: result.data.ebayFeeRate,
        mercariFeeRate: result.data.mercariFeeRate,
        facebookFeeRate: result.data.facebookFeeRate,
        offerupFeeRate: result.data.offerupFeeRate,
        craigslistFeeRate: result.data.craigslistFeeRate,
        opportunityThreshold: result.data.opportunityThreshold,
        discountThreshold: result.data.discountThreshold,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(updates: Partial<PlatformFeeSettings>) {
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

      // Update local state
      setSettings({
        ebayFeeRate: result.data.ebayFeeRate,
        mercariFeeRate: result.data.mercariFeeRate,
        facebookFeeRate: result.data.facebookFeeRate,
        offerupFeeRate: result.data.offerupFeeRate,
        craigslistFeeRate: result.data.craigslistFeeRate,
        opportunityThreshold: result.data.opportunityThreshold,
        discountThreshold: result.data.discountThreshold,
      });

      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function handleFeeRateChange(platform: keyof PlatformFeeSettings, value: number) {
    if (!settings) return;
    // Convert percentage input to decimal (13% => 0.13)
    const decimalValue = value / 100;
    saveSettings({ [platform]: decimalValue });
  }

  function handleThresholdChange(value: number) {
    if (!settings) return;
    saveSettings({ opportunityThreshold: value });
  }

  function handleDiscountThresholdChange(value: number) {
    if (!settings) return;
    saveSettings({ discountThreshold: value });
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Platform Fees & Opportunity Threshold</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
      </div>
    );
  }

  if (!settings) return null;

  const platforms = [
    { key: 'ebayFeeRate' as const, label: 'eBay', defaultPercent: 13 },
    { key: 'mercariFeeRate' as const, label: 'Mercari', defaultPercent: 10 },
    { key: 'facebookFeeRate' as const, label: 'Facebook Marketplace', defaultPercent: 5 },
    { key: 'offerupFeeRate' as const, label: 'OfferUp', defaultPercent: 12.9 },
    { key: 'craigslistFeeRate' as const, label: 'Craigslist', defaultPercent: 0 },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Platform Fees & Opportunity Threshold
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-300 text-sm">
          {successMessage}
        </div>
      )}

      {/* Platform Fee Rates */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Platform Fee Rates</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Set the fee percentage for each platform. These fees are used when calculating profit potential.
        </p>

        <div className="space-y-4">
          {platforms.map(({ key, label, defaultPercent }) => (
            <div key={key} className="flex items-center justify-between">
              <label htmlFor={key} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id={key}
                  min="0"
                  max="100"
                  step="0.1"
                  value={(settings[key] * 100).toFixed(1)}
                  onChange={(e) => handleFeeRateChange(key, parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  disabled={saving}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity Threshold */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Opportunity Threshold</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Minimum value score (0-100) for a listing to be marked as an OPPORTUNITY.
          Listings below this threshold will remain as NEW.
        </p>

        <div className="flex items-center gap-4">
          <input
            type="range"
            id="opportunityThreshold"
            min="0"
            max="100"
            step="5"
            value={settings.opportunityThreshold}
            onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={saving}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={settings.opportunityThreshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 0)}
              className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm text-center"
              disabled={saving}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              / 100
            </span>
          </div>
        </div>
      </div>

      {/* Discount Threshold */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Undervalue Discount Threshold</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Minimum discount percentage (0-100%) for LLM to consider a listing worth saving.
          Items with discount below this threshold will be filtered out before analysis. Default: 50%
        </p>

        <div className="flex items-center gap-4">
          <input
            type="range"
            id="discountThreshold"
            min="0"
            max="100"
            step="5"
            value={settings.discountThreshold}
            onChange={(e) => handleDiscountThresholdChange(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={saving}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={settings.discountThreshold}
              onChange={(e) => handleDiscountThresholdChange(parseInt(e.target.value) || 0)}
              className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm text-center"
              disabled={saving}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              %
            </span>
          </div>
        </div>
      </div>

      {saving && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Saving...
        </div>
      )}
    </div>
  );
}
