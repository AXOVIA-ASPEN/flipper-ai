/**
 * @file app/posting-queue/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Cross-Posts dashboard — user view of the posting queue.
 *
 * @description
 * Client-side page ('use client') that lists the authenticated user's
 * PostingQueueItems with status, platform, listing thumbnail, and per-item
 * actions (retry, cancel, view live URL). Fetches /api/posting-queue and
 * /api/posting-queue/stats on mount. Supports URL-backed status and target
 * platform filters, offset pagination, and a "Process Queue" button that
 * hits /api/posting-queue/process and surfaces a results toast. Handles the
 * five required states: auth redirect, loading skeleton, error banner,
 * empty state, and loaded state.
 */
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, RefreshCw } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useToast } from '@/components/ToastContainer';
import { useFilterParams } from '@/hooks/useFilterParams';
import QueueItemCard, {
  type QueueItem,
} from '@/components/posting-queue/QueueItemCard';
import { LoadingSkeleton, ErrorBanner, EmptyState } from '@/components/ui';

interface Stats {
  pending: number;
  inProgress: number;
  posted: number;
  failed: number;
  total: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All platforms' },
  { value: 'EBAY', label: 'eBay' },
  { value: 'FACEBOOK_MARKETPLACE', label: 'Facebook Marketplace' },
  { value: 'OFFERUP', label: 'OfferUp' },
  { value: 'MERCARI', label: 'Mercari' },
];

const PAGE_SIZE = 50;

function PostingQueueContent() {
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { filters, setFilter, setFilters } = useFilterParams();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const statusFilter = filters.status;
  const platformFilter = filters.platform;
  const page = Number(filters.page) || 1;
  const offset = (page - 1) * PAGE_SIZE;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (platformFilter && platformFilter !== 'all') {
        params.set('targetPlatform', platformFilter);
      }

      const [itemsRes, statsRes] = await Promise.all([
        fetch(`/api/posting-queue?${params.toString()}`),
        fetch('/api/posting-queue/stats'),
      ]);
      if (!itemsRes.ok) throw new Error(`HTTP ${itemsRes.status}`);
      if (!statsRes.ok) throw new Error(`HTTP ${statsRes.status}`);
      const itemsJson = await itemsRes.json();
      const statsJson = await statsRes.json();
      setItems(itemsJson.items ?? []);
      setTotal(itemsJson.total ?? 0);
      setStats(statsJson);
    } catch {
      setError('Failed to load cross-posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, platformFilter]);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }
    if (!authLoading && firebaseUser) {
      fetchItems();
    }
  }, [authLoading, firebaseUser, router, fetchItems]);

  const handleProcess = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/posting-queue/process', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          (json?.error?.detail as string | undefined) ||
          (json?.error as string | undefined) ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = json.data ?? { processed: 0, posted: 0, failed: 0 };
      showToast({
        type: data.failed > 0 ? 'alert' : 'success',
        title: 'Queue processed',
        message: `Processed ${data.processed} item${data.processed === 1 ? '' : 's'}: ${data.posted} posted, ${data.failed} failed.`,
      });
      await fetchItems();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not process queue',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, fetchItems, showToast]);

  const handleRetry = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/posting-queue/${id}/retry`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast({
          type: 'success',
          title: 'Retry queued',
          message: 'The item was re-queued for posting.',
        });
        await fetchItems();
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Retry failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [fetchItems, showToast]
  );

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/posting-queue/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast({
          type: 'success',
          title: 'Cross-post cancelled',
          message: 'The queued item was removed.',
        });
        await fetchItems();
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Cancel failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [fetchItems, showToast]
  );

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const hasPending = (stats?.pending ?? 0) > 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectStyle: React.CSSProperties = {
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.06)',
    padding: '8px 12px',
    fontSize: 13,
    color: '#e2e8f0',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Cross-Posts
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: '#94a3b8' }}>
            Track listings queued across eBay, Facebook Marketplace, OfferUp, and Mercari.
          </p>
        </div>
        <button
          type="button"
          onClick={handleProcess}
          disabled={processing || !hasPending}
          className="fp-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: processing || !hasPending ? 0.5 : 1, cursor: processing || !hasPending ? 'not-allowed' : 'pointer' }}
          data-testid="process-queue-button"
        >
          {processing ? (
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Play size={14} />
          )}
          {processing ? 'Processing...' : 'Process Queue'}
        </button>
      </div>

      {/* Stats summary */}
      {stats && (
        <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {[
            { label: 'Pending', value: stats.pending, color: '#fbbf24' },
            { label: 'In progress', value: stats.inProgress, color: '#8b5cf6' },
            { label: 'Posted', value: stats.posted, color: '#34d399' },
            { label: 'Failed', value: stats.failed, color: '#f87171' },
            { label: 'Total', value: stats.total, color: '#e2e8f0' },
          ].map((s) => (
            <div
              key={s.label}
              className="fp-glass"
              style={{ padding: 12, textAlign: 'center' }}
              data-testid={`stat-${s.label.toLowerCase().replace(' ', '-')}`}
            >
              <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <select
          value={statusFilter}
          onChange={(e) =>
            setFilters({ status: e.target.value, page: '1' })
          }
          aria-label="Filter by status"
          style={selectStyle}
          data-testid="status-filter"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={(e) =>
            setFilters({ platform: e.target.value, page: '1' })
          }
          aria-label="Filter by platform"
          style={selectStyle}
          data-testid="platform-filter"
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-live="polite"
          aria-atomic="true"
          data-testid="queue-total-count"
          style={{ fontSize: 13, color: '#64748b' }}
        >
          {total} item{total === 1 ? '' : 's'}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <ErrorBanner message={error} onRetry={fetchItems} />
      )}

      {/* Loading skeleton */}
      {loading ? (
        <LoadingSkeleton variant="list" rows={5} data-testid="loading-skeleton" />
      ) : items.length === 0 ? (
        <EmptyState
          data-testid="empty-state"
          title="No cross-posts yet"
          message="Go to Opportunities to cross-list items."
          action={{ label: 'Browse opportunities →', href: '/opportunities', variant: 'ghost' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setFilter('page', String(Math.max(1, page - 1)))}
            disabled={page <= 1}
            className="fp-btn-ghost"
            style={{ fontSize: 13, opacity: page <= 1 ? 0.4 : 1 }}
          >
            &larr; Previous
          </button>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() =>
              setFilter('page', String(Math.min(pageCount, page + 1)))
            }
            disabled={page >= pageCount}
            className="fp-btn-ghost"
            style={{ fontSize: 13, opacity: page >= pageCount ? 0.4 : 1 }}
          >
            Next &rarr;
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

export default function PostingQueuePage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
      <PostingQueueContent />
    </Suspense>
  );
}
