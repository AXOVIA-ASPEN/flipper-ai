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
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
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

// Helper to parse imageUrls JSON and get array of URLs
function parseImageUrls(imageUrls: string | null): string[] {
  if (!imageUrls) return [];
  try {
    const parsed = JSON.parse(imageUrls);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Image gallery modal state type
interface ImageModalState {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  title: string;
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
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isOpen: false,
    images: [],
    currentIndex: 0,
    title: "",
  });

  const openImageModal = (listing: Listing) => {
    const images = parseImageUrls(listing.imageUrls);
    if (images.length > 0) {
      setImageModal({
        isOpen: true,
        images,
        currentIndex: 0,
        title: listing.title,
      });
    }
  };

  const closeImageModal = () => {
    setImageModal((prev) => ({ ...prev, isOpen: false }));
  };

  const nextImage = () => {
    setImageModal((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }));
  };

  const prevImage = () => {
    setImageModal((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
    }));
  };

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
    if (!score) return "bg-gradient-to-r from-gray-400 to-gray-600 text-white border-gray-400 shadow-gray-500/50";
    if (score >= 80) return "bg-gradient-to-r from-green-400 to-emerald-600 text-white border-green-400 shadow-green-500/50 animate-pulse-slow";
    if (score >= 60) return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-400 shadow-yellow-500/50";
    if (score >= 40) return "bg-gradient-to-r from-orange-400 to-pink-500 text-white border-orange-400 shadow-orange-500/50";
    return "bg-gradient-to-r from-red-400 to-red-600 text-white border-red-400 shadow-red-500/50";
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toUpperCase()) {
      case "CRAIGSLIST":
        return "bg-gradient-to-r from-purple-400 to-purple-600 text-white border-purple-400 shadow-purple-500/50";
      case "FACEBOOK_MARKETPLACE":
        return "bg-gradient-to-r from-blue-400 to-blue-600 text-white border-blue-400 shadow-blue-500/50";
      case "EBAY":
        return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-400 shadow-yellow-500/50";
      case "OFFERUP":
        return "bg-gradient-to-r from-green-400 to-emerald-600 text-white border-green-400 shadow-green-500/50";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-600 text-white border-gray-400 shadow-gray-500/50";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-theme-orb-1 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-theme-orb-2 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-theme-orb-3 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse-slow">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">Flipper.ai</h1>
                <p className="text-xs text-blue-200/70">
                  Find profitable flips
                </p>
              </div>
            </div>
            <button
              onClick={fetchListings}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200/70">Total Listings</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalListings}
                </p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-blue rounded-xl flex items-center justify-center shadow-theme-accent-blue group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200/70">Opportunities</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">{stats.opportunities}</p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-green rounded-xl flex items-center justify-center shadow-theme-accent-green group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <Star className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200/70">Potential Profit</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {formatCurrency(stats.totalPotentialProfit)}
                </p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-purple rounded-xl flex items-center justify-center shadow-theme-accent-purple group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110 animate-pulse-slow">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-200/70">Avg Value Score</p>
                <p className="text-2xl font-bold text-white">
                  {stats.avgValueScore}
                </p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-orange rounded-xl flex items-center justify-center shadow-theme-accent-orange group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-200/50" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-white placeholder-blue-200/50 transition-all duration-300 hover:bg-white/15"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-200/70" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-white transition-all duration-300 hover:bg-white/15"
              >
                <option value="all" className="bg-slate-800 text-white">All Listings</option>
                <option value="NEW" className="bg-slate-800 text-white">New</option>
                <option value="OPPORTUNITY" className="bg-slate-800 text-white">Opportunities</option>
                <option value="CONTACTED" className="bg-slate-800 text-white">Contacted</option>
                <option value="PURCHASED" className="bg-slate-800 text-white">Purchased</option>
                <option value="SOLD" className="bg-slate-800 text-white">Sold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Table */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                    Est. Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="w-12 h-12 mx-auto border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                      <p className="mt-4 text-blue-200/70 animate-pulse">Loading listings...</p>
                    </td>
                  </tr>
                ) : filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 animate-pulse-slow">
                          <Package className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-blue-200/70">
                          No listings found. Run a scraper to find deals!
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr
                      key={listing.id}
                      className="hover:bg-white/5 transition-all duration-300"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Product Thumbnail */}
                          {(() => {
                            const images = parseImageUrls(listing.imageUrls);
                            return images.length > 0 ? (
                              <button
                                onClick={() => openImageModal(listing)}
                                className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/20 hover:border-blue-400/50 transition-all duration-300 group ring-2 ring-white/10 hover:ring-blue-400/30"
                              >
                                <img
                                  src={images[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden absolute inset-0 flex items-center justify-center bg-white/10">
                                  <ImageIcon className="w-6 h-6 text-blue-200/50" />
                                </div>
                                {images.length > 1 && (
                                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                    +{images.length - 1}
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              </button>
                            ) : (
                              <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <ImageIcon className="w-6 h-6 text-blue-200/50" />
                              </div>
                            );
                          })()}
                          <div className="max-w-xs">
                            <p className="font-medium text-white truncate">
                              {listing.title}
                            </p>
                            {listing.location && (
                              <p className="text-sm text-blue-200/70">
                                {listing.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium shadow-lg ${getPlatformColor(
                            listing.platform
                          )}`}
                        >
                          {listing.platform.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {formatCurrency(listing.askingPrice)}
                      </td>
                      <td className="px-6 py-4 text-blue-200/70">
                        {listing.estimatedValue
                          ? formatCurrency(listing.estimatedValue)
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {listing.profitPotential !== null && (
                          <span
                            className={`font-bold ${
                              listing.profitPotential > 0
                                ? "bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent"
                                : "bg-gradient-to-r from-red-300 to-pink-300 bg-clip-text text-transparent"
                            }`}
                          >
                            {listing.profitPotential > 0 ? "+" : ""}
                            {formatCurrency(listing.profitPotential)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium shadow-lg ${getScoreColor(
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
                            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-110 group"
                            title="View listing"
                          >
                            <ExternalLink className="w-4 h-4 text-blue-200/70 group-hover:text-blue-300" />
                          </a>
                          {listing.status !== "OPPORTUNITY" && (
                            <button
                              onClick={() => markAsOpportunity(listing.id)}
                              className="p-2 bg-gradient-to-r from-green-400/20 to-emerald-600/20 hover:from-green-400/40 hover:to-emerald-600/40 rounded-lg transition-all duration-300 hover:scale-110 shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
                              title="Mark as opportunity"
                            >
                              <Plus className="w-4 h-4 text-green-300" />
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
        <div className="mt-8 backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/scraper"
              className="group flex items-center gap-3 p-4 backdrop-blur-sm bg-gradient-to-r from-purple-400/20 to-purple-600/20 rounded-lg hover:from-purple-400/30 hover:to-purple-600/30 transition-all duration-300 border border-purple-400/30 hover:border-purple-400/50 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">Scrape Craigslist</p>
                <p className="text-sm text-purple-200/70">Find local deals</p>
              </div>
            </a>
            <a
              href="/opportunities"
              className="group flex items-center gap-3 p-4 backdrop-blur-sm bg-gradient-to-r from-green-400/20 to-emerald-600/20 rounded-lg hover:from-green-400/30 hover:to-emerald-600/30 transition-all duration-300 border border-green-400/30 hover:border-green-400/50 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform duration-300">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">View Opportunities</p>
                <p className="text-sm text-green-200/70">Track your flips</p>
              </div>
            </a>
            <a
              href="/settings"
              className="group flex items-center gap-3 p-4 backdrop-blur-sm bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-lg hover:from-blue-400/30 hover:to-blue-600/30 transition-all duration-300 border border-blue-400/30 hover:border-blue-400/50 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform duration-300">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">Search Settings</p>
                <p className="text-sm text-blue-200/70">Configure scrapers</p>
              </div>
            </a>
          </div>
        </div>
      </main>

      {/* Image Gallery Modal */}
      {imageModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeImageModal}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 p-2 text-white hover:text-red-300 transition-all duration-300 hover:scale-110 bg-white/10 rounded-lg hover:bg-red-500/20"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Title */}
            <div className="absolute -top-12 left-0 text-white text-sm truncate max-w-[80%] bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
              {imageModal.title}
            </div>

            {/* Main image */}
            <div className="relative backdrop-blur-xl bg-white/10 rounded-xl overflow-hidden border border-white/20 shadow-2xl">
              <img
                src={imageModal.images[imageModal.currentIndex]}
                alt={`${imageModal.title} - Image ${imageModal.currentIndex + 1}`}
                className="w-full max-h-[80vh] object-contain"
              />

              {/* Navigation arrows */}
              {imageModal.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-3 backdrop-blur-xl bg-white/20 hover:bg-white/30 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border border-white/20"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 backdrop-blur-xl bg-white/20 hover:bg-white/30 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border border-white/20"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image counter */}
              {imageModal.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 backdrop-blur-xl bg-white/20 text-white text-sm px-4 py-2 rounded-full border border-white/20 shadow-lg">
                  {imageModal.currentIndex + 1} / {imageModal.images.length}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {imageModal.images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2">
                {imageModal.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setImageModal((prev) => ({ ...prev, currentIndex: index }))}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      index === imageModal.currentIndex
                        ? "border-blue-400 shadow-lg shadow-blue-500/50 scale-110"
                        : "border-white/20 hover:border-blue-400/50 hover:scale-105"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
