/**
 * @file src/components/MessageApprovalCard.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Card for reviewing and acting on messages in the approval queue.
 *
 * @description
 * Renders a message card with status-dependent action buttons (approve,
 * confirm, edit, reject), inline editing with character limits, reject
 * confirmation with auto-revert, copy-to-clipboard, stale listing
 * detection, and responsive mobile layout. All body/subject content
 * is rendered as plain text only.
 *
 * Story 14.8: migrated all surfaces to canonical glassmorphism — `.fp-glass`
 * card wrapper, `.fp-input` inline editor fields, `.fp-btn-primary` /
 * `.fp-btn-ghost` / `.fp-btn-danger` actions, `.fp-alert-warn` stale-listing
 * banner, AI-confidence readout in `#c4b5fd`. Per ADR-14.8-D, the line-202
 * STATUS_COLORS pattern (preserved from Story 14.7) is NOT wrapped in any
 * external padding/font utilities — STATUS_COLORS already carries the
 * canonical `fp-badge fp-badge-*` classes. Approval-flow callbacks, edit
 * state, reject confirmation, and clipboard copy are preserved verbatim.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { STATUS_COLORS } from '@/lib/message-constants';

interface MessageListing {
  id: string;
  title: string;
  platform: string;
  askingPrice: number;
  updatedAt: string;
}

interface Message {
  id: string;
  status: string;
  subject: string | null;
  body: string;
  sellerName: string | null;
  platform: string | null;
  createdAt: string;
  sentAt: string | null;
  listing: MessageListing | null;
}

interface MessageApprovalCardProps {
  message: Message;
  onApprove: (id: string) => void;
  onConfirm: (id: string) => void;
  onEdit: (id: string, body: string, subject: string | null) => void;
  onReject: (id: string) => void;
  loadingAction: 'approve' | 'confirm' | 'edit' | 'reject' | null;
  messageApprovalRequired: boolean;
  disabled?: boolean;
}

const BODY_MAX = 2000;
const SUBJECT_MAX = 200;

const PLATFORM_ICONS: Record<string, string> = {
  craigslist: '🏷️',
  ebay: '🛒',
  facebook: '📘',
  mercari: '🔴',
  offerup: '🟢',
};

export default function MessageApprovalCard({
  message,
  onApprove,
  onConfirm,
  onEdit,
  onReject,
  loadingAction,
  messageApprovalRequired,
  disabled = false,
}: MessageApprovalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [editSubject, setEditSubject] = useState(message.subject || '');
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const actionGuard = useRef(false);
  const rejectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingEditAfterReject, setPendingEditAfterReject] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 100), 300)}px`;
    }
  }, [isEditing, editBody]);

  // Cleanup reject timer
  useEffect(() => {
    return () => {
      if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
    };
  }, []);

  // Auto-enter edit mode after reject-from-PENDING_APPROVAL returns to DRAFT
  useEffect(() => {
    if (pendingEditAfterReject && message.status === 'DRAFT') {
      setPendingEditAfterReject(false);
      setEditBody(message.body);
      setEditSubject(message.subject || '');
      setIsEditing(true);
    }
  }, [pendingEditAfterReject, message.status, message.body, message.subject]);

  const guardAction = useCallback((fn: () => void) => {
    if (actionGuard.current || loadingAction) return;
    actionGuard.current = true;
    fn();
    setTimeout(() => { actionGuard.current = false; }, 300);
  }, [loadingAction]);

  const handleApprove = () => guardAction(() => onApprove(message.id));
  const handleConfirm = () => guardAction(() => onConfirm(message.id));

  const handleEdit = () => {
    if (isEditing) {
      if (editBody.trim() === '') return;
      guardAction(() => {
        onEdit(message.id, editBody, editSubject || null);
        setIsEditing(false);
      });
    } else {
      setEditBody(message.body);
      setEditSubject(message.subject || '');
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBody(message.body);
    setEditSubject(message.subject || '');
  };

  const handleReject = () => {
    if (!rejectConfirm) {
      setRejectConfirm(true);
      rejectTimerRef.current = setTimeout(() => setRejectConfirm(false), 5000);
      return;
    }
    if (rejectTimerRef.current) clearTimeout(rejectTimerRef.current);
    setRejectConfirm(false);
    guardAction(() => onReject(message.id));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Clipboard API may fail in insecure context
    }
  };

  const isStale = message.listing &&
    new Date(message.listing.updatedAt) > new Date(message.createdAt);

  const platformIcon = message.platform
    ? PLATFORM_ICONS[message.platform.toLowerCase()] || '📦'
    : '📦';

  const isActionDisabled = !!loadingAction || disabled;

  const handleEditFromPending = () => {
    setPendingEditAfterReject(true);
    guardAction(() => onReject(message.id));
  };

  return (
    <div className="fp-glass p-4">
      {/* Header: listing info + status badge */}
      <div className="flex items-start gap-3 mb-3">
        {/* Listing thumbnail / platform icon */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {platformIcon}
        </div>

        <div className="flex-1 min-w-0">
          {message.listing ? (
            <>
              <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
                {message.listing.title}
              </p>
              <p className="text-xs flex items-center gap-2 flex-wrap" style={{ color: '#94a3b8' }}>
                <span className="fp-badge fp-badge-blue" data-testid="source-platform-pill">
                  {message.listing.platform}
                </span>
                <span>${message.listing.askingPrice.toFixed(2)}</span>
                {message.sellerName && <span>· {message.sellerName}</span>}
              </p>
            </>
          ) : (
            <p className="text-sm italic" style={{ color: '#475569' }}>
              Original listing no longer available
            </p>
          )}
        </div>

        {/* Status badge — STATUS_COLORS values already carry .fp-badge padding/font */}
        <span className={`flex-shrink-0 ${STATUS_COLORS[message.status] || STATUS_COLORS.DRAFT}`}>
          {message.status === 'PENDING_APPROVAL' ? 'PENDING' : message.status}
        </span>
      </div>

      {/* Stale listing warning */}
      {isStale && (
        <div className="fp-alert-warn mb-3 p-2 rounded text-xs" style={{ color: '#fcd34d' }}>
          Listing updated since this message was drafted.
        </div>
      )}

      {/* Subject */}
      {isEditing ? (
        <div className="mb-2">
          <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
            Subject ({editSubject.length}/{SUBJECT_MAX})
          </label>
          <input
            type="text"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value.slice(0, SUBJECT_MAX))}
            className="fp-input w-full text-sm"
            placeholder="Subject (optional)"
          />
        </div>
      ) : message.subject ? (
        <p className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>
          {message.subject}
        </p>
      ) : null}

      {/* Body */}
      {isEditing ? (
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
            Body ({editBody.length}/{BODY_MAX})
          </label>
          <textarea
            ref={textareaRef}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value.slice(0, BODY_MAX))}
            className="fp-input w-full text-sm resize-none"
            style={{ minHeight: '100px', maxHeight: '300px' }}
          />
        </div>
      ) : (
        <p className="text-sm mb-3 line-clamp-2 whitespace-pre-wrap" style={{ color: '#94a3b8' }}>
          {message.body}
        </p>
      )}

      {/* SENT status: display "Queued for delivery" */}
      {message.status === 'SENT' && (
        <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: '#c4b5fd' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Queued for delivery</span>
          {message.sentAt && (
            <span className="text-xs" style={{ color: '#475569' }}>
              {new Date(message.sentAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* DRAFT actions */}
        {message.status === 'DRAFT' && !isEditing && (
          <>
            <button
              onClick={handleEdit}
              disabled={isActionDisabled}
              className="fp-btn-ghost min-h-[44px] order-1 md:order-none justify-center"
            >
              Edit
            </button>
            <button
              onClick={handleApprove}
              disabled={isActionDisabled}
              className="fp-btn-primary min-h-[44px] order-2 md:order-none justify-center"
            >
              {loadingAction === 'approve' && (
                <span
                  className="animate-spin h-4 w-4 rounded-full"
                  style={{ border: '2px solid #f1f5f9', borderTopColor: 'transparent' }}
                />
              )}
              {messageApprovalRequired ? 'Approve' : 'Approve & Send'}
            </button>
            <button
              onClick={handleReject}
              disabled={isActionDisabled}
              className={`fp-btn-danger min-h-[44px] order-3 md:order-none justify-center ${rejectConfirm ? 'opacity-100' : ''}`}
            >
              {loadingAction === 'reject' && (
                <span
                  className="animate-spin h-4 w-4 rounded-full inline-block mr-1"
                  style={{ border: '2px solid currentColor', borderTopColor: 'transparent' }}
                />
              )}
              {rejectConfirm ? 'Confirm Reject?' : 'Reject'}
            </button>
          </>
        )}

        {/* DRAFT editing actions */}
        {message.status === 'DRAFT' && isEditing && (
          <>
            <button
              onClick={handleEdit}
              disabled={isActionDisabled || editBody.trim() === ''}
              className="fp-btn-primary min-h-[44px] justify-center"
            >
              {loadingAction === 'edit' && (
                <span
                  className="animate-spin h-4 w-4 rounded-full"
                  style={{ border: '2px solid #f1f5f9', borderTopColor: 'transparent' }}
                />
              )}
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isActionDisabled}
              className="fp-btn-ghost min-h-[44px] justify-center"
            >
              Cancel
            </button>
          </>
        )}

        {/* PENDING_APPROVAL actions */}
        {message.status === 'PENDING_APPROVAL' && (
          <>
            <button
              onClick={handleConfirm}
              disabled={isActionDisabled}
              className="fp-btn-primary min-h-[44px] justify-center"
            >
              {loadingAction === 'confirm' && (
                <span
                  className="animate-spin h-4 w-4 rounded-full"
                  style={{ border: '2px solid #f1f5f9', borderTopColor: 'transparent' }}
                />
              )}
              Confirm Send
            </button>
            <button
              onClick={handleEditFromPending}
              disabled={isActionDisabled}
              className="fp-btn-ghost min-h-[44px] justify-center"
            >
              {loadingAction === 'reject' && pendingEditAfterReject && (
                <span
                  className="animate-spin h-4 w-4 rounded-full inline-block mr-1"
                  style={{ border: '2px solid currentColor', borderTopColor: 'transparent' }}
                />
              )}
              Edit
            </button>
            <button
              onClick={handleReject}
              disabled={isActionDisabled}
              className="fp-btn-danger min-h-[44px] justify-center"
            >
              {loadingAction === 'reject' && !pendingEditAfterReject && (
                <span
                  className="animate-spin h-4 w-4 rounded-full inline-block mr-1"
                  style={{ border: '2px solid currentColor', borderTopColor: 'transparent' }}
                />
              )}
              {rejectConfirm ? 'Confirm Reject?' : 'Reject'}
            </button>
          </>
        )}

        {/* Copy button — always available */}
        <button
          onClick={handleCopy}
          className="fp-btn-ghost min-h-[44px] ml-auto justify-center"
        >
          {copySuccess ? 'Copied!' : 'Copy Message'}
        </button>
      </div>
    </div>
  );
}
