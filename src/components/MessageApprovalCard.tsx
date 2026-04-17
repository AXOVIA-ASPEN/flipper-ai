/**
 * @file src/components/MessageApprovalCard.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Card for reviewing and acting on messages in the approval queue.
 *
 * @description
 * Renders a message card with status-dependent action buttons (approve,
 * confirm, edit, reject), inline editing with character limits, reject
 * confirmation with auto-revert, copy-to-clipboard, stale listing
 * detection, and responsive mobile layout. All body/subject content
 * is rendered as plain text only.
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      {/* Header: listing info + status badge */}
      <div className="flex items-start gap-3 mb-3">
        {/* Listing thumbnail / platform icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
          {platformIcon}
        </div>

        <div className="flex-1 min-w-0">
          {message.listing ? (
            <>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {message.listing.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {message.listing.platform} &middot; ${message.listing.askingPrice.toFixed(2)}
                {message.sellerName && ` &middot; ${message.sellerName}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
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
        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-400">
          Listing updated since this message was drafted.
        </div>
      )}

      {/* Subject */}
      {isEditing ? (
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Subject ({editSubject.length}/{SUBJECT_MAX})
          </label>
          <input
            type="text"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value.slice(0, SUBJECT_MAX))}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Subject (optional)"
          />
        </div>
      ) : message.subject ? (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {message.subject}
        </p>
      ) : null}

      {/* Body */}
      {isEditing ? (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Body ({editBody.length}/{BODY_MAX})
          </label>
          <textarea
            ref={textareaRef}
            value={editBody}
            onChange={(e) => setEditBody(e.target.value.slice(0, BODY_MAX))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            style={{ minHeight: '100px', maxHeight: '300px' }}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 whitespace-pre-wrap">
          {message.body}
        </p>
      )}

      {/* SENT status: display "Queued for delivery" */}
      {message.status === 'SENT' && (
        <div className="flex items-center gap-2 mb-3 text-sm text-blue-600 dark:text-blue-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Queued for delivery</span>
          {message.sentAt && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
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
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 md:order-none"
            >
              Edit
            </button>
            <button
              onClick={handleApprove}
              disabled={isActionDisabled}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed order-2 md:order-none flex items-center justify-center gap-2"
            >
              {loadingAction === 'approve' && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              {messageApprovalRequired ? 'Approve' : 'Approve & Send'}
            </button>
            <button
              onClick={handleReject}
              disabled={isActionDisabled}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed order-3 md:order-none ${
                rejectConfirm
                  ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600'
              }`}
            >
              {loadingAction === 'reject' && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block mr-1" />}
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
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingAction === 'edit' && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isActionDisabled}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingAction === 'confirm' && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Confirm Send
            </button>
            <button
              onClick={handleEditFromPending}
              disabled={isActionDisabled}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAction === 'reject' && pendingEditAfterReject && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block mr-1" />}
              Edit
            </button>
            <button
              onClick={handleReject}
              disabled={isActionDisabled}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${
                rejectConfirm
                  ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600'
              }`}
            >
              {loadingAction === 'reject' && !pendingEditAfterReject && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block mr-1" />}
              {rejectConfirm ? 'Confirm Reject?' : 'Reject'}
            </button>
          </>
        )}

        {/* Copy button — always available */}
        <button
          onClick={handleCopy}
          className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 ml-auto"
        >
          {copySuccess ? 'Copied!' : 'Copy Message'}
        </button>
      </div>
    </div>
  );
}
