/**
 * @file src/components/posting-queue/QueueItemCard.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Single posting queue item card for the Cross-Posts dashboard.
 *
 * @description
 * Renders one PostingQueueItem with status pill, platform badge, listing
 * thumbnail, and contextual actions: Retry (for FAILED items), Cancel
 * (for PENDING), and View URL (for POSTED with a validated external URL).
 * External URL schemes are whitelisted to http/https so a malicious
 * platform poster cannot inject javascript:, data:, or file: URIs.
 * imageUrls is stored as a JSON string on Listing — parsed here the same
 * way KanbanBoard.getFirstImage does it.
 */
'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, RotateCw, X as CancelIcon } from 'lucide-react';

export interface QueueItemListing {
  id: string;
  title: string;
  platform: string;
  askingPrice: number;
  imageUrls: string | null;
}

export interface QueueItem {
  id: string;
  listingId: string;
  targetPlatform: string;
  status: string;
  askingPrice: number | null;
  title: string | null;
  externalPostId: string | null;
  externalPostUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
  listing: QueueItemListing | null;
}

interface Props {
  item: QueueItem;
  onRetry: (id: string) => Promise<void> | void;
  onCancel: (id: string) => Promise<void> | void;
}

// Whitelist of URL schemes we will render as a clickable link. Platform
// posters return externalPostUrl as a raw string; anything outside this
// whitelist (javascript:, data:, file:, etc.) would be a stored-XSS vector.
const ALLOWED_URL_SCHEMES = ['https:', 'http:'];

function isSafeExternalUrl(raw: string | null): raw is string {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function getFirstImage(imageUrls: string | null): string | null {
  if (!imageUrls) return null;
  try {
    const parsed = JSON.parse(imageUrls);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  } catch {
    return null;
  }
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:     'fp-badge fp-badge-yellow',
  IN_PROGRESS: 'fp-badge fp-badge-blue',
  POSTED:      'fp-badge fp-badge-green',
  FAILED:      'fp-badge fp-badge-red',
  CANCELLED:   'fp-badge fp-badge-gray',
};

const PLATFORM_LABELS: Record<string, string> = {
  EBAY: 'eBay',
  FACEBOOK_MARKETPLACE: 'Facebook Marketplace',
  MERCARI: 'Mercari',
  OFFERUP: 'OfferUp',
  CRAIGSLIST: 'Craigslist',
};

export default function QueueItemCard({ item, onRetry, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);

  const image = useMemo(
    () => (item.listing ? getFirstImage(item.listing.imageUrls) : null),
    [item.listing]
  );
  const safeUrl = useMemo(
    () => (isSafeExternalUrl(item.externalPostUrl) ? item.externalPostUrl : null),
    [item.externalPostUrl]
  );
  const displayTitle = item.title || item.listing?.title || 'Untitled listing';
  const statusClass = STATUS_STYLES[item.status] ?? STATUS_STYLES.CANCELLED;
  const platformLabel = PLATFORM_LABELS[item.targetPlatform] ?? item.targetPlatform;

  const handleRetry = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRetry(item.id);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (busy) return;
    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm('Cancel this queued cross-post?');
    if (!confirmed) return;
    setBusy(true);
    try {
      await onCancel(item.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="queue-item-card"
      className="fp-glass"
      style={{ display: 'flex', gap: 12, padding: 12, marginBottom: 8 }}
    >
      {image ? (
        <img
          src={image}
          alt={displayTitle}
          className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
          style={{ border: '1px solid rgba(255,255,255,0.09)' }}
        />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md text-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          📦
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className="truncate text-sm font-medium"
              style={{ color: '#e2e8f0' }}
              title={displayTitle}
            >
              {displayTitle}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: '#64748b' }}>
              <span className="rounded fp-badge fp-badge-gray">
                {platformLabel}
              </span>
              {item.askingPrice != null && (
                <span>${item.askingPrice.toFixed(0)}</span>
              )}
              <span>{formatRelative(item.createdAt)}</span>
            </div>
          </div>

          <span
            className={`flex-shrink-0 ${statusClass}`}
            data-testid="status-pill"
          >
            {item.status}
          </span>
        </div>

        {/* Error message for FAILED items */}
        {item.status === 'FAILED' && item.errorMessage && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            <p
              className={errorExpanded ? '' : 'line-clamp-2'}
              style={{ color: '#f87171' }}
              data-testid="error-message"
            >
              {item.errorMessage}
            </p>
            {item.errorMessage.length > 80 && (
              <button
                type="button"
                onClick={() => setErrorExpanded((v) => !v)}
                aria-expanded={errorExpanded}
                className="mt-1 underline hover:no-underline"
                style={{ color: '#94a3b8' }}
              >
                {errorExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.status === 'FAILED' && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={busy}
              className="fp-btn-ghost"
              style={{ padding: '4px 10px', fontSize: 12 }}
              data-testid="retry-button"
            >
              <RotateCw size={12} /> Retry
            </button>
          )}
          {item.status === 'PENDING' && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="fp-btn-ghost"
              style={{ padding: '4px 10px', fontSize: 12 }}
              data-testid="cancel-button"
            >
              <CancelIcon size={12} /> Cancel
            </button>
          )}
          {item.status === 'POSTED' && safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fp-btn-ghost"
              style={{ padding: '4px 10px', fontSize: 12, color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}
              data-testid="view-link"
            >
              <ExternalLink size={12} /> View listing
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
