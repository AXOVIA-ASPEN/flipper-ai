"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Tag,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Package,
} from "lucide-react";
import Link from "next/link";

interface ScrapedListing {
  title: string;
  price: string;
  location: string;
  url: string;
  imageUrl?: string;
}

interface ScrapeResult {
  success: boolean;
  message: string;
  listings?: ScrapedListing[];
  savedCount?: number;
  error?: string;
}

export default function ScraperPage() {
  const [platform, setPlatform] = useState("craigslist");
  const [location, setLocation] = useState("sarasota");
  const [category, setCategory] = useState("electronics");
  const [keywords, setKeywords] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/scraper/craigslist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          category,
          keywords: keywords || undefined,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to run scraper",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "electronics", label: "Electronics" },
    { value: "furniture", label: "Furniture" },
    { value: "appliances", label: "Appliances" },
    { value: "sporting", label: "Sporting Goods" },
    { value: "tools", label: "Tools" },
    { value: "jewelry", label: "Jewelry" },
    { value: "antiques", label: "Antiques" },
    { value: "video_gaming", label: "Video Gaming" },
    { value: "music_instr", label: "Musical Instruments" },
    { value: "computers", label: "Computers" },
    { value: "cell_phones", label: "Cell Phones" },
  ];

  const locations = [
    { value: "sarasota", label: "Sarasota, FL" },
    { value: "tampa", label: "Tampa, FL" },
    { value: "orlando", label: "Orlando, FL" },
    { value: "miami", label: "Miami, FL" },
    { value: "jacksonville", label: "Jacksonville, FL" },
    { value: "sfbay", label: "San Francisco Bay Area" },
    { value: "losangeles", label: "Los Angeles, CA" },
    { value: "newyork", label: "New York, NY" },
    { value: "chicago", label: "Chicago, IL" },
    { value: "seattle", label: "Seattle, WA" },
    { value: "austin", label: "Austin, TX" },
    { value: "denver", label: "Denver, CO" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--muted-foreground)]" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                Scrape Listings
              </h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                Find deals on Craigslist
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scraper Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              >
                <option value="craigslist">Craigslist</option>
                <option value="facebook" disabled>
                  Facebook Marketplace (coming soon)
                </option>
                <option value="offerup" disabled>
                  OfferUp (coming soon)
                </option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              >
                {locations.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Keywords (optional)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., iPhone, Nintendo, Dyson"
                className="w-full px-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              />
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Min Price
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Max Price
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="1000"
                min="0"
                className="w-full px-4 py-2 bg-[var(--secondary)] rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scraping listings...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Start Scraping
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-8">
            {/* Status Message */}
            <div
              className={`p-4 rounded-xl border ${
                result.success
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{result.message}</span>
              </div>
              {result.savedCount !== undefined && (
                <p className="mt-1 text-sm">
                  {result.savedCount} listings saved to database
                </p>
              )}
              {result.error && (
                <p className="mt-1 text-sm opacity-75">{result.error}</p>
              )}
            </div>

            {/* Scraped Listings Preview */}
            {result.listings && result.listings.length > 0 && (
              <div className="mt-6 bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]">
                  <h3 className="font-semibold text-[var(--foreground)]">
                    Found {result.listings.length} Listings
                  </h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {result.listings.slice(0, 10).map((listing, index) => (
                    <div
                      key={index}
                      className="p-4 flex items-center gap-4 hover:bg-[var(--secondary)] transition-colors"
                    >
                      {listing.imageUrl ? (
                        <img
                          src={listing.imageUrl}
                          alt={listing.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-[var(--secondary)] rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-[var(--muted-foreground)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--foreground)] truncate">
                          {listing.title}
                        </p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {listing.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {listing.price}
                        </p>
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--primary)] hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                {result.listings.length > 10 && (
                  <div className="p-4 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
                    +{result.listings.length - 10} more listings saved
                  </div>
                )}
              </div>
            )}

            {/* View Dashboard Link */}
            {result.success && (
              <div className="mt-6 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--secondary)] text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] transition-colors"
                >
                  View Dashboard
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
