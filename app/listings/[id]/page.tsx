'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { getListingImageUrl, getAllListingImageUrls } from '@/lib/image-helpers';
import type { ListingWithImages } from '@/lib/image-helpers';
import ResaleContentEditor from '@/components/ResaleContentEditor';
import PriceCalculator from '@/components/PriceCalculator';
import MeetingModal from '@/components/MeetingModal';
import MeetingRouteCard from '@/components/MeetingRouteCard';
import { useToast } from '@/components/ToastContainer';

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
  // Story 12.1: Meeting scheduling fields
  meetingTime: string | null;
  meetingLocation: string | null;
  meetingType: string | null;
  calendarEventId: string | null;
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
  const { showToast } = useToast();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Story 13.3: Stale analysis indicator
  const [staleAnalysis, setStaleAnalysis] = useState(false);
  // Story 12.1: Meeting scheduling state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(false);

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
      // Story 13.3: Track stale analysis flag from API
      setStaleAnalysis(data.staleAnalysis === true);
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
    <>
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

            {/* Story 13.3: Stale analysis banner */}
            {staleAnalysis && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2" data-testid="stale-analysis-banner">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span className="text-sm text-amber-800">
                  Analysis may be outdated — the asking price has changed since the last AI analysis. A fresh analysis is being generated.
                </span>
              </div>
            )}

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

            {/* Price & List — optimal pricing calculator (Story 9.2). Available
                pre-purchase as a projection and post-purchase as the
                authoritative recommendation. */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Price & List</h2>
              <PriceCalculator
                listingId={listing.id}
                sourcePlatform={listing.platform}
                onListPlatform={async (platform, finalPrice) => {
                  const platformMap: Record<string, string> = {
                    ebay: 'EBAY',
                    mercari: 'MERCARI',
                    facebook: 'FACEBOOK_MARKETPLACE',
                    offerup: 'OFFERUP',
                    craigslist: 'CRAIGSLIST',
                  };
                  const platformLabel: Record<string, string> = {
                    ebay: 'eBay',
                    mercari: 'Mercari',
                    facebook: 'Facebook Marketplace',
                    offerup: 'OfferUp',
                    craigslist: 'Craigslist',
                  };
                  try {
                    const res = await fetch('/api/posting-queue', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        listingId: listing.id,
                        targetPlatform: platformMap[platform] ?? 'EBAY',
                        askingPrice: finalPrice,
                      }),
                    });
                    if (!res.ok) {
                      const data = (await res.json().catch(() => ({}))) as {
                        error?: { detail?: string } | string;
                      };
                      const detail =
                        typeof data.error === 'object'
                          ? data.error?.detail
                          : data.error;
                      throw new Error(detail || `Request failed (${res.status})`);
                    }
                    showToast({
                      type: 'success',
                      title: 'Added to posting queue',
                      message: `Queued for ${platformLabel[platform] ?? platform} at $${finalPrice.toFixed(2)}.`,
                      duration: 4000,
                    });
                  } catch (err) {
                    console.error('Failed to add to posting queue', err);
                    showToast({
                      type: 'error',
                      title: 'Could not queue listing',
                      message:
                        err instanceof Error
                          ? err.message
                          : 'Unable to add this listing to the posting queue.',
                      duration: 5000,
                    });
                  }
                }}
              />
            </div>

            {/* Resale Listing Generator — only when an opportunity has progressed past identification */}
            {listing.opportunity &&
              ['PURCHASED', 'LISTED', 'SOLD'].includes(listing.opportunity.status) && (
                <div className="mb-6">
                  <ResaleContentEditor
                    listingId={listing.id}
                    initialPlatform="ebay"
                    onSave={async (title, description, platform) => {
                      const platformMap: Record<string, string> = {
                        ebay: 'EBAY',
                        mercari: 'MERCARI',
                        facebook: 'FACEBOOK_MARKETPLACE',
                        offerup: 'OFFERUP',
                        craigslist: 'CRAIGSLIST',
                      };
                      try {
                        await fetch('/api/posting-queue', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            listingId: listing.id,
                            targetPlatform: platformMap[platform] ?? 'EBAY',
                            title,
                            description,
                          }),
                        });
                      } catch (err) {
                        console.error('Failed to add to posting queue', err);
                      }
                    }}
                  />
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

            {/* Story 12.1: Meeting scheduling */}
            {listing.opportunity && !['SOLD', 'PASSED'].includes(listing.opportunity.status) && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Meeting
                </h2>

                {listing.opportunity.meetingTime ? (
                  <>
                    <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300 mb-4">
                      <p>
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(listing.opportunity.meetingTime).toLocaleString()}
                      </p>
                      {listing.opportunity.meetingLocation && (
                        <p>
                          <span className="font-medium">Location:</span>{' '}
                          {listing.opportunity.meetingLocation}
                        </p>
                      )}
                      {listing.opportunity.meetingType && (
                        <p>
                          <span className="font-medium">Type:</span>{' '}
                          {listing.opportunity.meetingType === 'sell' ? 'Sell' : 'Buy'}
                        </p>
                      )}
                    </div>
                    {/* Story 12.2: Driving route card — only when meetingLocation is set */}
                    {listing.opportunity.meetingLocation && (
                      <div className="mb-4">
                        <MeetingRouteCard opportunityId={listing.opportunity.id} meetingLocation={listing.opportunity.meetingLocation} />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowMeetingModal(true)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Cancel this meeting?')) return;
                          setCancellingMeeting(true);
                          try {
                            const res = await fetch(
                              `/api/opportunities/${listing.opportunity!.id}/meeting`,
                              { method: 'DELETE' }
                            );
                            if (res.ok) {
                              setListing((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      opportunity: prev.opportunity
                                        ? {
                                            ...prev.opportunity,
                                            meetingTime: null,
                                            meetingLocation: null,
                                            meetingType: null,
                                            calendarEventId: null,
                                          }
                                        : null,
                                    }
                                  : prev
                              );
                              showToast({ type: 'info', title: 'Cancelled', message: 'Meeting cancelled.' });
                            } else {
                              showToast({ type: 'error', title: 'Error', message: 'Failed to cancel meeting.' });
                            }
                          } catch {
                            showToast({ type: 'error', title: 'Error', message: 'Failed to cancel meeting.' });
                          } finally {
                            setCancellingMeeting(false);
                          }
                        }}
                        disabled={cancellingMeeting}
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {cancellingMeeting ? 'Cancelling…' : 'Cancel meeting'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowMeetingModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Schedule Meeting
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Meeting Modal */}
    {showMeetingModal && listing.opportunity && (
      <MeetingModal
        opportunityId={listing.opportunity.id}
        opportunityStatus={listing.opportunity.status}
        initialMeeting={
          listing.opportunity.meetingTime
            ? {
                meetingTime: listing.opportunity.meetingTime,
                meetingLocation: listing.opportunity.meetingLocation,
                meetingType: listing.opportunity.meetingType,
                calendarEventId: listing.opportunity.calendarEventId,
              }
            : null
        }
        onClose={() => setShowMeetingModal(false)}
        onSaved={(meeting) => {
          setListing((prev) =>
            prev
              ? {
                  ...prev,
                  opportunity: prev.opportunity
                    ? { ...prev.opportunity, ...meeting }
                    : null,
                }
              : prev
          );
        }}
      />
    )}
    </>
  );
}
