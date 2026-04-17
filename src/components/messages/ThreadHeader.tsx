/**
 * @file src/components/messages/ThreadHeader.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Listing info banner for the thread detail view.
 *
 * @description
 * Displays the listing's image, title, price, platform badge, and seller
 * name at the top of a conversation thread. Handles null listings (deleted)
 * with a "Listing removed" placeholder. Story 14.7 migration: uses
 * `.fp-glass p-4` wrapper, canonical inline hex copy colors, legacy
 * light/dark prefixes removed.
 */

import { PLATFORM_COLORS, getImageUrl } from './utils';

interface ThreadHeaderProps {
  listing: {
    id: string;
    title: string;
    platform: string;
    askingPrice: number;
    imageUrls: string | null;
  } | null;
  sellerName: string | null;
}

export default function ThreadHeader({ listing, sellerName }: ThreadHeaderProps) {
  if (!listing) {
    return (
      <div className="fp-glass flex items-center gap-4 p-4 rounded-lg">
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          🚫
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#94a3b8' }}>
            Listing removed
          </h2>
          <p className="text-sm" style={{ color: '#64748b' }}>
            This listing is no longer available
          </p>
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(listing.imageUrls);

  return (
    <div className="fp-glass flex items-center gap-4 p-4 rounded-lg">
      <div
        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl"
            style={{ color: '#64748b' }}
          >
            📦
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <h2
            className="text-lg font-semibold truncate"
            style={{ color: '#e2e8f0' }}
          >
            {listing.title}
          </h2>
          <span
            className={PLATFORM_COLORS[listing.platform] || 'fp-badge fp-badge-gray'}
          >
            {listing.platform}
          </span>
        </div>
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: '#94a3b8' }}
        >
          <span className="font-medium">${listing.askingPrice.toLocaleString()}</span>
          {sellerName && (
            <>
              <span>·</span>
              <span>{sellerName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
