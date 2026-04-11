/**
 * @file src/components/NotificationSettings.tsx
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 3.0
 * @brief Comprehensive notification preferences panel — three independent channels per event type.
 *
 * @description
 * Client component rendering the full notification preferences UI in Settings.
 *
 * Story 11.3 (Phase 2 activation): replaces "Coming Soon" Push and SMS placeholders
 * with fully functional per-event toggle columns. Each notification event type now has
 * three independent toggles: Email | Push | SMS. The Push column is gated behind browser
 * Notification permission and the master pushNotifications toggle; the SMS column is gated
 * behind phoneVerified and the master smsNotifications toggle.
 *
 * Architecture decisions:
 * - NOTIFICATION_EVENT_TYPES config array drives table row rendering — avoids triplication
 * - handleToggle() accepts any keyof UserSettings for optimistic updates with rollback
 * - Push / SMS column disabled states are computed once and passed down to each row
 * - Mobile layout: three columns always visible (headers abbreviated to E / P / S)
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ToastContainer';

interface UserSettings {
  emailNotifications: boolean;
  // Flip Lifecycle
  notifyNewDeals: boolean;
  notifySoldItems: boolean;
  // Communication (Story 10.4)
  notifyMessageReceived: boolean;
  notifyDraftReady: boolean;
  notifyMessageSent: boolean;
  // Smart Alerts (Story 10.5)
  notifyReviewReceived: boolean;
  notifyFlipGoneCold: boolean;
  notifyFlipTurnedHot: boolean;
  notifyPriceDrops: boolean;
  flipGoneColdHours: number;
  flipTurnedHotCount: number;
  // Monitoring (Story 10.6)
  notifyListingUnavailable: boolean;
  notifyExpiring: boolean;
  // Digest
  notifyWeeklyDigest: boolean;
  notifyFrequency: 'instant' | 'daily' | 'weekly';
  // Push & SMS (Stories 11.1 / 11.2)
  pushNotifications: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  smsNotifications: boolean;
  // Story 11.3: Per-event push notification toggles
  pushNotifyNewDeals: boolean;
  pushNotifySoldItems: boolean;
  pushNotifyMessageReceived: boolean;
  pushNotifyDraftReady: boolean;
  pushNotifyMessageSent: boolean;
  pushNotifyReviewReceived: boolean;
  pushNotifyFlipGoneCold: boolean;
  pushNotifyFlipTurnedHot: boolean;
  pushNotifyPriceDrops: boolean;
  pushNotifyExpiring: boolean;
  pushNotifyListingUnavailable: boolean;
  pushNotifyWeeklyDigest: boolean;
  // Story 11.3: Per-event SMS notification toggles
  smsNotifyNewDeals: boolean;
  smsNotifySoldItems: boolean;
  smsNotifyMessageReceived: boolean;
  smsNotifyDraftReady: boolean;
  smsNotifyMessageSent: boolean;
  smsNotifyReviewReceived: boolean;
  smsNotifyFlipGoneCold: boolean;
  smsNotifyFlipTurnedHot: boolean;
  smsNotifyPriceDrops: boolean;
  smsNotifyExpiring: boolean;
  smsNotifyListingUnavailable: boolean;
  smsNotifyWeeklyDigest: boolean;
  // Story 12.2: Meeting departure reminder
  notifyMeetingReminder: boolean;
  meetingDepartureBufferMinutes: number;
}

type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

type PhoneUiState =
  | 'idle'
  | 'sending'
  | 'code-sent'
  | 'verifying'
  | 'verified'
  | 'error';

/** Format a stored E.164 phone number as a masked, readable US-style display. */
function maskPhoneNumber(e164: string): string {
  if (e164.startsWith('+1') && e164.length === 12) {
    const area = e164.slice(2, 5);
    const last4 = e164.slice(-4);
    return `+1 (${area}) xxx-${last4}`;
  }
  if (e164.length > 7) {
    return `${e164.slice(0, 4)}…${e164.slice(-4)}`;
  }
  return e164;
}

