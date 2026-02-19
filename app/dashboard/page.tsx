'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, ExternalLink } from 'lucide-react';
import { useFilterParams } from '@/hooks/useFilterParams';

interface Listing {
  id: string;
  platform: string;
  title: string;
  askingPrice: number;
  estimatedValue: number;
  profitPotential: number;
  valueScore: number;
  discountPercent: number;
  status: string;
  location: string;
  url: string;
  scrapedAt: string;
  imageUrls: string | null;
  opportunity: { id: string } | null;
}

interface DashboardStats {
  totalListings: number;
  opportunities: number;
  avgProfitPotential: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filters, setFilter, clearFilters, activeFilterCount } = useFilterParams();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    opportunities: 0,
    avgProfitPotential: 0,
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (value) params.append(key, String(value));
      });

      const response = await fetch(`/api/listings?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      
      setListings(data.listings || []);
      setStats({
        totalListings: data.total || 0,
        opportunities: data.listings?.filter((l: Listing) => l.opportunity).length || 0,
        avgProfitPotential: 
          data.listings?.reduce((sum: number, l: Listing) => sum + l.profitPotential, 0) / 
          (data.listings?.length || 1) || 0,
      });
      setPagination(data.pagination || {
        page: 1,
        limit: 20,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / 20),
      });
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOpportunity(listingId: string) {
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create opportunity');
      }

      // Refresh listings to show updated opportunity status
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Flipper Dashboard</h1>
          <p className="text-gray-600">Find and track profitable flipping opportunities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Listings</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalListings}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Opportunities</div>
            <div className="text-3xl font-bold text-purple-600">{stats.opportunities}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Avg Profit Potential</div>
            <div className="text-3xl font-bold text-green-600">
              ${stats.avgProfitPotential.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-xl text-gray-600">No listings found</div>
            <p className="text-gray-500 mt-2">Try adjusting your filters or running a new scan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                {/* Image */}
                {listing.imageUrls && (
                  <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                    <img
                      src={JSON.parse(listing.imageUrls)[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  {/* Platform Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getPlatformBadgeColor(listing.platform)}`}>
                      {listing.platform}
                    </span>
                    <button
                      onClick={() => handleCreateOpportunity(listing.id)}
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
                      <div className="text-sm text-gray-600">Value</div>
                      <div className="text-lg font-bold text-green-600">${listing.estimatedValue}</div>
                    </div>
                  </div>

                  {/* Profit Badge */}
                  <div className="mb-3">
                    <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      +${listing.profitPotential} profit ({listing.discountPercent.toFixed(0)}% off)
                    </div>
                  </div>

                  {/* Location & Link */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{listing.location}</span>
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
                    >
                      View <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setFilter('page', String(page))}
                className={`px-4 py-2 rounded ${
                  page === pagination.page
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
