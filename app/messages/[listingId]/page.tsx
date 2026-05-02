/**
 * @file app/messages/[listingId]/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Thread detail page showing full message history for a listing.
 *
 * @description
 * Displays all messages for a specific listing conversation in chronological
 * order. Messages are styled as bubbles with direction indicators (INBOUND
 * left, OUTBOUND right). Includes listing info header, date separators
 * between different days, auto-scroll to bottom, and back navigation.
 * Supports dark mode and responsive layout.
 */

'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ThreadHeader from '@/components/messages/ThreadHeader';
import MessageBubble from '@/components/messages/MessageBubble';

interface ThreadListing {
  id: string;
  title: string;
  platform: string;
  askingPrice: number;
  imageUrls: string | null;
}

interface ThreadMessage {
  id: string;
  direction: string;
  status: string;
  subject: string | null;
  body: string;
  sellerName: string | null;
  platform: string | null;
  parentId: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ThreadData {
  listing: ThreadListing | null;
  sellerName: string | null;
  messages: ThreadMessage[];
  threadMeta: {
    messageCount: number;
    unreadCount: number;
  };
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = use(params);
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const router = useRouter();
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }
    if (!authLoading && firebaseUser) {
      fetchThread();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, firebaseUser, listingId]);

  async function fetchThread() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/threads/${listingId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('No messages found for this listing.');
        } else {
          throw new Error('Failed to fetch thread');
        }
        return;
      }
      const json = await res.json();
      setThreadData(json.data);
    } catch {
      setError('Failed to load conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    if (threadData?.messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadData]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="animate-spin rounded-full h-8 w-8"
          style={{ borderBottom: '2px solid #8b5cf6' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/messages"
        className="inline-flex items-center gap-1.5 text-sm hover:underline mb-4"
        style={{ color: '#c4b5fd' }}
      >
        <ArrowLeft size={16} />
        Back to Messages
      </Link>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <div
            className="h-20 rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`h-16 rounded-lg animate-pulse w-2/3 ${i % 2 === 0 ? '' : 'ml-auto'}`}
                style={{
                  background:
                    i % 2 === 0
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(124, 58, 237, 0.10)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="mb-4" style={{ color: '#94a3b8' }}>{error}</p>
          <button
            onClick={fetchThread}
            className="text-sm hover:underline"
            style={{ color: '#c4b5fd' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Thread content */}
      {threadData && !loading && (
        <>
          {/* Listing header */}
          <ThreadHeader
            listing={threadData.listing}
            sellerName={threadData.sellerName}
          />

          {/* Message count */}
          <div className="flex items-center justify-between mt-4 mb-3">
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              {threadData.threadMeta.messageCount} message
              {threadData.threadMeta.messageCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {threadData.messages.map((msg, idx) => {
              // Date separator logic
              const currentDate = new Date(msg.createdAt).toDateString();
              const prevDate =
                idx > 0
                  ? new Date(threadData.messages[idx - 1].createdAt).toDateString()
                  : null;
              const showDateSeparator = idx === 0 || currentDate !== prevDate;

              return (
                <div key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 my-4">
                      <div
                        className="flex-1"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: '#64748b' }}
                      >
                        {getDateLabel(msg.createdAt)}
                      </span>
                      <div
                        className="flex-1"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      />
                    </div>
                  )}
                  <MessageBubble
                    direction={msg.direction}
                    status={msg.status}
                    subject={msg.subject}
                    body={msg.body}
                    createdAt={msg.createdAt}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}
    </div>
  );
}
