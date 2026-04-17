'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, ExternalLink, X } from 'lucide-react';
import { useFilterParams } from '@/hooks/useFilterParams';
import FilterPanel from '@/components/FilterPanel';
import { getListingImageUrl } from '@/lib/image-helpers';
import type { ListingWithImages } from '@/lib/image-helpers';
import { useSseEvents } from '@/hooks/useSseEvents';
import { LoadingSkeleton, ErrorBanner } from '@/components/ui';

interface ListingImage {
  id: string;
  imageIndex: number;
  storageUrl: string;
}

interface Listing {
  id: string;
  platform: string;
  title: string;
  askingPrice: number;
  estimatedValue: number | null;
  profitPotential: number | null;
  valueScore: number | null;
  discountPercent: number | null;
  status: string;
  location: string | null;
  url: string;
  scrapedAt: string;
  imageUrls: string | null;
  images: ListingImage[];
  verifiedMarketValue: number | null;
  trueDiscountPercent: number | null;
  demandLevel: string | null;
  opportunity: { id: string; status: string } | null;
  // Story 5.5
  sizeCategory: string | null;
  outsidePickupRadius: boolean | null;
}

interface DashboardStats {
  totalListings: number;
  opportunitiesFound: number;
  activeFlips: number;
  totalProfit: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading dashboard…</div>}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const { filters, setFilter, setFilters, clearFilters, activeFilterCount } = useFilterParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    opportunitiesFound: 0,
    activeFlips: 0,
    totalProfit: 0,
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseErrorDismissed, setSseErrorDismissed] = useState(false);

  const { events, isConnected, lastError } = useSseEvents({
    eventTypes: ['listing.found', 'opportunity.created', 'opportunity.updated'],
    maxEvents: 20,
  });

  // Refresh listings when new SSE events arrive
  const lastEventTime = events[0]?.receivedAt;
  useEffect(() => {
    if (lastEventTime !== undefined) {
      fetchListings();
    }
  }, [lastEventTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset SSE error dismissal when a new error appears
  useEffect(() => {
    if (lastError) {
      setSseErrorDismissed(false);
    }
  }, [lastError]);

  useEffect(() => {
    fetchListings();
  }, [filters]);

  async function fetchListings() {
    setLoading(true);
    setError(null);

    try {
      // Build query string from filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, String(value));
      });

      const response = await fetch(`/api/listings?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();

      setListings(data.listings || []);
      setStats({
        totalListings: data.stats?.totalListings ?? 0,
        opportunitiesFound: data.stats?.opportunitiesFound ?? 0,
        activeFlips: data.stats?.activeFlips ?? 0,
        totalProfit: data.stats?.totalProfit ?? 0,
      });
      setPagination(
        data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOpportunity(e: React.MouseEvent, listingId: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create opportunity');
      }

      await fetchListings();
    } catch (err) {
      console.error('Failed to create opportunity:', err);
      alert('Failed to create opportunity');
    }
  }

  function getPlatformBadgeClass(platform: string) {
    const map: Record<string, string> = {
      EBAY:       'fp-badge fp-badge-yellow',
      CRAIGSLIST: 'fp-badge fp-badge-blue',
      FACEBOOK:   'fp-badge fp-badge-blue',
      OFFERUP:    'fp-badge fp-badge-green',
      MERCARI:    'fp-badge fp-badge-orange',
    };
    return map[platform] ?? 'fp-badge fp-badge-gray';
  }

  function getStatusBadgeClass(status: string) {
    const map: Record<string, string> = {
      NEW:         'fp-badge fp-badge-gray',
      ANALYZED:    'fp-badge fp-badge-blue',
      OPPORTUNITY: 'fp-badge fp-badge-purple',
    };
    return map[status] ?? 'fp-badge fp-badge-gray';
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
        <LoadingSkeleton variant="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Flipper Dashboard</h1>
            {/* SSE connection status indicator */}
            <div className="flex items-center gap-1.5 text-sm" aria-live="polite" data-testid="sse-status">
              {isConnected ? (
                <>
                  <span className="fp-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  <span style={{ color: '#34d399', fontWeight: 600, fontSize: 13 }}>Live</span>
                </>
              ) : (
                <>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'fp-pulse 2s ease-in-out infinite' }} />
                  <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 13 }}>Reconnecting…</span>
                </>
              )}
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Find and track profitable flipping opportunities</p>
        </div>

        {/* SSE error banner */}
        {lastError && !sseErrorDismissed && (
          <div className="fp-alert-warn" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', fontSize: 13, color: '#fcd34d' }} data-testid="sse-error-banner">
            <span>Real-time updates: {lastError}. Data will refresh when connection is restored.</span>
            <button
              onClick={() => setSseErrorDismissed(true)}
              style={{ flexShrink: 0, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#fbbf24', borderRadius: 4 }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards — 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ marginBottom: 32 }}>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Total Listings</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0' }}>{stats.totalListings}</div>
          </div>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Opportunities</div>
            <div className="fp-grad-purple" style={{ fontSize: 32, fontWeight: 800 }}>{stats.opportunitiesFound}</div>
          </div>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Active Flips</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6' }}>{stats.activeFlips}</div>
          </div>
          <div className="fp-stat-card">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>Total Profit</div>
            <div className="fp-grad-green" style={{ fontSize: 32, fontWeight: 800 }}>${stats.totalProfit.toFixed(0)}</div>
          </div>
        </div>

        {/* Filter Panel */}
        <div style={{ marginBottom: 24 }}>
          <FilterPanel
            filters={filters}
            setFilter={setFilter}
            setFilters={setFilters}
            clearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
            statusOptions={[
              { value: 'NEW', label: 'New' },
              { value: 'OPPORTUNITY', label: 'Opportunity' },
            ]}
          />
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-3 mb-4">
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Show:</span>
          {([10, 20, 50] as const).map((size) => (
            <button
              key={size}
              onClick={() => {
                setFilter('limit', String(size));
                setFilter('page', '1');
              }}
              className={filters.limit === String(size) ? 'fp-btn-primary' : 'fp-btn-ghost'}
              style={{ padding: '5px 14px', fontSize: 13 }}
            >
              {size}
            </button>
          ))}
          <span style={{ fontSize: 13, color: '#94a3b8' }}>per page</span>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="fp-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 8 }}>No listings found</div>
            <p style={{ color: '#475569', fontSize: 14 }}>Try adjusting your filters or running a new scan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const imageUrl = getListingImageUrl(listing as unknown as ListingWithImages);
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block fp-glass fp-glow-card"
                  style={{ textDecoration: 'none', overflow: 'hidden' }}
                >
                  {/* Image */}
                  {imageUrl && (
                    <div style={{ height: 192, background: 'rgba(255,255,255,0.04)', borderRadius: '15px 15px 0 0', overflow: 'hidden' }}>
                      <img
                        src={imageUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    {/* Platform Badge + Status Badge + Star */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={getPlatformBadgeClass(listing.platform)}>
                          {listing.platform}
                        </span>
                        <span className={getStatusBadgeClass(listing.status)}>
                          {listing.status}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleCreateOpportunity(e, listing.id)}
                        style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                        disabled={!!listing.opportunity}
                        aria-label={listing.opportunity ? 'Already tracked as opportunity' : 'Track as opportunity'}
                      >
                        <Star
                          className={`w-5 h-5 ${listing.opportunity ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'}`}
                        />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {listing.title}
                    </h3>

                    {/* Price & Value */}
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Asking</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>${listing.askingPrice}</div>
                      </div>
                      <div className="text-right">
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          {listing.verifiedMarketValue !== null ? 'Verified Value' : 'Est. Value'}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>
                          $
                          {listing.verifiedMarketValue !== null
                            ? listing.verifiedMarketValue
                            : (listing.estimatedValue ?? 0)}
                        </div>
                      </div>
                    </div>

                    {/* Value Score */}
                    {listing.valueScore !== null && (
                      <div className="mb-2 text-sm">
                        <span style={{ color: '#94a3b8' }}>Score: </span>
                        <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{listing.valueScore}/100</span>
                      </div>
                    )}

                    {/* Profit Badge */}
                    {listing.profitPotential !== null && listing.profitPotential !== undefined && (
                      <div className="mb-2">
                        <span className="fp-badge fp-badge-green">
                          +${listing.profitPotential} profit (
                          {(listing.trueDiscountPercent ?? listing.discountPercent ?? 0).toFixed(0)}
                          % off)
                        </span>
                      </div>
                    )}

                    {/* Demand Badge (Story 5.3) */}
                    {listing.demandLevel && (
                      <div style={{ marginBottom: 8 }}>
                        <span className={`fp-badge ${
                          listing.demandLevel === 'rising'        ? 'fp-badge-green'  :
                          listing.demandLevel === 'stable'        ? 'fp-badge-blue'   :
                          listing.demandLevel === 'declining'     ? 'fp-badge-orange' :
                          listing.demandLevel === 'low_liquidity' ? 'fp-badge-red'    :
                                                                     'fp-badge-gray'
                        }`}>
                          {listing.demandLevel === 'rising'        ? '↑ Rising demand'  :
                           listing.demandLevel === 'stable'        ? '→ Stable demand'  :
                           listing.demandLevel === 'declining'     ? '↓ Declining'      :
                           listing.demandLevel === 'low_liquidity' ? '⚠ Low liquidity'  :
                           listing.demandLevel}
                        </span>
                      </div>
                    )}

                    {/* Logistics Badges (Story 5.5) */}
                    {(listing.sizeCategory || listing.outsidePickupRadius) && (
                      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }} data-testid="logistics-badges">
                        {listing.sizeCategory && (
                          <span className={`fp-badge ${
                            listing.sizeCategory === 'large_local_only'         ? 'fp-badge-yellow'  :
                            listing.sizeCategory === 'fragile_special_handling' ? 'fp-badge-purple'  :
                                                                                   'fp-badge-gray'
                          }`}>
                            {listing.sizeCategory === 'large_local_only'         ? '🚚 Local only'  :
                             listing.sizeCategory === 'fragile_special_handling' ? '⚠ Fragile'      :
                             '📦 Shippable'}
                          </span>
                        )}
                        {listing.outsidePickupRadius && (
                          <span className="fp-badge fp-badge-orange">📍 Outside radius</span>
                        )}
                      </div>
                    )}

                    {/* Location & External Link */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                      <span>{listing.location}</span>
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8b5cf6', textDecoration: 'none' }}
                      >
                        View <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setFilter('page', String(p))}
                className={p === pagination.page ? 'fp-btn-primary' : 'fp-btn-ghost'}
                style={{ padding: '6px 16px' }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