// ---------------------------------------------------------------------------
// Notification event type config — drives the per-event row rendering
// ---------------------------------------------------------------------------
type NotificationEventConfig = {
  displayName: string;
  category: 'flip-lifecycle' | 'communication' | 'smart-alerts' | 'monitoring' | 'digest';
  emailField: keyof UserSettings;
  pushField: keyof UserSettings;
  smsField: keyof UserSettings;
  tooltip?: string;
};

const NOTIFICATION_EVENT_TYPES: readonly NotificationEventConfig[] = [
  // Flip Lifecycle
  { displayName: 'New Opportunity Found', category: 'flip-lifecycle', emailField: 'notifyNewDeals', pushField: 'pushNotifyNewDeals', smsField: 'smsNotifyNewDeals' },
  { displayName: 'Flip Lifecycle Updates', category: 'flip-lifecycle', emailField: 'notifySoldItems', pushField: 'pushNotifySoldItems', smsField: 'smsNotifySoldItems', tooltip: 'Controls notifications for purchase, shipping, and sale events' },
  // Communication
  { displayName: 'Seller Reply Received', category: 'communication', emailField: 'notifyMessageReceived', pushField: 'pushNotifyMessageReceived', smsField: 'smsNotifyMessageReceived' },
  { displayName: 'AI Draft Ready', category: 'communication', emailField: 'notifyDraftReady', pushField: 'pushNotifyDraftReady', smsField: 'smsNotifyDraftReady' },
  { displayName: 'Message Sent', category: 'communication', emailField: 'notifyMessageSent', pushField: 'pushNotifyMessageSent', smsField: 'smsNotifyMessageSent' },
  // Smart Alerts
  { displayName: 'Review Received', category: 'smart-alerts', emailField: 'notifyReviewReceived', pushField: 'pushNotifyReviewReceived', smsField: 'smsNotifyReviewReceived' },
  { displayName: 'Flip Gone Cold', category: 'smart-alerts', emailField: 'notifyFlipGoneCold', pushField: 'pushNotifyFlipGoneCold', smsField: 'smsNotifyFlipGoneCold' },
  { displayName: 'Flip Turned Hot', category: 'smart-alerts', emailField: 'notifyFlipTurnedHot', pushField: 'pushNotifyFlipTurnedHot', smsField: 'smsNotifyFlipTurnedHot' },
  { displayName: 'Price Change Alert', category: 'smart-alerts', emailField: 'notifyPriceDrops', pushField: 'pushNotifyPriceDrops', smsField: 'smsNotifyPriceDrops' },
  // Monitoring
  { displayName: 'Listing Expiring', category: 'monitoring', emailField: 'notifyExpiring', pushField: 'pushNotifyExpiring', smsField: 'smsNotifyExpiring' },
  { displayName: 'Listing Unavailable', category: 'monitoring', emailField: 'notifyListingUnavailable', pushField: 'pushNotifyListingUnavailable', smsField: 'smsNotifyListingUnavailable' },
  // Digest
  { displayName: 'Weekly Digest', category: 'digest', emailField: 'notifyWeeklyDigest', pushField: 'pushNotifyWeeklyDigest', smsField: 'smsNotifyWeeklyDigest' },
];

