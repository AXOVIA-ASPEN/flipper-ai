/**
 * @file src/components/ApprovalQueue.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Approval queue panel for reviewing outbound messages before sending.
 *
 * @description
 * Fetches DRAFT and PENDING_APPROVAL outbound messages in a single API call,
 * renders MessageApprovalCard for each, and handles approve/confirm/edit/reject
 * actions with optimistic removal. Includes error handling for 409 (race
 * condition), 403 (tier gate), and 401 (auth). FREE tier users see an
 * upgrade banner. Pagination via "Load more" button.
 *
 * Story 14.8: migrated to canonical glass surfaces and the shared UI state
 * components — `<LoadingSkeleton variant="list" />` for loading,
 * `<ErrorBanner onRetry>` for fetch failures, `<EmptyState>` for the
 * "no pending approvals" case. Tier-gate banner uses `.fp-alert-warn`,
 * toast uses `.fp-alert-info`, Load more button uses `.fp-btn-ghost`.
 * Approval/edit/reject API flow and optimistic removal preserved verbatim.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import MessageApprovalCard from '@/components/MessageApprovalCard';
import { LoadingSkeleton, ErrorBanner, EmptyState } from '@/components/ui';

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
    return <LoadingSkeleton variant="list" rows={3} data-testid="approval-queue-loading" />;
  }

  if (error) {
    return (
      <ErrorBanner
        message={error}
        onRetry={() => fetchMessages()}
        data-testid="approval-queue-error"
      />
    );
  }

  return (
    <div className="fp-glass-sm p-4">
      {/* Toast */}
      {toast && (
        <div
          className="fp-alert-info mb-4 p-3 text-sm"
          style={{ color: '#93c5fd' }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* FREE tier banner */}
      {isFree && messages.length > 0 && (
        <div className="fp-alert-warn mb-4 p-4">
          <p className="text-sm font-medium" style={{ color: '#fcd34d' }}>Messaging requires a Flipper plan</p>
          <p className="text-xs mt-1" style={{ color: '#fde68a' }}>Upgrade your subscription to approve and send messages.</p>
          <a href="/settings" className="text-xs hover:underline mt-2 inline-block" style={{ color: '#c4b5fd' }}>Upgrade plan &rarr;</a>
        </div>
      )}

      {messages.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          message="AI-drafted messages will appear here for your review."
          action={{ label: 'Browse Opportunities', href: '/opportunities', variant: 'primary' }}
          data-testid="approval-queue-empty"
        />
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
            className="fp-btn-ghost"
          >
            {loadingMore ? 'Loading...' : `Load more (${messages.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
