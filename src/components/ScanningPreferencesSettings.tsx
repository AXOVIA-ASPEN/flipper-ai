'use client';

import { useState, useEffect } from 'react';

type FreeItemHandling = 'include_review' | 'auto_analyze' | 'skip';

interface ScanningSettings {
  freeItemHandling: FreeItemHandling;
}

const FREE_ITEM_OPTIONS: { value: FreeItemHandling; label: string; description: string }[] = [
  {
    value: 'include_review',
    label: 'Include and flag for review',
    description: 'Store free items and mark them for manual review',
  },
  {
    value: 'auto_analyze',
    label: 'Auto-analyze',
    description: 'Run scoring and include only if flippability score ≥ 70',
  },
  {
    value: 'skip',
    label: 'Skip entirely',
    description: 'Discard all free ($0) listings',
  },
];

export default function ScanningPreferencesSettings() {
  const [settings, setSettings] = useState<ScanningSettings | null>(null);
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
        freeItemHandling: (result.data.freeItemHandling as FreeItemHandling) || 'include_review',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(value: FreeItemHandling) {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeItemHandling: value }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save settings');
      }

      setSettings({ freeItemHandling: result.data.freeItemHandling as FreeItemHandling });
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Scanning Preferences</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Scanning Preferences</h2>
        <p className="text-red-500">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">Scanning Preferences</h2>

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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Free Item Handling
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            How to handle items listed for free ($0)
          </p>
          <div className="space-y-2">
            {FREE_ITEM_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  settings.freeItemHandling === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="freeItemHandling"
                  value={option.value}
                  checked={settings.freeItemHandling === option.value}
                  onChange={() => {
                    setSettings({ freeItemHandling: option.value });
                    saveSetting(option.value);
                  }}
                  disabled={saving}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
