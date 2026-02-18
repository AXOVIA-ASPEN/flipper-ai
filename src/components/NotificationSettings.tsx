'use client';

import { useState, useEffect } from 'react';

interface UserSettings {
  emailNotifications: boolean;
  notifyNewDeals: boolean;
  notifyPriceDrops: boolean;
  notifySoldItems: boolean;
  notifyExpiring: boolean;
  notifyWeeklyDigest: boolean;
  notifyFrequency: 'instant' | 'daily' | 'weekly';
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
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
        emailNotifications: result.data.emailNotifications,
        notifyNewDeals: result.data.notifyNewDeals,
        notifyPriceDrops: result.data.notifyPriceDrops,
        notifySoldItems: result.data.notifySoldItems,
        notifyExpiring: result.data.notifyExpiring,
        notifyWeeklyDigest: result.data.notifyWeeklyDigest,
        notifyFrequency: result.data.notifyFrequency,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(updates: Partial<UserSettings>) {
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
        emailNotifications: result.data.emailNotifications,
        notifyNewDeals: result.data.notifyNewDeals,
        notifyPriceDrops: result.data.notifyPriceDrops,
        notifySoldItems: result.data.notifySoldItems,
        notifyExpiring: result.data.notifyExpiring,
        notifyWeeklyDigest: result.data.notifyWeeklyDigest,
        notifyFrequency: result.data.notifyFrequency,
      });

      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(field: keyof UserSettings) {
    if (!settings) return;
    const newValue = !settings[field];
    saveSettings({ [field]: newValue });
  }

  function handleFrequencyChange(frequency: 'instant' | 'daily' | 'weekly') {
    saveSettings({ notifyFrequency: frequency });
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Notification Settings</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Notification Settings</h2>
        <p className="text-red-500">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">Notification Settings</h2>

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
        {/* Master toggle */}
        <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enable or disable all email notifications
            </p>
          </div>
          <button
            onClick={() => handleToggle('emailNotifications')}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Toggle email notifications"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Individual notification types */}
        <div className={`space-y-4 ${!settings.emailNotifications ? 'opacity-50' : ''}`}>
          <NotificationToggle
            label="New Deal Alerts"
            description="Get notified when high-score opportunities are found"
            checked={settings.notifyNewDeals}
            disabled={!settings.emailNotifications || saving}
            onChange={() => handleToggle('notifyNewDeals')}
          />

          <NotificationToggle
            label="Price Drop Alerts"
            description="Notify me when watched items drop in price"
            checked={settings.notifyPriceDrops}
            disabled={!settings.emailNotifications || saving}
            onChange={() => handleToggle('notifyPriceDrops')}
          />

          <NotificationToggle
            label="Item Sold Notifications"
            description="Alert when tracked listings are sold"
            checked={settings.notifySoldItems}
            disabled={!settings.emailNotifications || saving}
            onChange={() => handleToggle('notifySoldItems')}
          />

          <NotificationToggle
            label="Expiring Listings"
            description="Warn 24 hours before listings expire"
            checked={settings.notifyExpiring}
            disabled={!settings.emailNotifications || saving}
            onChange={() => handleToggle('notifyExpiring')}
          />

          <NotificationToggle
            label="Weekly Digest"
            description="Receive a weekly summary of your opportunities"
            checked={settings.notifyWeeklyDigest}
            disabled={!settings.emailNotifications || saving}
            onChange={() => handleToggle('notifyWeeklyDigest')}
          />
        </div>

        {/* Notification frequency */}
        <div className={`pt-4 border-t dark:border-gray-700 ${!settings.emailNotifications ? 'opacity-50' : ''}`}>
          <h3 className="font-medium mb-2">Notification Frequency</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            How often should we send you notifications?
          </p>
          <div className="space-y-2">
            <FrequencyOption
              label="Instant"
              description="Send notifications as events happen"
              value="instant"
              selected={settings.notifyFrequency === 'instant'}
              disabled={!settings.emailNotifications || saving}
              onChange={handleFrequencyChange}
            />
            <FrequencyOption
              label="Daily Digest"
              description="One email per day with all updates"
              value="daily"
              selected={settings.notifyFrequency === 'daily'}
              disabled={!settings.emailNotifications || saving}
              onChange={handleFrequencyChange}
            />
            <FrequencyOption
              label="Weekly Digest"
              description="One email per week with all updates"
              value="weekly"
              selected={settings.notifyFrequency === 'weekly'}
              disabled={!settings.emailNotifications || saving}
              onChange={handleFrequencyChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <h4 className="font-medium text-sm">{label}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function FrequencyOption({
  label,
  description,
  value,
  selected,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: 'instant' | 'daily' | 'weekly';
  selected: boolean;
  disabled: boolean;
  onChange: (value: 'instant' | 'daily' | 'weekly') => void;
}) {
  return (
    <label
      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        type="radio"
        name="notifyFrequency"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1"
      />
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </label>
  );
}
