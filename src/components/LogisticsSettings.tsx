'use client';

import { useState, useEffect } from 'react';

interface LogisticsSettingsData {
  homeLocation: string | null;
  maxPickupRadiusMiles: number;
}

export default function LogisticsSettings() {
  const [homeLocation, setHomeLocation] = useState('');
  const [maxPickupRadiusMiles, setMaxPickupRadiusMiles] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/user/settings');
        if (!res.ok) return;
        const data = await res.json();
        const s: LogisticsSettingsData = data.data;
        setHomeLocation(s.homeLocation ?? '');
        setMaxPickupRadiusMiles(s.maxPickupRadiusMiles ?? 50);
      } catch {
        // Network or parse error — fall through to defaults
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeLocation, maxPickupRadiusMiles }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.detail ?? 'Failed to save');
      }
      setMessage({ type: 'success', text: 'Logistics settings saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading logistics settings…</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-1">Logistics & Pickup Settings</h2>
      <p className="text-sm text-gray-500 mb-6">
        Used to estimate pickup distances and filter out-of-range local-only items.
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="homeLocation" className="block text-sm font-medium text-gray-700 mb-1">
            Home Location
          </label>
          <input
            id="homeLocation"
            type="text"
            value={homeLocation}
            onChange={(e) => setHomeLocation(e.target.value)}
            placeholder="e.g. Tampa, FL or 33601"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            City/state or ZIP code used as your pickup origin.
          </p>
        </div>

        <div>
          <label htmlFor="maxPickupRadiusMiles" className="block text-sm font-medium text-gray-700 mb-1">
            Max Pickup Radius (miles)
          </label>
          <input
            id="maxPickupRadiusMiles"
            type="number"
            min={5}
            max={500}
            value={maxPickupRadiusMiles}
            onChange={(e) => setMaxPickupRadiusMiles(Number(e.target.value))}
            className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Local-only items beyond this radius are flagged as outside your pickup range.
          </p>
        </div>
      </div>

      {message && (
        <p
          className={`mt-4 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
          data-testid="logistics-save-message"
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Logistics Settings'}
      </button>
    </div>
  );
}
