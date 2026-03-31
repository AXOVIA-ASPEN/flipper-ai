/**
 * @file src/components/messages/ThreadItem.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Single conversation thread row for the message inbox.
 *
 * @description
 * Renders a thread summary showing listing thumbnail, seller name,
 * last message preview, relative timestamp, unread badge, and message
 * count. Uses Next.js Link for keyboard accessibility. Supports dark
 * mode and responsive layout (stacks vertically on mobile).
 */

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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

function getImageUrl(imageUrls: string | null): string | null {
  if (!imageUrls) return null;
  try {
    const urls = JSON.parse(imageUrls) as string[];
    return urls[0] || null;
  } catch {
    return null;
  }
}

const PLATFORM_COLORS: Record<string, string> = {
  CRAIGSLIST: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  EBAY: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  FACEBOOK: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  MERCARI: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  OFFERUP: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

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
      className="block border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Listing thumbnail */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={listing?.title || 'Listing'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-lg">
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
                  className={`text-sm truncate ${
                    isUnread
                      ? 'font-bold text-gray-900 dark:text-gray-100'
                      : 'font-medium text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {listing?.title || 'Listing removed'}
                </h3>
                {listing && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      PLATFORM_COLORS[listing.platform] ||
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {listing.platform}
                  </span>
                )}
              </div>

              {/* Seller name + price */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                {sellerName && <span>{sellerName}</span>}
                {sellerName && listing && <span>·</span>}
                {listing && <span>${listing.askingPrice.toLocaleString()}</span>}
              </div>

              {/* Last message preview */}
              <p
                className={`text-sm truncate ${
                  isUnread
                    ? 'text-gray-800 dark:text-gray-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {lastMessage.direction === 'OUTBOUND' && (
                  <span className="text-gray-400 dark:text-gray-500">You: </span>
                )}
                {lastMessage.body}
              </p>
            </div>

            {/* Right side: timestamp + badges */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })}
              </span>
              <div className="flex items-center gap-1.5">
                {isUnread && (
                  <span
                    className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full"
                    aria-label={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
                  >
                    {unreadCount}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
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
