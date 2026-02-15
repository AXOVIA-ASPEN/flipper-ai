"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface MessageListing {
  id: string;
  title: string;
  platform: string;
  askingPrice: number;
  imageUrls: string | null;
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  subject: string | null;
  body: string;
  sellerName: string | null;
  sellerContact: string | null;
  platform: string | null;
  parentId: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  listing: MessageListing | null;
}

type TabType = "all" | "inbox" | "outbox";
type SortField = "createdAt" | "status" | "sellerName";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  SENT: "bg-blue-200 text-blue-700",
  DELIVERED: "bg-green-200 text-green-700",
  READ: "bg-purple-200 text-purple-700",
  REPLIED: "bg-teal-200 text-teal-700",
  FAILED: "bg-red-200 text-red-700",
};

export default function MessagesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === "inbox") params.set("direction", "INBOUND");
      if (tab === "outbox") params.set("direction", "OUTBOUND");
      if (search) params.set("search", search);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`/api/messages?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setMessages(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search, sortBy, sortOrder, offset]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchMessages();
    }
  }, [authStatus, router, fetchMessages]);

  useEffect(() => {
    setOffset(0);
  }, [tab, search, sortBy, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const inboxCount = messages.filter((m) => tab === "all" ? m.direction === "INBOUND" : true).length;
  const outboxCount = messages.filter((m) => tab === "all" ? m.direction === "OUTBOUND" : true).length;

  if (authStatus === "loading") {
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
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} conversation{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {(["all", "inbox", "outbox"] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "all" ? "All" : t === "inbox" ? "Inbox" : "Sent"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Sort controls */}
      <div className="flex gap-2 mb-4 text-sm">
        <span className="text-gray-500">Sort by:</span>
        {([
          ["createdAt", "Date"],
          ["status", "Status"],
          ["sellerName", "Seller"],
        ] as [SortField, string][]).map(([field, label]) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`px-2 py-1 rounded ${
              sortBy === field
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
            {sortBy === field && (sortOrder === "asc" ? " ↑" : " ↓")}
          </button>
        ))}
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No messages yet</p>
          <p className="text-sm mt-1">
            Messages from seller conversations will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        msg.direction === "INBOUND"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {msg.direction === "INBOUND" ? "↓ Received" : "↑ Sent"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_COLORS[msg.status] || "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {msg.status}
                    </span>
                    {msg.platform && (
                      <span className="text-xs text-gray-400">
                        {msg.platform}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {msg.sellerName && (
                      <span className="font-medium text-sm">
                        {msg.sellerName}
                      </span>
                    )}
                    {msg.subject && (
                      <span className="text-sm text-gray-600">
                        — {msg.subject}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {msg.body}
                  </p>
                  {msg.listing && (
                    <div className="text-xs text-gray-400 mt-1">
                      Re: {msg.listing.title} (${msg.listing.askingPrice})
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {formatDate(msg.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-1 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
