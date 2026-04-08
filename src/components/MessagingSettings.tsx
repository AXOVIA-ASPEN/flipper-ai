/**
 * @file src/components/MessagingSettings.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Messaging settings toggle for two-step send confirmation.
 *
 * @description
 * Client Component that displays and controls the messageApprovalRequired
 * user setting. When enabled, messages require an additional confirmation
 * step after approval before being sent. Shows a count of orphaned
 * PENDING_APPROVAL messages when disabling.
 */

'use client';

import { useState, useEffect } from 'react';

export default function MessagingSettings() {
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
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

      setApprovalRequired(result.data.messageApprovalRequired ?? false);

      // Fetch pending approval count for info display
      const msgResponse = await fetch('/api/messages?status=PENDING_APPROVAL&direction=OUTBOUND&limit=0');
      const msgResult = await msgResponse.json();
      if (msgResponse.ok && msgResult.success) {
        setPendingCount(msgResult.pagination?.total ?? 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    const newValue = !approvalRequired;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageApprovalRequired: newValue }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save settings');
      }

      setApprovalRequired(result.data.messageApprovalRequired);
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
        <h2 className="text-2xl font-semibold mb-4">Messaging</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">Messaging</h2>

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

      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <label
            htmlFor="message-approval-toggle"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Two-step send confirmation
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            When enabled, messages require an additional confirmation step after approval before being sent.
          </p>
          {!approvalRequired && pendingCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount} message{pendingCount !== 1 ? 's' : ''} still pending confirmation.
            </p>
          )}
        </div>
        <button
          id="message-approval-toggle"
          role="switch"
          aria-checked={approvalRequired}
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            approvalRequired ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              approvalRequired ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
