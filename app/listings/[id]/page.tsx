'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { getListingImageUrl, getAllListingImageUrls } from '@/lib/image-helpers';
import type { ListingWithImages } from '@/lib/image-helpers';

interface ListingImage {
  id: string;
  imageIndex: number;
  storageUrl: string;
}

interface Opportunity {
  id: string;
  status: string;
  purchasePrice: number | null;
  resalePrice: number | null;
  actualProfit: number | null;
}

interface ListingDetail {
  id: string;
  platform: string;
  title: string;
  description: string | null;
  askingPrice: number;
  estimatedValue: number | null;
  profitPotential: number | null;
  valueScore: number | null;
  discountPercent: number | null;
  trueDiscountPercent: number | null;
  status: string;
  location: string | null;
  url: string;
  scrapedAt: string;
  imageUrls: string | null;
  images: ListingImage[];
  verifiedMarketValue: number | null;
  demandLevel: string | null;
  identifiedBrand: string | null;
  identifiedModel: string | null;
  identifiedCondition: string | null;
  comparableSalesJson: string | null;
  resaleStrategy: string | null;
  opportunity: Opportunity | null;
}

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading listing...</div>}>
      <ListingDetail />
    </Suspense>
  );
}

function ListingDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListing(id);
  }, [id]);

  async function fetchListing(listingId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/listings/${listingId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.detail || 'Failed to fetch listing');
      }
      const data = await response.json();
      setListing(data.listing);
    } catch (err) {
      console.error('Failed to fetch listing:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading listing...</div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-xl text-red-600">{error || 'Listing not found'}</div>
        <Link href="/dashboard" className="text-purple-600 hover:text-purple-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const primaryImageUrl = getListingImageUrl(listing as unknown as ListingWithImages);
  const allImageUrls = getAllListingImageUrls(listing as unknown as ListingWithImages);

  let comparableSales: unknown[] = [];
  if (listing.comparableSalesJson) {
    try {
      comparableSales = JSON.parse(listing.comparableSalesJson) as unknown[];
    } catch {
      // ignore parse errors
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Primary image */}
          {primaryImageUrl && (
            <div className="h-72 bg-gray-200 overflow-hidden">
              <img
                src={primaryImageUrl}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Additional images */}
          {allImageUrls.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto border-b">
              {allImageUrls.slice(1).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${listing.title} image ${i + 2}`}
                  className="h-20 w-20 object-cover rounded flex-shrink-0"
                />
              ))}
            </div>
          )}

          <div className="p-6">
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                    {listing.platform}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                    {listing.status}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                {listing.location && (
                  <p className="text-gray-500 text-sm mt-1">📍 {listing.location}</p>
                )}
              </div>
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium flex-shrink-0"
              >
                View on Marketplace <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Price grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 mb-1">Asking Price</div>
                <div className="text-xl font-bold text-gray-900">${listing.askingPrice}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {listing.verifiedMarketValue !== null ? 'Verified Value' : 'Est. Value'}
                </div>
                <div className="text-xl font-bold text-green-600">
                  ${listing.verifiedMarketValue ?? listing.estimatedValue ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Profit Potential</div>
                <div className="text-xl font-bold text-green-700">
                  {listing.profitPotential !== null ? `$${listing.profitPotential}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Value Score</div>
                <div className="text-xl font-bold text-blue-600">
                  {listing.valueScore !== null ? `${listing.valueScore}/100` : '—'}
                </div>
              </div>
            </div>

            {/* AI analysis */}
            {(listing.identifiedBrand ||
              listing.identifiedModel ||
              listing.identifiedCondition ||
              listing.resaleStrategy) && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">AI Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {listing.identifiedBrand && (
                    <div className="p-3 bg-blue-50 rounded">
                      <span className="text-xs text-blue-600 font-semibold block mb-1">Brand</span>
                      <span className="text-gray-900">{listing.identifiedBrand}</span>
                    </div>
                  )}
                  {listing.identifiedModel && (
                    <div className="p-3 bg-blue-50 rounded">
                      <span className="text-xs text-blue-600 font-semibold block mb-1">Model</span>
                      <span className="text-gray-900">{listing.identifiedModel}</span>
                    </div>
                  )}
                  {listing.identifiedCondition && (
                    <div className="p-3 bg-blue-50 rounded">
                      <span className="text-xs text-blue-600 font-semibold block mb-1">
                        Condition
                      </span>
                      <span className="text-gray-900">{listing.identifiedCondition}</span>
                    </div>
                  )}
                  {listing.demandLevel && (
                    <div className="p-3 bg-blue-50 rounded">
                      <span className="text-xs text-blue-600 font-semibold block mb-1">
                        Demand Level
                      </span>
                      <span className="text-gray-900 capitalize">{listing.demandLevel}</span>
                    </div>
                  )}
                </div>
                {listing.resaleStrategy && (
                  <div className="mt-3 p-3 bg-green-50 rounded">
                    <span className="text-xs text-green-600 font-semibold block mb-1">
                      Resale Strategy
                    </span>
                    <p className="text-gray-900 text-sm">{listing.resaleStrategy}</p>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {/* Comparable sales */}
            {comparableSales.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Comparable Sales</h2>
                <div className="space-y-2">
                  {(comparableSales as Array<Record<string, unknown>>).map((sale, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                      <span className="text-gray-700 text-sm">{String(sale.title ?? sale.name ?? `Sale ${i + 1}`)}</span>
                      {sale.price !== undefined && (
                        <span className="font-semibold text-green-700">${String(sale.price)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunity link */}
            {listing.opportunity && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-600 font-semibold mb-1">
                    Opportunity Status
                  </div>
                  <div className="text-gray-900 font-medium">{listing.opportunity.status}</div>
                </div>
                <Link
                  href="/opportunities"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
                >
                  View Opportunities →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
