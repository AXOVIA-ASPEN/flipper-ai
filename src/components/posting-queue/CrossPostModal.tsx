/**
 * @file src/components/posting-queue/CrossPostModal.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Modal for selecting cross-post target platforms for a listing.
 *
 * @description
 * Renders a modal with checkboxes for each supported resale platform
 * (excluding the source platform the listing came from). On mount it fetches
 * the listing's existing queue items so already-queued platforms render as
 * disabled. Submit calls POST /api/posting-queue with a batch payload and
 * surfaces a success/error toast. Handles the edge case where every
 * non-source platform is already queued by suppressing the submit button.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cross-post-modal-title"
    >
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h2
              id="cross-post-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Cross-post listing
            </h2>
            <p
              className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400"
              title={listingTitle}
            >
              {listingTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {loadError && (
            <p className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              {loadError}
            </p>
          )}

          {existing === null ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Checking existing queue...
            </p>
          ) : allQueued ? (
            <p
              className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
              data-testid="all-queued-message"
            >
              This listing is already queued for all available platforms.
            </p>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Target platforms
                </legend>
                {availablePlatforms.map((p) => {
                  const isAlreadyQueued = alreadyQueued.has(p.key);
                  const isChecked = selected.has(p.key);
                  return (
                    <label
                      key={p.key}
                      className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                        isAlreadyQueued
                          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500'
                          : 'cursor-pointer border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isAlreadyQueued}
                        checked={isChecked}
                        onChange={() => togglePlatform(p.key)}
                        data-testid={`platform-checkbox-${p.key}`}
                      />
                      <span className="flex-1">{p.label}</span>
                      {isAlreadyQueued && (
                        <span className="text-xs italic">Already queued</span>
                      )}
                    </label>
                  );
                })}
              </fieldset>

              <div>
                <label
                  htmlFor="cross-post-price"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
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
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Close
          </button>
          {!allQueued && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selected.size === 0 || existing === null}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="submit-cross-post"
            >
              {submitting && (
                <span
                  className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
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
