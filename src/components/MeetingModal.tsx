/**
 * @file src/components/MeetingModal.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Meeting scheduling modal — datetime picker, location, type, and Google Calendar sync.
 *
 * @description
 * Modal for creating or updating a buy/sell meetup on an opportunity.
 * - datetime-local picker for meetingTime
 * - Free-text location input
 * - meetingType (buy / sell) auto-derived from opportunity status with user override
 * - Captures browser timezone via Intl.DateTimeFormat().resolvedOptions().timeZone
 * - Calls POST /api/opportunities/[id]/meeting
 * - On CALENDAR_AUTH_REQUIRED response: shows a reconnect toast
 */

'use client';

import { useState } from 'react';
import { useToast } from '@/components/ToastContainer';

export interface MeetingData {
  meetingTime: string | null;
  meetingLocation: string | null;
  meetingType: string | null;
  calendarEventId: string | null;
}

interface MeetingModalProps {
  opportunityId: string;
  opportunityStatus: string;
  initialMeeting: MeetingData | null;
  onClose: () => void;
  onSaved: (meeting: MeetingData) => void;
}

/** Derive default meetingType from opportunity status. */
function defaultMeetingType(status: string): 'buy' | 'sell' {
  return status === 'LISTED' ? 'sell' : 'buy';
}

/** Format a Date or ISO string to datetime-local input value (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(value: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MeetingModal({
  opportunityId,
  opportunityStatus,
  initialMeeting,
  onClose,
  onSaved,
}: MeetingModalProps) {
  const { showToast } = useToast();
  const [meetingTime, setMeetingTime] = useState(
    toDatetimeLocal(initialMeeting?.meetingTime ?? null)
  );
  const [meetingLocation, setMeetingLocation] = useState(initialMeeting?.meetingLocation ?? '');
  const [meetingType, setMeetingType] = useState<'buy' | 'sell'>(
    (initialMeeting?.meetingType as 'buy' | 'sell' | null) ?? defaultMeetingType(opportunityStatus)
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTime || !meetingLocation.trim()) return;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    setSaving(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingTime: new Date(meetingTime).toISOString(),
          meetingLocation: meetingLocation.trim(),
          meetingType,
          timezone,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: { meetingTime: string; meetingLocation: string; meetingType: string; calendarEventId: string | null };
        error?: { code?: string };
      };

      if (!res.ok || !json.success) {
        if (json.error?.code === 'CALENDAR_AUTH_REQUIRED') {
          showToast({ type: 'error', title: 'Calendar auth required', message: 'Reconnect Google Calendar in Settings.' });
          // Still close — meeting data was saved (storage is decoupled)
          onClose();
          return;
        }
        throw new Error('Failed to save meeting');
      }

      onSaved({
        meetingTime: json.data?.meetingTime ?? null,
        meetingLocation: json.data?.meetingLocation ?? null,
        meetingType: json.data?.meetingType ?? null,
        calendarEventId: json.data?.calendarEventId ?? null,
      });
      showToast({ type: 'success', title: 'Meeting scheduled', message: 'Your meeting has been saved.' });
      onClose();
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to save meeting. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const isAmbiguous = opportunityStatus === 'PURCHASED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initialMeeting?.meetingTime ? 'Update Meeting' : 'Schedule Meeting'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
              placeholder="e.g. 456 Oak Ave, Seattle, WA"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* meetingType — auto-derived, editable only when status is PURCHASED */}
          {isAmbiguous && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meeting Type
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as 'buy' | 'sell')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="buy">Buy (picking up item)</option>
                <option value="sell">Sell (delivering item)</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !meetingTime || !meetingLocation.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
