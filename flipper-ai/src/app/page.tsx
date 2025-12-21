"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Search,
  RefreshCw,
  ExternalLink,
  Star,
  Filter,
  Plus,
} from "lucide-react";

interface Listing {
  id: string;
  platform: string;
  title: string;
  askingPrice: number;
  estimatedValue: number | null;
  profitPotential: number | null;
  valueScore: number | null;
  status: string;
  location: string | null;
  url: string;
  scrapedAt: string;
  imageUrls: string | null;
}

interface Stats {
  totalListings: number;
  opportunities: number;
  totalPotentialProfit: number;
  avgValueScore: number;
}

export default function Dashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalListings: 0,
    opportunities: 0,
    totalPotentialProfit: 0,
    avgValueScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchListings();
  }, [filter]);

  async function fetchListings() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const response = await fetch(`/api/listings?${params}`);
      const data = await response.json();

      setListings(data.listings || []);

      // Calculate stats
      const allListings = data.listings || [];
      const opps = allListings.filter(
        (l: Listing) => l.status === "OPPORTUNITY" || (l.valueScore && l.valueScore >= 70)
      );
      const totalProfit = allListings.reduce(
        (sum: number, l: Listing) => sum + (l.profitPotential || 0),
        0
      );
      const avgScore =
        allListings.length > 0
          ? allListings.reduce((sum: number, l: Listing) => sum + (l.valueScore || 0), 0) /
            allListings.length
          : 0;

      setStats({
        totalListings: data.total || 0,
        opportunities: opps.length,
        totalPotentialProfit: totalProfit,
        avgValueScore: Math.round(avgScore),
      });
    } catch (error) {
      console.error("Failed to fetch listings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsOpportunity(listingId: string) {
    try {
      await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      fetchListings();
    } catch (error) {
      console.error("Failed to create opportunity:", error);
    }
  }

  const filteredListings = listings.filter((listing) =>
    listing.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-600";
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    if (score >= 40) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toUpperCase()) {
      case "CRAIGSLIST":
        return "bg-purple-100 text-purple-700";
      case "FACEBOOK_MARKETPLACE":
        return "bg-blue-100 text-blue-700";
      case "EBAY":
        return "bg-yellow-100 text-yellow-700";
      case "OFFERUP":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">Flipper.ai</h1>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Find profitable flips
                </p>
              </div>
            </div>
            <button
              onClick={fetchListings}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Listings</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {stats.totalListings}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Opportunities</p>
                <p className="text-2xl font-bold text-green-600">{stats.opportunities}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Potential Profit</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {formatCurrency(stats.totalPotentialProfit)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Avg Value Score</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {stats.avgValueScore}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-[var(--muted-foreground)]" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              >
                <option value="all">All Listings</option>
                <option value="NEW">New</option>
                <option value="OPPORTUNITY">Opportunities</option>
                <option value="CONTACTED">Contacted</option>
                <option value="PURCHASED">Purchased</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--secondary)]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Est. Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[var(--muted-foreground)]" />
                      <p className="mt-2 text-[var(--muted-foreground)]">Loading listings...</p>
                    </td>
                  </tr>
                ) : filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-[var(--muted-foreground)] opacity-50" />
                      <p className="mt-2 text-[var(--muted-foreground)]">
                        No listings found. Run a scraper to find deals!
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr
                      key={listing.id}
                      className="hover:bg-[var(--secondary)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-[var(--foreground)] truncate">
                            {listing.title}
                          </p>
                          {listing.location && (
                            <p className="text-sm text-[var(--muted-foreground)]">
                              {listing.location}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(
                            listing.platform
                          )}`}
                        >
                          {listing.platform.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                        {formatCurrency(listing.askingPrice)}
                      </td>
                      <td className="px-6 py-4 text-[var(--muted-foreground)]">
                        {listing.estimatedValue
                          ? formatCurrency(listing.estimatedValue)
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {listing.profitPotential !== null && (
                          <span
                            className={`font-medium ${
                              listing.profitPotential > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {listing.profitPotential > 0 ? "+" : ""}
                            {formatCurrency(listing.profitPotential)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(
                            listing.valueScore
                          )}`}
                        >
                          {listing.valueScore ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                            title="View listing"
                          >
                            <ExternalLink className="w-4 h-4 text-[var(--muted-foreground)]" />
                          </a>
                          {listing.status !== "OPPORTUNITY" && (
                            <button
                              onClick={() => markAsOpportunity(listing.id)}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                              title="Mark as opportunity"
                            >
                              <Plus className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/api/scraper/craigslist"
              className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="font-medium text-purple-900">Scrape Craigslist</p>
                <p className="text-sm text-purple-700">Find local deals</p>
              </div>
            </a>
            <a
              href="/opportunities"
              className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="font-medium text-green-900">View Opportunities</p>
                <p className="text-sm text-green-700">Track your flips</p>
              </div>
            </a>
            <a
              href="/settings"
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Search Settings</p>
                <p className="text-sm text-blue-700">Configure scrapers</p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
