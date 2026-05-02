/**
 * @file src/components/LogisticsSettings.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-24
 * @version 1.1
 * @brief Logistics & pickup settings (home location, max pickup radius).
 *
 * @description
 * Lets the user configure their pickup origin and maximum drive radius
 * used to estimate distances and filter local-only listings. Migrated to
 * the canonical dark-glassmorphism design system in Story 14.8 — wraps
 * content in `.fp-glass-sm`, inputs in `.fp-input`, save button in
 * `.fp-btn-primary`. Save/load semantics against `/api/user/settings`
 * are preserved verbatim.
 */

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
    return (
      <div className="fp-glass-sm p-6 text-sm" style={{ color: '#94a3b8' }} data-testid="logistics-loading">
        Loading logistics settings…
      </div>
    );
  }

  return (
    <div className="fp-glass-sm p-6">
      <h2 className="text-xl font-semibold mb-1" style={{ color: '#e2e8f0' }}>Logistics & Pickup Settings</h2>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
        Used to estimate pickup distances and filter out-of-range local-only items.
      </p>

      <div className="space-y-5">
        <div>
          <label htmlFor="homeLocation" className="block text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>
            Home Location
          </label>
          <input
            id="homeLocation"
            type="text"
            value={homeLocation}
            onChange={(e) => setHomeLocation(e.target.value)}
            placeholder="e.g. Tampa, FL or 33601"
            className="fp-input w-full"
          />
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            City/state or ZIP code used as your pickup origin.
          </p>
        </div>

        <div>
          <label htmlFor="maxPickupRadiusMiles" className="block text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>
            Max Pickup Radius (miles)
          </label>
          <input
            id="maxPickupRadiusMiles"
            type="number"
            min={5}
            max={500}
            value={maxPickupRadiusMiles}
            onChange={(e) => setMaxPickupRadiusMiles(Number(e.target.value))}
            className="fp-input w-32"
          />
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            Local-only items beyond this radius are flagged as outside your pickup range.
          </p>
        </div>
      </div>

      {message && (
        <p
          className="mt-4 text-sm"
          style={{ color: message.type === 'success' ? '#34d399' : '#f87171' }}
          data-testid="logistics-save-message"
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="fp-btn-primary mt-5"
      >
        {saving ? 'Saving…' : 'Save Logistics Settings'}
      </button>
    </div>
  );
}
