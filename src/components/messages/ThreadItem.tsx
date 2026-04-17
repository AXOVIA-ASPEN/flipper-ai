/**
 * @file src/components/messages/ThreadItem.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.1
 * @brief Single conversation thread row for the message inbox.
 *
 * @description
 * Renders a thread summary showing listing thumbnail, seller name,
 * last message preview, relative timestamp, unread badge, and message
 * count. Uses Next.js Link for keyboard accessibility. Story 14.7
 * migration: wrapper uses `.fp-glass-sm` with purple accent on hover,
 * unread state uses canonical purple dot/badge, legacy light/dark
 * prefixes removed.
 */

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { PLATFORM_COLORS, getImageUrl } from './utils';

interface ThreadItemProps {
  listingId: string;
  listing: {
    id: string;
    title: string;
    platform: string;
    askingPrice: number;
    imageUrls: string | null;
  } | null;
  lastMessage: {
    body: string;
    direction: 'INBOUND' | 'OUTBOUND';
    status: string;
    createdAt: string;
  };
  sellerName: string | null;
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string;
}

export default function ThreadItem({
  listingId,
  listing,
  lastMessage,
  sellerName,
  messageCount,
  unreadCount,
  lastMessageAt,
}: ThreadItemProps) {
  const imageUrl = listing ? getImageUrl(listing.imageUrls) : null;
  const isUnread = unreadCount > 0;

  return (
    <Link
      href={`/messages/${listingId}`}
      className="fp-glass-sm block rounded-lg p-4 transition-colors"
      style={{ textDecoration: 'none' }}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Listing thumbnail */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={listing?.title || 'Listing'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-lg"
              style={{ color: '#64748b' }}
            >
              {listing ? '📦' : '🚫'}
            </div>
          )}
        </div>

        {/* Thread content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Title + platform badge */}
              <div className="flex items-center gap-2 mb-0.5">
                <h3
                  className="text-sm truncate"
                  style={{
                    color: '#e2e8f0',
                    fontWeight: isUnread ? 700 : 500,
                  }}
                >
                  {listing?.title || 'Listing removed'}
                </h3>
                {listing && (
                  <span
                    className={
                      PLATFORM_COLORS[listing.platform] || 'fp-badge fp-badge-gray'
                    }
                  >
                    {listing.platform}
                  </span>
                )}
              </div>

              {/* Seller name + price */}
              <div
                className="flex items-center gap-2 text-xs mb-1"
                style={{ color: '#94a3b8' }}
              >
                {sellerName && <span>{sellerName}</span>}
                {sellerName && listing && <span>·</span>}
                {listing && <span>${listing.askingPrice.toLocaleString()}</span>}
              </div>

              {/* Last message preview */}
              <p
                className="text-sm truncate"
                style={{ color: isUnread ? '#e2e8f0' : '#94a3b8' }}
              >
                {lastMessage.direction === 'OUTBOUND' && (
                  <span style={{ color: '#64748b' }}>You: </span>
                )}
                {lastMessage.body}
              </p>
            </div>

            {/* Right side: timestamp + badges */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className="text-xs whitespace-nowrap"
                style={{ color: '#64748b' }}
              >
                {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })}
              </span>
              <div className="flex items-center gap-1.5">
                {isUnread && (
                  <span
                    className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full"
                    style={{ background: '#8b5cf6', color: '#ffffff' }}
                    aria-label={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
                  >
                    {unreadCount}
                  </span>
                )}
                <span className="text-xs" style={{ color: '#64748b' }}>
                  {messageCount} msg{messageCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
