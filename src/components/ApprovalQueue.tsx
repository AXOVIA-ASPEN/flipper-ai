/**
 * @file src/components/ApprovalQueue.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Approval queue panel for reviewing outbound messages before sending.
 *
 * @description
 * Fetches DRAFT and PENDING_APPROVAL outbound messages in a single API call,
 * renders MessageApprovalCard for each, and handles approve/confirm/edit/reject
 * actions with optimistic removal. Includes error handling for 409 (race
 * condition), 403 (tier gate), and 401 (auth). FREE tier users see an
 * UpgradePrompt banner. Pagination via "Load more" button.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import MessageApprovalCard from '@/components/MessageApprovalCard';

interface ApprovalMessage {
  id: string;
  status: string;
  subject: string | null;
  body: string;
  sellerName: string | null;
  platform: string | null;
  createdAt: string;
  sentAt: string | null;
  listing: {
    id: string;
    title: string;
    platform: string;
    askingPrice: number;
    updatedAt: string;
  } | null;
}

interface ApprovalQueueProps {
  subscriptionTier: string | null;
  messageApprovalRequired: boolean;
  onCountChange: (count: number) => void;
}

const PAGE_SIZE = 20;

export default function ApprovalQueue({
  subscriptionTier,
  messageApprovalRequired,
  onCountChange,
}: ApprovalQueueProps) {
  const [messages, setMessages] = useState<ApprovalMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<Record<string, 'approve' | 'confirm' | 'edit' | 'reject' | null>>({});
  const [toast, setToast] = useState<string | null>(null);

  const isFree = subscriptionTier === 'FREE' || !subscriptionTier;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchMessages = useCallback(async (offset = 0, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const params = new URLSearchParams({
        status: 'DRAFT,PENDING_APPROVAL',
        direction: 'OUTBOUND',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });

      const res = await fetch(`/api/messages?${params}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.detail || 'Failed to fetch messages');
      }

      if (append) {
        setMessages(prev => [...prev, ...json.data]);
      } else {
        setMessages(json.data);
      }
      setTotal(json.pagination?.total ?? 0);
      onCountChange(json.pagination?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval queue');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleAction = useCallback(async (
    id: string,
    action: 'approve' | 'confirm' | 'edit' | 'reject',
    payload?: { body?: string; subject?: string | null },
  ) => {
    setLoadingAction(prev => ({ ...prev, [id]: action }));
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      const json = await res.json();

      if (res.status === 409) {
        showToast('Message already updated. Refreshing...');
        await fetchMessages();
        return;
      }

      if (res.status === 403) {
        showToast('Plan does not include messaging. Upgrade.');
        return;
      }

      if (!res.ok || !json.success) {
        showToast(json.error?.detail || `Failed to ${action} message`);
        return;
      }

      // Handle nextAction for approve → PENDING_APPROVAL
      if (json.nextAction === 'confirm') {
        showToast('Message approved. Confirm to send.');
        // Update card status locally instead of removing
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, status: 'PENDING_APPROVAL' } : m
        ));
        return;
      }

      // Success: optimistically remove card
      if (action === 'edit') {
        // Edit keeps the message in the queue — update locally
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, body: payload?.body ?? m.body, subject: payload?.subject ?? m.subject } : m
        ));
        showToast('Message updated.');
      } else if (action === 'reject' && json.data?.status === 'DRAFT') {
        // Reject from PENDING_APPROVAL → back to DRAFT, keep in queue
        setMessages(prev => prev.map(m =>
          m.id === id ? { ...m, status: 'DRAFT' } : m
        ));
        showToast('Message returned to draft for editing.');
      } else {
        // Remove from queue (sent or terminal rejected)
        setMessages(prev => prev.filter(m => m.id !== id));
        setTotal(prev => {
          const newTotal = prev - 1;
          onCountChange(newTotal);
          return newTotal;
        });
        if (action === 'reject') {
          showToast('Message rejected.');
        } else {
          showToast('Message sent.');
        }
      }
    } catch {
      showToast(`Failed to ${action} message. Please try again.`);
    } finally {
      setLoadingAction(prev => ({ ...prev, [id]: null }));
    }
  }, [fetchMessages, onCountChange, showToast]);

  const handleApprove = useCallback((id: string) => handleAction(id, 'approve'), [handleAction]);
  const handleConfirm = useCallback((id: string) => handleAction(id, 'confirm'), [handleAction]);
  const handleEdit = useCallback((id: string, body: string, subject: string | null) =>
    handleAction(id, 'edit', { body, subject }), [handleAction]);
  const handleReject = useCallback((id: string) => handleAction(id, 'reject'), [handleAction]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
        {error}
        <button onClick={() => fetchMessages()} className="ml-2 underline hover:no-underline">Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
          {toast}
        </div>
      )}

      {/* FREE tier banner */}
      {isFree && messages.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Messaging requires a Flipper plan</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Upgrade your subscription to approve and send messages.</p>
          <a href="/settings" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">Upgrade plan &rarr;</a>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No messages pending approval
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mb-6 max-w-sm mx-auto">
            Find items to flip and generate messages to start communicating with sellers.
          </p>
          <a
            href="/opportunities"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Browse Opportunities
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(message => (
            <MessageApprovalCard
              key={message.id}
              message={message}
              onApprove={handleApprove}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
              onReject={handleReject}
              loadingAction={loadingAction[message.id] || null}
              messageApprovalRequired={messageApprovalRequired}
              disabled={isFree}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {messages.length < total && (
        <div className="mt-4 text-center">
          <button
            onClick={() => fetchMessages(messages.length, true)}
            disabled={loadingMore}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : `Load more (${messages.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
