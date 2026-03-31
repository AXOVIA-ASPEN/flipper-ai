'use client';

import { useState, useEffect } from 'react';

interface APIKeyData {
  openaiApiKey: string | null;
  hasOpenaiApiKey: boolean;
}

export default function APIKeySettings() {
  const [keyData, setKeyData] = useState<APIKeyData | null>(null);
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);
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

      setKeyData({
        openaiApiKey: result.data.openaiApiKey,
        hasOpenaiApiKey: result.data.hasOpenaiApiKey,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveKey() {
    if (!newKey.trim()) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: newKey }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save API key');
      }

      setKeyData({
        openaiApiKey: result.data.openaiApiKey,
        hasOpenaiApiKey: result.data.hasOpenaiApiKey,
      });
      setNewKey('');

      setSuccessMessage('API key saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  }

  async function clearKey() {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: null }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to clear API key');
      }

      setKeyData({
        openaiApiKey: result.data.openaiApiKey,
        hasOpenaiApiKey: result.data.hasOpenaiApiKey,
      });

      setSuccessMessage('API key cleared');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear API key');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">API Keys</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!keyData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">API Keys</h2>
        <p className="text-red-500">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">API Keys</h2>

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
        {/* Current Key Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            OpenAI API Key
          </label>
          {keyData.hasOpenaiApiKey ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 font-mono text-sm">
                {keyData.openaiApiKey}
              </span>
              <button
                onClick={clearKey}
                disabled={saving}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                aria-label="Clear key"
              >
                Clear Key
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No key set</p>
          )}
        </div>

        {/* New Key Input */}
        <div>
          <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {keyData.hasOpenaiApiKey ? 'Replace Key' : 'Enter Key'}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="sk-..."
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Toggle key visibility"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <button
              onClick={saveKey}
              disabled={saving || !newKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              aria-label="Save Key"
            >
              {saving ? 'Saving...' : 'Save Key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
