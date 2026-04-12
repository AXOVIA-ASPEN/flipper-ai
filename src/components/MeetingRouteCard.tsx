/**
 * @file src/components/MeetingRouteCard.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Client Component displaying driving route, departure time, and Maps deep link for a scheduled meetup.
 *
 * @description
 * Renders driving route information from UserSettings.homeLocation to opportunity.meetingLocation.
 * Fetches from GET /api/opportunities/[id]/maps-route and renders based on response state:
 *
 *  - ok                  → Travel time, distance, departure recommendation, "Open in Maps" button
 *  - degraded            → Address text, "View on Maps" link, no route data (AC-5)
 *  - missing_home_location → Inline nudge with link to Settings page (AC-6)
 *  - past_meeting        → "This meeting has passed" (AC-2)
 *  - loading             → Skeleton card
 *  - error               → Fallback link to Google Maps search
 *
 * Google Maps attribution ("Route data ©Google Maps") is required by Google Maps ToS §3.2.
 * Platform-aware deep linking: iOS uses comgooglemaps://, Android uses google.navigation:,
 * desktop uses the web URL.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Navigation, ExternalLink } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteResult {
  durationSeconds: number;
  distanceMeters: number;
  durationText: string;
  distanceText: string;
  deepLinkUrl: string;
  mapsSearchUrl: string;
}

interface MapsRouteData {
  state: 'ok' | 'past_meeting' | 'missing_home_location' | 'degraded';
  route?: RouteResult;
  departureTime?: string;       // ISO 8601
  departureIsPast?: boolean;
  deepLinkUrl?: string;
  mapsSearchUrl: string;
  location: string;
  listingTitle: string;
}

interface MeetingRouteCardProps {
  opportunityId: string;
  /** meetingLocation is passed as a prop so the error fallback can build a valid Maps search URL */
  meetingLocation?: string;
}

// ---------------------------------------------------------------------------
// Platform-aware deep link handler (AC-4)
// ---------------------------------------------------------------------------

function openMaps(deepLinkUrl: string, meetingLocation: string): void {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  if (isIOS) {
    window.location.href = `comgooglemaps://?daddr=${encodeURIComponent(meetingLocation)}&directionsmode=driving`;
    // Fallback to web URL if Google Maps app is not installed
    setTimeout(() => window.open(deepLinkUrl, '_blank', 'noopener,noreferrer'), 500);
  } else if (isAndroid) {
    window.location.href = `google.navigation:q=${encodeURIComponent(meetingLocation)}`;
    setTimeout(() => window.open(deepLinkUrl, '_blank', 'noopener,noreferrer'), 500);
  } else {
    window.open(deepLinkUrl, '_blank', 'noopener,noreferrer');
  }
}

// ---------------------------------------------------------------------------
// Departure time formatting helpers
// ---------------------------------------------------------------------------

function formatLocalTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(isoString));
}

function minutesLate(departureIso: string): number {
  return Math.floor((Date.now() - new Date(departureIso).getTime()) / 60000);
}

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

function RouteCardSkeleton(): React.JSX.Element {
  return (
    <div className="border border-gray-200 rounded-lg p-4 animate-pulse" data-testid="route-card-skeleton">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MeetingRouteCard({ opportunityId, meetingLocation }: MeetingRouteCardProps): React.JSX.Element {
  const [data, setData] = useState<MapsRouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/opportunities/${opportunityId}/maps-route`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (!cancelled) setData(body.data as MapsRouteData);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  // Loading state
  if (loading) return <RouteCardSkeleton />;

  // Fetch error fallback
  if (error || !data) {
    const fallbackSearchUrl = meetingLocation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingLocation)}`
      : 'https://www.google.com/maps';
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50" data-testid="route-card-error">
        <p className="text-sm text-gray-600">
          Could not load route.{' '}
          <a
            href={fallbackSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            View location on Google Maps
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    );
  }

  // Past meeting (AC-2)
  if (data.state === 'past_meeting') {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50" data-testid="route-card-past">
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">This meeting has passed</span>
        </div>
        {data.location && (
          <p className="mt-2 text-sm text-gray-500">{data.location}</p>
        )}
      </div>
    );
  }

  // Missing home location nudge (AC-6)
  if (data.state === 'missing_home_location') {
    return (
      <div className="border border-amber-200 rounded-lg p-4 bg-amber-50" data-testid="route-card-no-home">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Set your home location in{' '}
            <Link href="/settings" className="font-medium text-amber-900 underline">
              Settings
            </Link>{' '}
            to get driving directions and departure alerts
          </p>
        </div>
      </div>
    );
  }

  // Degraded state — no API key or no route found (AC-5)
  if (data.state === 'degraded') {
    return (
      <div className="border border-gray-200 rounded-lg p-4" data-testid="route-card-degraded">
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">Meeting location</p>
            <p className="text-sm text-gray-600 mt-1">{data.location}</p>
          </div>
        </div>
        <a
          href={data.mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          data-testid="view-on-maps-link"
        >
          View on Maps
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  // Full route state (AC-1, AC-2, AC-4)
  const dept = data.departureTime;
  const lateMinutes = dept && data.departureIsPast ? minutesLate(dept) : 0;

  return (
    <div className="border border-blue-100 rounded-lg p-4 bg-blue-50" data-testid="route-card-ok">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Route to meetup</span>
        </div>
        <span className="text-xs text-gray-500">Route from your saved home location</span>
      </div>

      {/* Route stats */}
      {data.route && (
        <div className="flex gap-6 mb-3">
          <div>
            <p className="text-xs text-gray-500">Travel time</p>
            <p className="text-base font-bold text-gray-900">{data.route.durationText}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Distance</p>
            <p className="text-base font-bold text-gray-900">{data.route.distanceText}</p>
          </div>
        </div>
      )}

      {/* Departure recommendation */}
      {dept && (
        <div className={`rounded p-2 mb-3 text-sm ${data.departureIsPast ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-white text-gray-800 border border-gray-200'}`}>
          {data.departureIsPast ? (
            <span>
              You should have left {lateMinutes} minute{lateMinutes !== 1 ? 's' : ''} ago —{' '}
              contact your counterparty if you&apos;re running late
            </span>
          ) : (
            <span>Leave by <strong>{formatLocalTime(dept)}</strong> to arrive on time</span>
          )}
        </div>
      )}

      {/* Traffic disclaimer (AC-2) */}
      <p className="text-xs text-gray-500 mb-3">
        Estimate based on typical traffic conditions — add extra time during peak hours.
        Driving directions shown — tap Open in Maps to switch to transit or walking.
      </p>

      {/* Open in Maps button (AC-4) */}
      {data.deepLinkUrl && data.location && (
        <button
          type="button"
          onClick={() => openMaps(data.deepLinkUrl!, data.location)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={`Open directions to ${data.location} in Google Maps`}
          data-testid="open-in-maps-btn"
        >
          <Navigation className="w-3.5 h-3.5" />
          Open in Maps
        </button>
      )}

      {/* Google Maps ToS attribution §3.2 — REQUIRED */}
      <p className="mt-3 text-xs text-gray-400">
        Route data{' '}
        <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
          ©Google Maps
        </a>
      </p>
    </div>
  );
}
