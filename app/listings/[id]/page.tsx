/**
 * @file app/listings/[id]/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.1
 * @brief Listing detail page — canonical glassmorphism rebuild.
 *
 * @description
 * Renders a full listing view with primary/gallery images, price grid,
 * AI analysis, comparable sales, price calculator, resale content editor,
 * opportunity status, and meeting scheduling. Story 14.7 migration:
 * body surfaces moved to `.fp-glass` / `.fp-glass-sm`; loading/error/
 * empty states consume Story 14.3 shared components; 404 responses
 * route to `<EmptyState>` (terminal, no retry CTA), 5xx/network errors
 * route to `<ErrorBanner>` (transient, retry valid) per ADR-14.7-split.
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
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
import { LoadingSkeleton, ErrorBanner, EmptyState } from '@/components/ui';

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
    <Suspense fallback={<div style={{ minHeight: '100vh', padding: '32px 24px', color: '#94a3b8' }}>Loading listing...</div>}>
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
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [staleAnalysis, setStaleAnalysis] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(false);

  const fetchListing = useCallback(async (listingId: string) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const response = await fetch(`/api/listings/${listingId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorStatus(response.status);
        throw new Error(data?.error?.detail || 'Failed to fetch listing');
      }
      const data = await response.json();
      setListing(data.listing);
      setStaleAnalysis(data.staleAnalysis === true);
    } catch (err) {
      console.error('Failed to fetch listing:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchListing(id);
  }, [id, fetchListing]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  // 404 → EmptyState (terminal — retry would only amplify confusion)
  if (errorStatus === 404 || (!error && !listing)) {
    return (
      <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
        <EmptyState
          title="Listing not found"
          message="This listing may have been removed or the link is incorrect."
          action={{ label: 'Back to Dashboard', href: '/dashboard', variant: 'ghost' }}
        />
      </div>
    );
  }

  // 5xx / network / other errors → ErrorBanner with working retry
  if (error) {
    return (
      <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
        <ErrorBanner
          message={error}
          onRetry={() => {
            if (id) fetchListing(id);
          }}
          retryLabel="Reload"
        />
        <div style={{ marginTop: 16 }}>
          <Link
            href="/dashboard"
            style={{ color: '#c4b5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!listing) {
    // Defensive — should not reach here because of the !listing branch above.
    return null;
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
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1024, margin: '0 auto' }}>
        {/* Back link */}
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/dashboard"
            style={{ color: '#c4b5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14 }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="fp-glass" style={{ overflow: 'hidden' }}>
          {/* Primary image */}
          {primaryImageUrl && (
            <div style={{ height: 288, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
              <img
                src={primaryImageUrl}
                alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Additional images */}
          {allImageUrls.length > 1 && (
            <div
              className="flex gap-2 p-4 overflow-x-auto"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              {allImageUrls.slice(1).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${listing.title} image ${i + 2}`}
                  style={{ height: 80, width: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
              ))}
            </div>
          )}

          <div style={{ padding: 24 }}>
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="fp-badge fp-badge-purple">{listing.platform}</span>
                  <span className="fp-badge fp-badge-gray">{listing.status}</span>
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0' }}>{listing.title}</h1>
                {listing.location && (
                  <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>📍 {listing.location}</p>
                )}
              </div>
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="fp-btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
              >
                View on Marketplace <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Price grid — .fp-glass-sm tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="fp-glass-sm p-4">
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Asking Price</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>${listing.askingPrice}</div>
              </div>
              <div className="fp-glass-sm p-4">
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  {listing.verifiedMarketValue !== null ? 'Verified Value' : 'Est. Value'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                  ${listing.verifiedMarketValue ?? listing.estimatedValue ?? '—'}
                </div>
              </div>
              <div className="fp-glass-sm p-4">
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Profit Potential</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#34d399' }}>
                  {listing.profitPotential !== null ? `$${listing.profitPotential}` : '—'}
                </div>
              </div>
              <div className="fp-glass-sm p-4">
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Value Score</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                  {listing.valueScore !== null ? `${listing.valueScore}/100` : '—'}
                </div>
              </div>
            </div>

            {/* Story 13.3: Stale analysis banner */}
            {staleAnalysis && (
              <div
                className="fp-alert-warn mb-4"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                data-testid="stale-analysis-banner"
              >
                <svg
                  style={{ width: 20, height: 20, color: '#fbbf24', flexShrink: 0 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span style={{ fontSize: 13, color: '#fcd34d' }}>
                  Analysis may be outdated — the asking price has changed since the last AI analysis. A fresh analysis is being generated.
                </span>
              </div>
            )}

            {/* AI analysis */}
            {(listing.identifiedBrand ||
              listing.identifiedModel ||
              listing.identifiedCondition ||
              listing.resaleStrategy) && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
                  AI Analysis
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {listing.identifiedBrand && (
                    <div className="fp-glass-sm p-3">
                      <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, display: 'block', marginBottom: 4 }}>Brand</span>
                      <span style={{ color: '#e2e8f0' }}>{listing.identifiedBrand}</span>
                    </div>
                  )}
                  {listing.identifiedModel && (
                    <div className="fp-glass-sm p-3">
                      <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, display: 'block', marginBottom: 4 }}>Model</span>
                      <span style={{ color: '#e2e8f0' }}>{listing.identifiedModel}</span>
                    </div>
                  )}
                  {listing.identifiedCondition && (
                    <div className="fp-glass-sm p-3">
                      <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, display: 'block', marginBottom: 4 }}>Condition</span>
                      <span style={{ color: '#e2e8f0' }}>{listing.identifiedCondition}</span>
                    </div>
                  )}
                  {listing.demandLevel && (
                    <div className="fp-glass-sm p-3">
                      <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, display: 'block', marginBottom: 4 }}>Demand Level</span>
                      <span style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{listing.demandLevel}</span>
                    </div>
                  )}
                </div>
                {listing.resaleStrategy && (
                  <div className="fp-glass-sm p-3" style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 600, display: 'block', marginBottom: 4 }}>Resale Strategy</span>
                    <p style={{ color: '#e2e8f0', fontSize: 14 }}>{listing.resaleStrategy}</p>
                  </div>
                )}
              </div>
            )}

            {/* Price & List — optimal pricing calculator (Story 9.2) */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
                Price & List
              </h2>
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

            {/* Resale Listing Generator — only when opportunity has progressed past identification */}
            {listing.opportunity &&
              ['PURCHASED', 'LISTED', 'SOLD'].includes(listing.opportunity.status) && (
                <div style={{ marginBottom: 24 }}>
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
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>Description</h2>
                <p style={{ color: '#e2e8f0', whiteSpace: 'pre-line', fontSize: 14 }}>{listing.description}</p>
              </div>
            )}

            {/* Comparable sales */}
            {comparableSales.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>Comparable Sales</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {(comparableSales as Array<Record<string, unknown>>).map((sale, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center"
                      style={{
                        padding: 12,
                        borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span style={{ color: '#e2e8f0', fontSize: 14 }}>
                        {String(sale.title ?? sale.name ?? `Sale ${i + 1}`)}
                      </span>
                      {sale.price !== undefined && (
                        <span style={{ fontWeight: 600, color: '#34d399' }}>${String(sale.price)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunity link */}
            {listing.opportunity && (
              <div
                className="fp-glass p-4 mb-6 flex items-center justify-between"
                style={{ background: 'rgba(124,58,237,0.08)' }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, marginBottom: 4 }}>
                    Opportunity Status
                  </div>
                  <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{listing.opportunity.status}</div>
                </div>
                <Link
                  href="/opportunities"
                  className="fp-btn-primary"
                  style={{ fontSize: 14 }}
                >
                  View Opportunities →
                </Link>
              </div>
            )}

            {/* Story 12.1: Meeting scheduling */}
            {listing.opportunity && !['SOLD', 'PASSED'].includes(listing.opportunity.status) && (
              <div className="fp-glass p-4 mb-6">
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
                  Meeting
                </h2>

                {listing.opportunity.meetingTime ? (
                  <>
                    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: '#e2e8f0' }}>
                      <p>
                        <span style={{ fontWeight: 500 }}>Date:</span>{' '}
                        {new Date(listing.opportunity.meetingTime).toLocaleString()}
                      </p>
                      {listing.opportunity.meetingLocation && (
                        <p>
                          <span style={{ fontWeight: 500 }}>Location:</span>{' '}
                          {listing.opportunity.meetingLocation}
                        </p>
                      )}
                      {listing.opportunity.meetingType && (
                        <p>
                          <span style={{ fontWeight: 500 }}>Type:</span>{' '}
                          {listing.opportunity.meetingType === 'sell' ? 'Sell' : 'Buy'}
                        </p>
                      )}
                    </div>
                    {listing.opportunity.meetingLocation && (
                      <div style={{ marginBottom: 16 }}>
                        <MeetingRouteCard
                          opportunityId={listing.opportunity.id}
                          meetingLocation={listing.opportunity.meetingLocation}
                        />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowMeetingModal(true)}
                        className="fp-btn-ghost"
                        style={{ fontSize: 14 }}
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
                        className="fp-btn-ghost"
                        style={{ fontSize: 14, color: '#f87171', opacity: cancellingMeeting ? 0.5 : 1 }}
                      >
                        {cancellingMeeting ? 'Cancelling…' : 'Cancel meeting'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowMeetingModal(true)}
                    className="fp-btn-primary"
                    style={{ fontSize: 14 }}
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
