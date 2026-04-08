/**
 * @file src/components/messages/ThreadHeader.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Listing info banner for the thread detail view.
 *
 * @description
 * Displays the listing's image, title, price, platform badge, and seller
 * name at the top of a conversation thread. Handles null listings (deleted)
 * with a "Listing removed" placeholder. Supports dark mode.
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
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl">
          🚫
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            Listing removed
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            This listing is no longer available
          </p>
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(listing.imageUrls);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
            📦
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {listing.title}
          </h2>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
              PLATFORM_COLORS[listing.platform] ||
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {listing.platform}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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
