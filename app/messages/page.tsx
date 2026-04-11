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
import ApprovalQueue from '@/components/ApprovalQueue';

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

type TabType = 'all' | 'inbox' | 'sent' | 'approval';

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
  const [approvalCount, setApprovalCount] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [messageApprovalRequired, setMessageApprovalRequired] = useState(false);
  const limit = 20;

  // Fetch user settings for approval tab
  useEffect(() => {
    async function fetchUserSettings() {
      try {
        const res = await fetch('/api/user/settings');
        const json = await res.json();
        if (res.ok && json.success) {
          setSubscriptionTier(json.data.user?.subscriptionTier ?? null);
          setMessageApprovalRequired(json.data.messageApprovalRequired ?? false);
        }
      } catch {
        // Non-critical — defaults are safe
      }
    }
    if (!authLoading && firebaseUser) fetchUserSettings();
  }, [authLoading, firebaseUser]);

  // Fetch initial approval count for badge
  useEffect(() => {
    async function fetchApprovalCount() {
      try {
        const res = await fetch('/api/messages?status=DRAFT,PENDING_APPROVAL&direction=OUTBOUND&limit=0');
        const json = await res.json();
        if (res.ok && json.success) {
          setApprovalCount(json.pagination?.total ?? 0);
        }
      } catch {
        // Non-critical
      }
    }
    if (!authLoading && firebaseUser) fetchApprovalCount();
  }, [authLoading, firebaseUser]);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Messages</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            {tab === 'all'
              ? `${total} conversation${total !== 1 ? 's' : ''}`
              : tab === 'approval'
                ? `${approvalCount} pending approval`
                : `${filteredThreads.length} ${tab} thread${filteredThreads.length !== 1 ? 's' : ''}`}
            {totalUnread > 0 && (
              <span style={{ marginLeft: 8, color: '#8b5cf6', fontWeight: 600 }}>
                ({totalUnread} unread)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="fp-btn-ghost"
          style={{ fontSize: 13 }}
        >
          &larr; Back to Dashboard
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, background: 'rgba(248,113,113,0.08)', fontSize: 13, color: '#f87171' }}>
          {error}
          <button
            onClick={fetchThreads}
            style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {([
          { key: 'all' as TabType, label: 'All' },
          { key: 'inbox' as TabType, label: 'Inbox' },
          { key: 'sent' as TabType, label: 'Sent' },
          { key: 'approval' as TabType, label: `Approval${approvalCount > 0 ? ` (${approvalCount})` : ''}` },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: tab === t.key ? '#8b5cf6' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #8b5cf6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Approval tab content */}
      {tab === 'approval' ? (
        <ApprovalQueue
          subscriptionTier={subscriptionTier}
          messageApprovalRequired={messageApprovalRequired}
          onCountChange={setApprovalCount}
        />
      ) : (
      <>
      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by listing title or seller name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Thread list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{ height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 10, animation: 'pulse 2s ease-in-out infinite' }}
            />
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="fp-glass" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: 40 }}>💬</span>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
            {search ? 'No matching threads' : 'No messages yet'}
          </h3>
          <p style={{ color: '#64748b', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
            {search
              ? 'Try a different search term.'
              : 'When you contact sellers about listings, your conversation threads will appear here.'}
          </p>
          {!search && (
            <a
              href="/opportunities"
              className="fp-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, textDecoration: 'none' }}
            >
              Browse Opportunities
            </a>
          )}
        </div>
      ) : (
        <div className="fp-glass" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
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

      {/* Pagination — only shown on "All" tab since Inbox/Sent filter client-side */}
      {tab === 'all' && total > limit && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="fp-btn-ghost"
            style={{ fontSize: 13, opacity: offset === 0 ? 0.4 : 1 }}
          >
            &larr; Previous
          </button>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            {offset + 1}&ndash;{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="fp-btn-ghost"
            style={{ fontSize: 13, opacity: offset + limit >= total ? 0.4 : 1 }}
          >
            Next &rarr;
          </button>
        </div>
      )}
      </>
      )}
      </div>
    </div>
  );
}
