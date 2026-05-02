/**
 * @file src/components/MessagingSettings.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Messaging settings toggle for two-step send confirmation.
 *
 * @description
 * Client Component that displays and controls the messageApprovalRequired
 * user setting. When enabled, messages require an additional confirmation
 * step after approval before being sent. Shows a count of orphaned
 * PENDING_APPROVAL messages when disabling. Story 14.8 migrated the
 * surfaces to canonical glassmorphism — `.fp-glass-sm` wrapper, canonical
 * toggle (`#7c3aed` active, explicit transition), `.fp-alert-danger` /
 * `.fp-alert-success` banners. Save semantics, toggle role/aria, and
 * pending-count warning behavior are preserved verbatim.
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
      <div className="fp-glass-sm p-6">
        <h2 className="text-2xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Messaging</h2>
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="fp-glass-sm p-6">
      <h2 className="text-2xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Messaging</h2>

      {error && (
        <div className="fp-alert-danger mb-4 p-3" style={{ color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="fp-alert-success mb-4 p-3" style={{ color: '#6ee7b7' }}>
          {successMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <label
            htmlFor="message-approval-toggle"
            className="block text-sm font-medium"
            style={{ color: '#e2e8f0' }}
          >
            Two-step send confirmation
          </label>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            When enabled, messages require an additional confirmation step after approval before being sent.
          </p>
          {!approvalRequired && pendingCount > 0 && (
            <p className="text-xs mt-1" style={{ color: '#fcd34d' }}>
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
          className="relative inline-flex items-center min-h-[44px] min-w-[44px] w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: approvalRequired ? '#7c3aed' : 'rgba(255,255,255,0.06)',
            transition: 'background-color 150ms ease',
          }}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
              approvalRequired ? 'translate-x-5' : 'translate-x-0'
            }`}
            style={{ background: '#f1f5f9' }}
          />
        </button>
      </div>
    </div>
  );
}
