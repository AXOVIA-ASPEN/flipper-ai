/**
 * @file src/components/IntegrationsSettings.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Integrations settings section — Google Calendar OAuth connect/disconnect.
 *
 * @description
 * Client Component that self-fetches integration status from
 * GET /api/integrations/google-calendar and renders the connect/disconnect UI.
 * Also reads the ?tab=integrations&connected=true query param to show a success
 * toast after the OAuth redirect completes.
 * If GOOGLE_CALENDAR_CLIENT_ID is absent from env the connect button is
 * disabled with a tooltip.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastContainer';

interface CalendarStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

export default function IntegrationsSettings() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch('/api/integrations/google-calendar')
      .then((r) => r.json())
      .then((json: { success: boolean; data?: CalendarStatus }) => {
        if (json.success && json.data) setStatus(json.data);
      })
      .catch(() => {});
  }, []);

  // Show success toast if redirected back from Google OAuth
  useEffect(() => {
    if (searchParams.get('connected') === 'true' && searchParams.get('tab') === 'integrations') {
      showToast({ type: 'success', title: 'Connected', message: 'Google Calendar connected.' });
    }
  }, [searchParams, showToast]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/google-calendar', { method: 'DELETE' });
      if (res.ok) {
        setStatus((prev) => ({ configured: prev?.configured ?? false, connected: false, email: null }));
        showToast({ type: 'info', title: 'Disconnected', message: 'Google Calendar disconnected.' });
      } else {
        showToast({ type: 'error', title: 'Error', message: 'Failed to disconnect Google Calendar. Please try again.' });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to disconnect Google Calendar. Please try again.' });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Integrations</h2>

      <div className="flex items-center justify-between py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">Google Calendar</span>
            {status?.connected && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Connected
              </span>
            )}
          </div>
          {status?.connected && status.email && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{status.email}</p>
          )}
          {!status?.connected && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This allows Flipper AI to create, update, and delete events on your Google Calendar.
            </p>
          )}
        </div>

        <div>
          {status?.connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : status?.configured === false ? (
            <span
              title="Google Calendar is not configured in this environment"
              className="px-4 py-2 text-sm font-medium text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg cursor-not-allowed"
            >
              Not configured
            </span>
          ) : (
            <a
              href="/api/integrations/google-calendar/connect"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
