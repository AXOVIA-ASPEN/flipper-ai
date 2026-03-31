'use client';

import { useState, useEffect } from 'react';

interface AISettings {
  llmModel: string;
  discountThreshold: number;
  autoAnalyze: boolean;
}

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

export default function AIPreferencesSettings() {
  const [settings, setSettings] = useState<AISettings | null>(null);
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
        llmModel: result.data.llmModel,
        discountThreshold: result.data.discountThreshold,
        autoAnalyze: result.data.autoAnalyze,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(updates: Partial<AISettings>) {
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
        llmModel: result.data.llmModel,
        discountThreshold: result.data.discountThreshold,
        autoAnalyze: result.data.autoAnalyze,
      });

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
        <h2 className="text-2xl font-semibold mb-4">AI Preferences</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">AI Preferences</h2>
        <p className="text-red-500">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">AI Preferences</h2>

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
        {/* LLM Model Selector */}
        <div>
          <label htmlFor="llm-model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AI Model
          </label>
          <select
            id="llm-model"
            value={settings.llmModel}
            onChange={(e) => saveSettings({ llmModel: e.target.value })}
            disabled={saving}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Discount Threshold Slider */}
        <div>
          <label htmlFor="discount-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Discount Threshold: {settings.discountThreshold}%
          </label>
          <input
            id="discount-threshold"
            type="range"
            min="0"
            max="100"
            value={settings.discountThreshold}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              setSettings({ ...settings, discountThreshold: value });
            }}
            onMouseUp={(e) => {
              const value = parseInt((e.target as HTMLInputElement).value, 10);
              saveSettings({ discountThreshold: value });
            }}
            onTouchEnd={(e) => {
              const value = parseInt((e.target as HTMLInputElement).value, 10);
              saveSettings({ discountThreshold: value });
            }}
            disabled={saving}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Auto-Analyze Toggle */}
        <div className="flex items-center justify-between py-3 border-t dark:border-gray-700">
          <div>
            <h3 className="font-medium">Auto-Analyze Listings</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically analyze new listings with AI
            </p>
          </div>
          <button
            onClick={() => saveSettings({ autoAnalyze: !settings.autoAnalyze })}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.autoAnalyze ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Toggle auto-analyze"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoAnalyze ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
