'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, ExternalLink, X } from 'lucide-react';
import { useFilterParams } from '@/hooks/useFilterParams';
import FilterPanel from '@/components/FilterPanel';
import { getListingImageUrl } from '@/lib/image-helpers';
import type { ListingWithImages } from '@/lib/image-helpers';
import { useSseEvents } from '@/hooks/useSseEvents';

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

const LISTING_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  ANALYZED: 'bg-blue-100 text-blue-700',
  OPPORTUNITY: 'bg-purple-100 text-purple-700',
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading dashboard...</div>}>
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

  function getPlatformBadgeColor(platform: string) {
    const colors: Record<string, string> = {
      EBAY: 'bg-yellow-500',
      CRAIGSLIST: 'bg-blue-500',
      FACEBOOK: 'bg-blue-600',
      OFFERUP: 'bg-green-500',
      MERCARI: 'bg-orange-500',
    };
    return colors[platform] || 'bg-gray-500';
  }

  function getStatusBadgeClass(status: string) {
    return LISTING_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading listings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Flipper Dashboard</h1>
            {/* SSE connection status indicator */}
            <div className="flex items-center gap-1.5 text-sm" data-testid="sse-status">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-600 font-medium">Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-600 font-medium">Reconnecting…</span>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600">Find and track profitable flipping opportunities</p>
        </div>

        {/* SSE error banner */}
        {lastError && !sseErrorDismissed && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm" data-testid="sse-error-banner">
            <span>Real-time updates: {lastError}. Data will refresh when connection is restored.</span>
            <button
              onClick={() => setSseErrorDismissed(true)}
              className="shrink-0 p-1 hover:bg-amber-100 rounded"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards — 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Listings</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalListings}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Opportunities Found</div>
            <div className="text-3xl font-bold text-purple-600">{stats.opportunitiesFound}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Active Flips</div>
            <div className="text-3xl font-bold text-blue-600">{stats.activeFlips}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Profit</div>
            <div className="text-3xl font-bold text-green-600">
              ${stats.totalProfit.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="mb-6">
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
          <span className="text-sm text-gray-600">Show:</span>
          {([10, 20, 50] as const).map((size) => (
            <button
              key={size}
              onClick={() => {
                setFilter('limit', String(size));
                setFilter('page', '1');
              }}
              className={`px-3 py-1 rounded text-sm border ${
                filters.limit === String(size)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {size}
            </button>
          ))}
          <span className="text-sm text-gray-600">per page</span>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-xl text-gray-600">No listings found</div>
            <p className="text-gray-500 mt-2">Try adjusting your filters or running a new scan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const imageUrl = getListingImageUrl(listing as unknown as ListingWithImages);
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  {imageUrl && (
                    <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
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
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold text-white ${getPlatformBadgeColor(listing.platform)}`}
                        >
                          {listing.platform}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(listing.status)}`}
                        >
                          {listing.status}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleCreateOpportunity(e, listing.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={!!listing.opportunity}
                      >
                        <Star
                          className={`w-5 h-5 ${listing.opportunity ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                        />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {listing.title}
                    </h3>

                    {/* Price & Value */}
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="text-sm text-gray-600">Asking</div>
                        <div className="text-lg font-bold text-gray-900">${listing.askingPrice}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {listing.verifiedMarketValue !== null ? 'Verified Value' : 'Est. Value'}
                        </div>
                        <div className="text-lg font-bold text-green-600">
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
                        <span className="text-gray-500">Score: </span>
                        <span className="font-semibold text-blue-600">{listing.valueScore}/100</span>
                      </div>
                    )}

                    {/* Profit Badge */}
                    {listing.profitPotential !== null && listing.profitPotential !== undefined && (
                      <div className="mb-2">
                        <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          +${listing.profitPotential} profit (
                          {(listing.trueDiscountPercent ?? listing.discountPercent ?? 0).toFixed(0)}
                          % off)
                        </div>
                      </div>
                    )}

                    {/* Demand Badge (Story 5.3) */}
                    {listing.demandLevel && (
                      <div className="mb-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            listing.demandLevel === 'rising'
                              ? 'bg-green-100 text-green-700'
                              : listing.demandLevel === 'stable'
                                ? 'bg-blue-100 text-blue-700'
                                : listing.demandLevel === 'declining'
                                  ? 'bg-orange-100 text-orange-700'
                                  : listing.demandLevel === 'low_liquidity'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {listing.demandLevel === 'rising'
                            ? '↑ Rising demand'
                            : listing.demandLevel === 'stable'
                              ? '→ Stable demand'
                              : listing.demandLevel === 'declining'
                                ? '↓ Declining demand'
                                : listing.demandLevel === 'low_liquidity'
                                  ? '⚠ Low liquidity'
                                  : listing.demandLevel}
                        </span>
                      </div>
                    )}

                    {/* Logistics Badges (Story 5.5) */}
                    {(listing.sizeCategory || listing.outsidePickupRadius) && (
                      <div className="mb-3 flex flex-wrap gap-1" data-testid="logistics-badges">
                        {listing.sizeCategory && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              listing.sizeCategory === 'large_local_only'
                                ? 'bg-yellow-100 text-yellow-700'
                                : listing.sizeCategory === 'fragile_special_handling'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {listing.sizeCategory === 'large_local_only'
                              ? '🚚 Local pickup only'
                              : listing.sizeCategory === 'fragile_special_handling'
                                ? '⚠ Fragile'
                                : '📦 Shippable'}
                          </span>
                        )}
                        {listing.outsidePickupRadius && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            📍 Outside radius
                          </span>
                        )}
                      </div>
                    )}

                    {/* Location & External Link */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{listing.location}</span>
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
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
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setFilter('page', String(p))}
                className={`px-4 py-2 rounded ${
                  p === pagination.page
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
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