// ---------------------------------------------------------------------------
// ToggleButton — a single channel toggle cell
// ---------------------------------------------------------------------------
function ToggleButton({
  label,
  channel,
  checked,
  disabled,
  disabledReason,
  onToggle,
}: {
  label: string;
  channel: 'email' | 'push' | 'SMS';
  checked: boolean;
  disabled: boolean;
  disabledReason?: string;
  onToggle: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={`Toggle ${label} ${channel} notification`}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onToggle}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        checked && !disabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked && !disabled ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// NotificationRow — a single row in the per-event-type table
// ---------------------------------------------------------------------------
function NotificationRow({
  config,
  settings,
  emailMasterOn,
  pushColumnDisabled,
  pushDisabledReason,
  smsColumnDisabled,
  smsDisabledReason,
  saving,
  onToggle,
}: {
  config: NotificationEventConfig;
  settings: UserSettings;
  emailMasterOn: boolean;
  pushColumnDisabled: boolean;
  pushDisabledReason: string;
  smsColumnDisabled: boolean;
  smsDisabledReason: string;
  saving: boolean;
  onToggle: (field: keyof UserSettings) => void;
}) {
  const { displayName, emailField, pushField, smsField, tooltip } = config;
  const emailDisabled = !emailMasterOn || saving;
  const pushDisabled = pushColumnDisabled || saving;
  const smsDisabled = smsColumnDisabled || saving;

  return (
    <tr className="border-b dark:border-gray-700 last:border-0">
      <td className="py-3 pr-2 text-sm font-medium text-gray-900 dark:text-gray-100 align-middle">
        {tooltip ? (
          <span title={tooltip} className="cursor-help underline decoration-dotted">
            {displayName}
          </span>
        ) : (
          displayName
        )}
      </td>
      {/* Email */}
      <td className="py-3 px-2 text-center align-middle">
        <ToggleButton
          label={displayName}
          channel="email"
          checked={settings[emailField] as boolean}
          disabled={emailDisabled}
          onToggle={() => onToggle(emailField)}
        />
      </td>
      {/* Push */}
      <td className="py-3 px-2 text-center align-middle">
        <ToggleButton
          label={displayName}
          channel="push"
          checked={settings[pushField] as boolean}
          disabled={pushDisabled}
          disabledReason={pushColumnDisabled ? pushDisabledReason : undefined}
          onToggle={() => onToggle(pushField)}
        />
      </td>
      {/* SMS */}
      <td className="py-3 px-2 text-center align-middle">
        <ToggleButton
          label={displayName}
          channel="SMS"
          checked={settings[smsField] as boolean}
          disabled={smsDisabled}
          disabledReason={smsColumnDisabled ? smsDisabledReason : undefined}
          onToggle={() => onToggle(smsField)}
        />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// CategoryHeader — coloured section separator inside the table
// ---------------------------------------------------------------------------
function CategoryHeader({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={4} className="pt-4 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// LoadingSkeleton
// ---------------------------------------------------------------------------
function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-48" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-40" />
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full h-6 w-11" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FrequencyOption — radio button for notification digest frequency
// ---------------------------------------------------------------------------
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
      className={[
        'flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function NotificationSettings() {
  const { showToast } = useToast();
  const sectionRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushPermissionState, setPushPermissionState] = useState<PushPermissionState>('default');
  const [pushLoading, setPushLoading] = useState(false);

  // Alert threshold local state (controlled by inputs, saved on blur)
  const [coldHoursInput, setColdHoursInput] = useState('');
  const [bufferInput, setBufferInput] = useState(''); // Story 12.2
  const [hotCountInput, setHotCountInput] = useState('');

  // Story 11.2: phone verification state
  const [phoneUiState, setPhoneUiState] = useState<PhoneUiState>('idle');
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Hash anchor scroll on mount (for email footer links)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#notifications') {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Detect push permission on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushPermissionState('unsupported');
      return;
    }
    const perm = Notification.permission as PushPermissionState;
    setPushPermissionState(
      perm === 'granted' || perm === 'denied' || perm === 'default' ? perm : 'default'
    );
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      const response = await fetch('/api/user/settings');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.detail || result.error || 'Failed to load settings');
      }
      const d = result.data;
      const next: UserSettings = {
        emailNotifications: d.emailNotifications,
        notifyNewDeals: d.notifyNewDeals,
        notifySoldItems: d.notifySoldItems,
        notifyMessageReceived: d.notifyMessageReceived ?? true,
        notifyDraftReady: d.notifyDraftReady ?? true,
        notifyMessageSent: d.notifyMessageSent ?? false,
        notifyReviewReceived: d.notifyReviewReceived ?? true,
        notifyFlipGoneCold: d.notifyFlipGoneCold ?? true,
        notifyFlipTurnedHot: d.notifyFlipTurnedHot ?? true,
        notifyPriceDrops: d.notifyPriceDrops ?? true,
        flipGoneColdHours: d.flipGoneColdHours ?? 24,
        flipTurnedHotCount: d.flipTurnedHotCount ?? 3,
        notifyListingUnavailable: d.notifyListingUnavailable ?? true,
        notifyExpiring: d.notifyExpiring ?? true,
        notifyWeeklyDigest: d.notifyWeeklyDigest ?? true,
        notifyFrequency: d.notifyFrequency ?? 'instant',
        pushNotifications: d.pushNotifications ?? true,
        phoneNumber: d.phoneNumber ?? null,
        phoneVerified: d.phoneVerified ?? false,
        smsNotifications: d.smsNotifications ?? false,
        // Story 11.3: Per-event push toggles
        pushNotifyNewDeals: d.pushNotifyNewDeals ?? true,
        pushNotifySoldItems: d.pushNotifySoldItems ?? true,
        pushNotifyMessageReceived: d.pushNotifyMessageReceived ?? true,
        pushNotifyDraftReady: d.pushNotifyDraftReady ?? true,
        pushNotifyMessageSent: d.pushNotifyMessageSent ?? false,
        pushNotifyReviewReceived: d.pushNotifyReviewReceived ?? true,
        pushNotifyFlipGoneCold: d.pushNotifyFlipGoneCold ?? true,
        pushNotifyFlipTurnedHot: d.pushNotifyFlipTurnedHot ?? true,
        pushNotifyPriceDrops: d.pushNotifyPriceDrops ?? true,
        pushNotifyExpiring: d.pushNotifyExpiring ?? true,
        pushNotifyListingUnavailable: d.pushNotifyListingUnavailable ?? true,
        pushNotifyWeeklyDigest: d.pushNotifyWeeklyDigest ?? false,
        // Story 11.3: Per-event SMS toggles
        smsNotifyNewDeals: d.smsNotifyNewDeals ?? true,
        smsNotifySoldItems: d.smsNotifySoldItems ?? true,
        smsNotifyMessageReceived: d.smsNotifyMessageReceived ?? true,
        smsNotifyDraftReady: d.smsNotifyDraftReady ?? false,
        smsNotifyMessageSent: d.smsNotifyMessageSent ?? false,
        smsNotifyReviewReceived: d.smsNotifyReviewReceived ?? true,
        smsNotifyFlipGoneCold: d.smsNotifyFlipGoneCold ?? true,
        smsNotifyFlipTurnedHot: d.smsNotifyFlipTurnedHot ?? true,
        smsNotifyPriceDrops: d.smsNotifyPriceDrops ?? false,
        smsNotifyExpiring: d.smsNotifyExpiring ?? false,
        smsNotifyListingUnavailable: d.smsNotifyListingUnavailable ?? false,
        smsNotifyWeeklyDigest: d.smsNotifyWeeklyDigest ?? false,
        // Story 12.2: Meeting departure reminder
        notifyMeetingReminder: d.notifyMeetingReminder ?? true,
        meetingDepartureBufferMinutes: d.meetingDepartureBufferMinutes ?? 10,
      };
      setSettings(next);
      setColdHoursInput(String(next.flipGoneColdHours));
      setHotCountInput(String(next.flipTurnedHotCount));
      setBufferInput(String(next.meetingDepartureBufferMinutes));
      setPhoneUiState(next.phoneVerified ? 'verified' : 'idle');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(updates: Partial<UserSettings>): Promise<boolean> {
    if (!settings) return false;
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.detail || result.error || 'Failed to save settings');
      }
      const d = result.data;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              ...updates,
              notifyFrequency: d.notifyFrequency ?? prev.notifyFrequency,
              flipGoneColdHours: d.flipGoneColdHours ?? prev.flipGoneColdHours,
              flipTurnedHotCount: d.flipTurnedHotCount ?? prev.flipTurnedHotCount,
            }
          : prev
      );
      return true;
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save. Please try again.',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Optimistic toggle with rollback
  async function handleToggle(field: keyof UserSettings) {
    if (!settings || saving) return;
    const previousSettings = { ...settings };
    const newValue = !settings[field];
    setSettings({ ...settings, [field]: newValue });
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.detail || result.error || 'Failed to save');
      }
      showToast({ type: 'success', title: 'Saved', message: 'Notification preferences updated.' });
    } catch (err) {
      setSettings(previousSettings);
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleFrequencyChange(frequency: 'instant' | 'daily' | 'weekly') {
    saveSettings({ notifyFrequency: frequency });
  }

  async function handleColdHoursBlur() {
    const hours = Math.round(Number(coldHoursInput));
    if (!isFinite(hours) || hours < 1 || hours > 168) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Must be between 1 and 168 hours' });
      setColdHoursInput(String(settings?.flipGoneColdHours ?? 24));
      return;
    }
    const saved = await saveSettings({ flipGoneColdHours: hours });
    if (saved) showToast({ type: 'success', title: 'Saved', message: 'Cold flip threshold updated.' });
  }

  async function handleHotCountBlur() {
    const count = Math.round(Number(hotCountInput));
    if (!isFinite(count) || count < 1 || count > 20) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Must be between 1 and 20' });
      setHotCountInput(String(settings?.flipTurnedHotCount ?? 3));
      return;
    }
    const saved = await saveSettings({ flipTurnedHotCount: count });
    if (saved) showToast({ type: 'success', title: 'Saved', message: 'Hot flip threshold updated.' });
  }

  // Story 12.2: Meeting departure buffer
  async function handleBufferBlur() {
    const buffer = Math.round(Number(bufferInput));
    if (!isFinite(buffer) || buffer < 0 || buffer > 60) {
      showToast({ type: 'error', title: 'Invalid value', message: 'Must be between 0 and 60 minutes' });
      setBufferInput(String(settings?.meetingDepartureBufferMinutes ?? 10));
      return;
    }
    const saved = await saveSettings({ meetingDepartureBufferMinutes: buffer });
    if (saved) showToast({ type: 'success', title: 'Saved', message: 'Departure buffer updated.' });
  }

  // ---------------------------------------------------------------------------
  // Push notification handlers (Story 11.1)
  // ---------------------------------------------------------------------------
  async function enablePush() {
    try {
      setPushLoading(true);
      const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw');
      const registration = await registerFCMServiceWorker();
      if (!registration) {
        showToast({ type: 'error', title: 'Error', message: 'Failed to register push service worker. Please try again.' });
        return;
      }
      const { requestNotificationPermission } = await import('@/lib/firebase/messaging');
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPushPermissionState('denied');
        showToast({ type: 'error', title: 'Permission Denied', message: 'Push permission denied. Reset in your browser settings and try again.' });
        return;
      }
      setPushPermissionState('granted');
      const { getFCMToken } = await import('@/lib/firebase/messaging');
      const token = await getFCMToken();
      if (!token) {
        showToast({ type: 'error', title: 'Error', message: 'Failed to get push notification token. Ensure VAPID key is configured.' });
        return;
      }
      const tokenRes = await fetch('/api/user/device-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userAgent: navigator.userAgent }),
      });
      if (!tokenRes.ok) {
        showToast({ type: 'error', title: 'Error', message: 'Failed to register push device. Please try again.' });
        return;
      }
      await saveSettings({ pushNotifications: true });
      showToast({ type: 'success', title: 'Push Enabled', message: 'Push notifications are now active.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'Failed to enable push notifications' });
    } finally {
      setPushLoading(false);
    }
  }

  async function disablePush() {
    try {
      setPushLoading(true);
      const { getFCMToken } = await import('@/lib/firebase/messaging');
      const token = await getFCMToken();
      if (token) {
        await fetch('/api/user/device-token', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      }
      await saveSettings({ pushNotifications: false });
      showToast({ type: 'success', title: 'Push Disabled', message: 'Push notifications have been turned off.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'Failed to disable push notifications' });
    } finally {
      setPushLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Phone verification handlers (Story 11.2)
  // ---------------------------------------------------------------------------
  async function handleSendCode() {
    setPhoneError(null);
    if (!/^\+[1-9]\d{1,14}$/.test(phoneInput)) {
      setPhoneError('Enter your number in E.164 format, e.g., +12025551234');
      return;
    }
    try {
      setPhoneUiState('sending');
      const res = await fetch('/api/user/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneInput }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setPhoneError(result?.error?.detail || 'Failed to send verification code');
        setPhoneUiState('error');
        return;
      }
      setPhoneUiState('code-sent');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to send verification code');
      setPhoneUiState('error');
    }
  }

  async function handleVerifyCode() {
    setPhoneError(null);
    if (!/^\d{6}$/.test(codeInput)) {
      setPhoneError('Enter the 6-digit code sent to your phone');
      return;
    }
    try {
      setPhoneUiState('verifying');
      const res = await fetch('/api/user/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setPhoneError(result?.error?.detail || 'Invalid or expired verification code');
        setPhoneUiState('code-sent');
        return;
      }
      setCodeInput('');
      setPhoneUiState('verified');
      showToast({ type: 'success', title: 'Verified', message: 'Phone number verified successfully.' });
      await fetchSettings();
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Verification failed');
      setPhoneUiState('code-sent');
    }
  }

  async function handleRemovePhone() {
    try {
      setSaving(true);
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removePhoneNumber: true }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result?.error?.detail || 'Failed to remove phone number');
      }
      setPhoneInput('');
      setCodeInput('');
      setPhoneUiState('idle');
      await fetchSettings();
      showToast({ type: 'success', title: 'Removed', message: 'Phone number removed.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err instanceof Error ? err.message : 'Failed to remove phone number' });
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!settings) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Notification Preferences</h2>
        <p className="text-red-500">Failed to load settings</p>
      </div>
    );
  }

  const pushIsEnabled = settings.pushNotifications && pushPermissionState === 'granted';
  const masterOn = settings.emailNotifications;

  // Story 11.3: Column-level disable states and tooltip reasons for push and SMS
  const pushPermissionGranted = pushPermissionState === 'granted';
  const pushColumnDisabled = !pushPermissionGranted || !settings.pushNotifications;
  const pushDisabledReason = !pushPermissionGranted
    ? 'Enable push notifications in your browser to use this channel'
    : 'Enable push notifications above to configure individual push preferences';
  const smsColumnDisabled = !settings.phoneVerified || !settings.smsNotifications;
  const smsDisabledReason = !settings.phoneVerified
    ? 'Verify your phone number in Settings to enable SMS alerts'
    : 'Enable SMS notifications above to configure individual SMS preferences';

  return (
    <div ref={sectionRef} id="notifications" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Notification Preferences</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Control which events notify you and how.
        </p>
      </div>

      {/* ── Push Notifications (Story 11.1) ──────────────────────────────── */}
      <div className="py-3 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Push Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Receive instant alerts in your browser</p>
          </div>
          <div className="flex items-center gap-2">
            {pushPermissionState === 'unsupported' || pushPermissionState === 'denied' ? null : pushIsEnabled ? (
              <>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Push Enabled ✓</span>
                <button
                  onClick={disablePush}
                  disabled={pushLoading || saving}
                  className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pushLoading ? 'Disabling…' : 'Disable'}
                </button>
              </>
            ) : (
              <button
                onClick={enablePush}
                disabled={pushLoading || saving}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pushLoading ? 'Enabling…' : 'Enable Push Notifications'}
              </button>
            )}
          </div>
        </div>
        {pushPermissionState === 'denied' && (
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            Push notifications are blocked by your browser. Reset in browser settings (Site Settings → Notifications).
          </p>
        )}
        {pushPermissionState === 'unsupported' && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Push notifications are not supported in this browser.
          </p>
        )}
      </div>

      {/* ── SMS Text Alerts (Story 11.2) ─────────────────────────────────── */}
      <div className="py-3 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">SMS Text Alerts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Get critical flip alerts via text message</p>
          </div>
          <button
            role="switch"
            aria-checked={settings.smsNotifications}
            aria-label="Toggle SMS notifications"
            onClick={() => {
              if (!settings.phoneVerified) return;
              handleToggle('smsNotifications');
            }}
            disabled={saving || !settings.phoneVerified}
            title={settings.phoneVerified ? 'Toggle SMS notifications' : 'Verify your phone number to enable SMS alerts'}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              settings.smsNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
              !settings.phoneVerified || saving ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                settings.smsNotifications ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>
        {!settings.phoneVerified && (
          <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
            Verify your phone number to enable SMS alerts
          </p>
        )}
        {/* Phone verification flow */}
        <div className="mt-3">
          {phoneUiState === 'verified' && settings.phoneNumber ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{maskPhoneNumber(settings.phoneNumber)}</span>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Verified ✓</span>
              </div>
              <button
                type="button"
                onClick={handleRemovePhone}
                disabled={saving}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>
          ) : phoneUiState === 'code-sent' || phoneUiState === 'verifying' ? (
            <div className="space-y-2">
              <label htmlFor="sms-code" className="block text-sm text-gray-700 dark:text-gray-300">
                Enter the 6-digit code we texted to {phoneInput}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sms-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  aria-label="6-digit verification code"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={phoneUiState === 'verifying'}
                  className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phoneUiState === 'verifying' ? 'Verifying…' : 'Verify'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setPhoneUiState('idle'); setCodeInput(''); setPhoneError(null); }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                Use a different number
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="sms-phone" id="sms-phone-hint" className="block text-sm text-gray-700 dark:text-gray-300">
                Phone number (include country code, e.g. +12025551234)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="sms-phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.trim())}
                  placeholder="+12025551234"
                  aria-label="Phone number for SMS notifications"
                  aria-describedby="sms-phone-hint"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={phoneUiState === 'sending'}
                  className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phoneUiState === 'sending' ? 'Sending…' : 'Send Code'}
                </button>
              </div>
            </div>
          )}
          {phoneError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {phoneError}
            </p>
          )}
        </div>
      </div>

      {/* ── Email Preferences ─────────────────────────────────────────────── */}
      <div>
        {/* Master email toggle */}
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enable or disable all email notifications</p>
          </div>
          <button
            role="switch"
            aria-checked={masterOn}
            aria-label="Toggle email notifications"
            onClick={() => handleToggle('emailNotifications')}
            disabled={saving}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              masterOn ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
              saving ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                masterOn ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Disabled banner */}
        {!masterOn && (
          <div
            aria-live="polite"
            className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300"
          >
            Email notifications are turned off. Enable the master toggle above to configure individual preferences.
          </div>
        )}

        {/* Per-event-type preference table */}
        <div className={!masterOn ? 'opacity-50 cursor-not-allowed' : ''}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="pb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Event</th>
                <th className="pb-2 px-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <span className="hidden sm:inline">Email</span>
                  <span className="sm:hidden">E</span>
                </th>
                <th className={[
                  'pb-2 px-2 text-center text-sm font-semibold',
                  pushColumnDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300',
                ].join(' ')}
                  title={pushColumnDisabled ? pushDisabledReason : undefined}
                >
                  <span className="hidden sm:inline">Push</span>
                  <span className="sm:hidden">P</span>
                </th>
                <th className={[
                  'pb-2 px-2 text-center text-sm font-semibold',
                  smsColumnDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300',
                ].join(' ')}
                  title={smsColumnDisabled ? smsDisabledReason : undefined}
                >
                  <span className="hidden sm:inline">SMS</span>
                  <span className="sm:hidden">S</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Config-driven rows — grouped by category with inline threshold inputs for cold/hot */}
              {(() => {
                const rows: React.ReactNode[] = [];
                let lastCategory: string | null = null;

                for (const config of NOTIFICATION_EVENT_TYPES) {
                  if (config.category !== lastCategory) {
                    const categoryLabels: Record<string, string> = {
                      'flip-lifecycle': 'Flip Lifecycle',
                      'communication': 'Communication',
                      'smart-alerts': 'Smart Alerts',
                      'monitoring': 'Monitoring',
                      'digest': 'Digest',
                    };
                    rows.push(<CategoryHeader key={`cat-${config.category}`} label={categoryLabels[config.category]} />);
                    lastCategory = config.category;
                  }

                  rows.push(
                    <NotificationRow
                      key={config.emailField as string}
                      config={config}
                      settings={settings}
                      emailMasterOn={masterOn}
                      pushColumnDisabled={pushColumnDisabled}
                      pushDisabledReason={pushDisabledReason}
                      smsColumnDisabled={smsColumnDisabled}
                      smsDisabledReason={smsDisabledReason}
                      saving={saving}
                      onToggle={handleToggle}
                    />
                  );

                  {/* Inline threshold inputs after Flip Gone Cold and Flip Turned Hot rows */}
                  if (config.emailField === 'notifyFlipGoneCold' && settings.notifyFlipGoneCold && masterOn) {
                    rows.push(
                      <tr key="cold-threshold">
                        <td colSpan={4} className="pb-3 pt-1 pl-2">
                          <div className="flex items-center gap-2">
                            <label htmlFor="cold-hours-input" className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              Flip Gone Cold Time
                            </label>
                            <input
                              id="cold-hours-input"
                              type="number"
                              min={1}
                              max={168}
                              value={coldHoursInput}
                              onChange={(e) => setColdHoursInput(e.target.value)}
                              onBlur={handleColdHoursBlur}
                              disabled={saving}
                              aria-label="Hours before cold flip alert"
                              className="w-20 text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">hours with no response</span>
                          </div>
                          {(Number(coldHoursInput) < 1 || Number(coldHoursInput) > 168) && coldHoursInput !== '' && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Must be between 1 and 168</p>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  if (config.emailField === 'notifyFlipTurnedHot' && settings.notifyFlipTurnedHot && masterOn) {
                    rows.push(
                      <tr key="hot-threshold">
                        <td colSpan={4} className="pb-3 pt-1 pl-2">
                          <div className="flex items-center gap-2">
                            <label htmlFor="hot-count-input" className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              Flip Turned Hot Threshold
                            </label>
                            <input
                              id="hot-count-input"
                              type="number"
                              min={1}
                              max={20}
                              value={hotCountInput}
                              onChange={(e) => setHotCountInput(e.target.value)}
                              onBlur={handleHotCountBlur}
                              disabled={saving}
                              aria-label="Consecutive inbound messages before hot flip alert"
                              className="w-16 text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">consecutive inbound messages</span>
                          </div>
                          {(Number(hotCountInput) < 1 || Number(hotCountInput) > 20) && hotCountInput !== '' && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Must be between 1 and 20</p>
                          )}
                        </td>
                      </tr>
                    );
                  }
                }

                return rows;
              })()}
            </tbody>
          </table>
        </div>

        {/* Notification frequency */}
        <div
          className={[
            'pt-4 border-t dark:border-gray-700 mt-4',
            !masterOn ? 'opacity-50' : '',
          ].join(' ')}
        >
          <h3 className="font-medium mb-2">Notification Frequency</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            How often should we send you email notifications?
          </p>
          <div className="space-y-2">
            <FrequencyOption
              label="Instant"
              description="Send notifications as events happen"
              value="instant"
              selected={settings.notifyFrequency === 'instant'}
              disabled={!masterOn || saving}
              onChange={handleFrequencyChange}
            />
            <FrequencyOption
              label="Daily Digest"
              description="One email per day with all updates"
              value="daily"
              selected={settings.notifyFrequency === 'daily'}
              disabled={!masterOn || saving}
              onChange={handleFrequencyChange}
            />
            <FrequencyOption
              label="Weekly Digest"
              description="One email per week with all updates"
              value="weekly"
              selected={settings.notifyFrequency === 'weekly'}
              disabled={!masterOn || saving}
              onChange={handleFrequencyChange}
            />
          </div>
        </div>
      </div>

      {/* ── Meeting Reminders (Story 12.2) ──────────────────────────────── */}
      <div className="pt-4 border-t dark:border-gray-700">
        <h3 className="font-medium mb-1">Meeting Reminders</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Get a departure alert when it&apos;s time to leave for a scheduled meetup.
        </p>

        {/* notifyMeetingReminder toggle */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Departure reminder</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Notify me when it&apos;s time to leave for a meetup
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.notifyMeetingReminder}
            aria-label="Toggle meeting departure reminder"
            onClick={() => handleToggle('notifyMeetingReminder')}
            disabled={saving}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              settings.notifyMeetingReminder ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
              saving ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                settings.notifyMeetingReminder ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>

        {/* meetingDepartureBufferMinutes input — only visible when reminder is on */}
        {settings.notifyMeetingReminder && (
          <div className="flex items-center gap-3">
            <label htmlFor="departure-buffer-input" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Extra buffer time
            </label>
            <input
              id="departure-buffer-input"
              type="number"
              min={0}
              max={60}
              value={bufferInput}
              onChange={(e) => setBufferInput(e.target.value)}
              onBlur={handleBufferBlur}
              disabled={saving}
              aria-label="Minutes of extra buffer before departure"
              className="w-20 text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">minutes before departure</span>
            {(Number(bufferInput) < 0 || Number(bufferInput) > 60) && bufferInput !== '' && (
              <p className="text-xs text-red-600 dark:text-red-400">Must be between 0 and 60</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
