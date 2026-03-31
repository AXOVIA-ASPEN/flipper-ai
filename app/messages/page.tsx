/**
 * @file app/messages/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Thread-based message inbox page.
 *
 * @description
 * Displays conversation threads grouped by listing. Each thread shows
 * the listing details, last message preview, unread count, and timestamp.
 * Supports All/Inbox/Sent tab filtering, search, and pagination. Threads
 * are ordered by most recently active first. Includes dark mode support
 * and responsive layout.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useRouter } from 'next/navigation';
import ThreadItem from '@/components/messages/ThreadItem';

interface ThreadListing {
  id: string;
  title: string;
  platform: string;
  askingPrice: number;
  imageUrls: string | null;
}

interface ThreadSummary {
  listingId: string;
  listing: ThreadListing | null;
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

type TabType = 'all' | 'inbox' | 'sent';

export default function MessagesPage() {
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const res = await fetch(`/api/messages/threads?${params}`);
      if (!res.ok) throw new Error('Failed to fetch threads');
      const json = await res.json();
      setThreads(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch {
      setError('Failed to load message threads. Please try again.');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }
    if (!authLoading && firebaseUser) {
      fetchThreads();
    }
  }, [authLoading, firebaseUser, router, fetchThreads]);

  // Re-fetch on focus (poll-on-focus for AC4 thread reordering)
  useEffect(() => {
    const handleFocus = () => {
      if (firebaseUser) fetchThreads();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [firebaseUser, fetchThreads]);

  useEffect(() => {
    setOffset(0);
  }, [tab, search]);

  // Filter threads by tab (client-side since threads endpoint returns all)
  const filteredThreads = threads.filter((t) => {
    if (tab === 'inbox') return t.lastMessage.direction === 'INBOUND';
    if (tab === 'sent') return t.lastMessage.direction === 'OUTBOUND';
    return true;
  });

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} conversation{total !== 1 ? 's' : ''}
            {totalUnread > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                ({totalUnread} unread)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
          <button
            onClick={fetchThreads}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'all' as TabType, label: 'All' },
          { key: 'inbox' as TabType, label: 'Inbox' },
          { key: 'sent' as TabType, label: 'Sent' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by listing title or seller name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {search ? 'No matching threads' : 'No messages yet'}
          </h3>
          <p className="text-gray-400 dark:text-gray-500 mb-6 max-w-sm mx-auto">
            {search
              ? 'Try a different search term.'
              : 'When you contact sellers about listings, your conversation threads will appear here.'}
          </p>
          {!search && (
            <a
              href="/opportunities"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Browse Opportunities
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredThreads.map((thread) => (
            <ThreadItem
              key={thread.listingId}
              listingId={thread.listingId}
              listing={thread.listing}
              lastMessage={thread.lastMessage}
              sellerName={thread.sellerName}
              messageCount={thread.messageCount}
              unreadCount={thread.unreadCount}
              lastMessageAt={thread.lastMessageAt}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            &larr; Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {offset + 1}&ndash;{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
