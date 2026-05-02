/**
 * @file src/components/posting-queue/CrossPostModal.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Modal for selecting cross-post target platforms for a listing.
 *
 * @description
 * Renders a modal with checkboxes for each supported resale platform
 * (excluding the source platform the listing came from). On mount it fetches
 * the listing's existing queue items so already-queued platforms render as
 * disabled. Submit calls POST /api/posting-queue with a batch payload and
 * surfaces a success/error toast. Handles the edge case where every
 * non-source platform is already queued by suppressing the submit button.
 *
 * Story 14.8: migrated to canonical glassmorphism — `.fp-glass` modal body,
 * `.fp-glass-sm` per-platform rows, `.fp-input` price field, `.fp-btn-primary`
 * submit, `.fp-btn-ghost` close, `.fp-alert-warn` load-error banner,
 * `.fp-alert-info` "all queued" banner. Submit handler, fetch flow, and
 * already-queued/source-platform exclusion logic are preserved verbatim.
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/ToastContainer';

interface Props {
  listingId: string;
  sourcePlatform: string;
  listingTitle: string;
  askingPrice?: number;
  onClose: () => void;
  onSuccess: () => void;
}

// Keep this list explicit (not imported from a zod enum) because Story 9.3
// requires the exact four resale targets in a specific label order. The
// backend's PlatformEnum still includes CRAIGSLIST, which must never appear
// here as a target.
const RESALE_PLATFORMS: Array<{ key: string; label: string }> = [
  { key: 'EBAY', label: 'eBay' },
  { key: 'FACEBOOK_MARKETPLACE', label: 'Facebook Marketplace' },
  { key: 'OFFERUP', label: 'OfferUp' },
  { key: 'MERCARI', label: 'Mercari' },
];

interface ExistingQueueItem {
  targetPlatform: string;
  status: string;
}

export default function CrossPostModal({
  listingId,
  sourcePlatform,
  listingTitle,
  askingPrice,
  onClose,
  onSuccess,
}: Props) {
  const { showToast } = useToast();
  const [existing, setExisting] = useState<ExistingQueueItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState<string>(
    askingPrice != null ? String(askingPrice) : ''
  );
  const [submitting, setSubmitting] = useState(false);

  // Platforms the user can choose from: all resale targets except the source.
  const availablePlatforms = useMemo(
    () => RESALE_PLATFORMS.filter((p) => p.key !== sourcePlatform),
    [sourcePlatform]
  );

  // Platforms already queued — disabled in the UI but still rendered so the
  // user understands *why* a given platform is unselectable.
  const alreadyQueued = useMemo(() => {
    const set = new Set<string>();
    if (existing) {
      for (const qi of existing) set.add(qi.targetPlatform);
    }
    return set;
  }, [existing]);

  const allQueued =
    existing !== null &&
    availablePlatforms.every((p) => alreadyQueued.has(p.key));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/posting-queue?listingId=${encodeURIComponent(listingId)}&limit=200`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const items = (json.items ?? []) as ExistingQueueItem[];
          setExisting(items);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Could not load existing queue state.');
          setExisting([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const togglePlatform = useCallback(
    (platformKey: string) => {
      if (alreadyQueued.has(platformKey)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(platformKey)) next.delete(platformKey);
        else next.add(platformKey);
        return next;
      });
    },
    [alreadyQueued]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (selected.size === 0) return;
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      listingId,
      platforms: Array.from(selected),
    };
    if (price.trim()) {
      const parsed = Number(price);
      if (Number.isFinite(parsed) && parsed > 0) {
        payload.askingPrice = parsed;
      }
    }

    try {
      const res = await fetch('/api/posting-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const detail =
          (json?.error?.detail as string | undefined) ||
          (json?.error as string | undefined) ||
          `HTTP ${res.status}`;
        throw new Error(detail);
      }
      const json = await res.json();
      const count = json.count ?? (json.items?.length ?? selected.size);
      showToast({
        type: 'success',
        title: 'Cross-posts queued',
        message: `Queued for ${count} platform${count === 1 ? '' : 's'}. View in Cross-Posts.`,
      });
      onSuccess();
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not queue cross-posts',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  }, [submitting, selected, listingId, price, showToast, onSuccess, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cross-post-modal-title"
    >
      <div className="fp-glass w-full max-w-lg">
        <div
          className="flex items-start justify-between p-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2
              id="cross-post-modal-title"
              className="text-lg font-semibold"
              style={{ color: '#e2e8f0' }}
            >
              Cross-post listing
            </h2>
            <p
              className="mt-1 truncate text-sm"
              style={{ color: '#94a3b8' }}
              title={listingTitle}
            >
              {listingTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="fp-icon-btn"
            aria-label="Close cross-post dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {loadError && (
            <p className="fp-alert-warn rounded px-3 py-2 text-xs" style={{ color: '#fcd34d' }}>
              {loadError}
            </p>
          )}

          {existing === null ? (
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Checking existing queue...
            </p>
          ) : allQueued ? (
            <p
              className="fp-alert-info rounded px-3 py-2 text-sm"
              style={{ color: '#93c5fd' }}
              data-testid="all-queued-message"
            >
              This listing is already queued for all available platforms.
            </p>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium" style={{ color: '#e2e8f0' }}>
                  Target platforms
                </legend>
                {availablePlatforms.map((p) => {
                  const isAlreadyQueued = alreadyQueued.has(p.key);
                  const isChecked = selected.has(p.key);
                  return (
                    <label
                      key={p.key}
                      className={`fp-glass-sm flex items-center gap-2 px-3 py-2 text-sm ${
                        isAlreadyQueued ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                      style={{ color: '#e2e8f0' }}
                    >
                      <input
                        type="checkbox"
                        disabled={isAlreadyQueued}
                        checked={isChecked}
                        onChange={() => togglePlatform(p.key)}
                        style={{ accentColor: '#7c3aed' }}
                        data-testid={`platform-checkbox-${p.key}`}
                      />
                      <span className="flex-1">{p.label}</span>
                      {p.key === 'EBAY' && (
                        <span className="fp-badge fp-badge-purple text-xs">Pro</span>
                      )}
                      {p.key === 'FACEBOOK_MARKETPLACE' && (
                        <span className="fp-badge fp-badge-yellow text-xs">Enterprise</span>
                      )}
                      {isAlreadyQueued && (
                        <span className="text-xs italic" style={{ color: '#94a3b8' }}>Already queued</span>
                      )}
                    </label>
                  );
                })}
              </fieldset>

              <div>
                <label
                  htmlFor="cross-post-price"
                  className="mb-1 block text-sm font-medium"
                  style={{ color: '#e2e8f0' }}
                >
                  Asking price (optional)
                </label>
                <input
                  id="cross-post-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Leave blank to reuse the original price"
                  className="fp-input w-full"
                />
              </div>
            </>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="fp-btn-ghost"
          >
            Close
          </button>
          {!allQueued && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selected.size === 0 || existing === null}
              className="fp-btn-primary"
              data-testid="submit-cross-post"
            >
              {submitting && (
                <span
                  className="h-3 w-3 animate-spin rounded-full"
                  style={{ border: '2px solid #f1f5f9', borderTopColor: 'transparent' }}
                  aria-hidden="true"
                />
              )}
              Queue cross-posts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
