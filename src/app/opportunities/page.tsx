"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  ShoppingCart,
  Store,
  Trophy,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  X,
  Save,
  Copy,
  Mail,
  Phone,
  Tag as TagIcon,
  MessageSquare,
  User,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Listing {
  id: string;
  title: string;
  askingPrice: number;
  estimatedValue: number | null;
  estimatedLow: number | null;
  estimatedHigh: number | null;
  discountPercent: number | null;
  profitPotential: number | null;
  valueScore: number | null;
  platform: string;
  url: string;
  location: string | null;
  imageUrls: string | null;
  condition: string | null;
  description: string | null;
  sellerName: string | null;
  sellerContact: string | null;
  comparableUrls: string | null;
  priceReasoning: string | null;
  notes: string | null;
  shippable: boolean | null;
  negotiable: boolean | null;
  tags: string | null;
  requestToBuy: string | null;
  category: string | null;
  postedAt: string | null;
  identifiedBrand: string | null;
  identifiedModel: string | null;
  identifiedVariant: string | null;
  identifiedCondition: string | null;
  verifiedMarketValue: number | null;
  marketDataSource: string | null;
  marketDataDate: string | null;
  comparableSalesJson: string | null;
  sellabilityScore: number | null;
  demandLevel: string | null;
  expectedDaysToSell: number | null;
  authenticityRisk: string | null;
  recommendedOffer: number | null;
  recommendedList: number | null;
  resaleStrategy: string | null;
  trueDiscountPercent: number | null;
  llmAnalyzed: boolean | null;
  analysisDate: string | null;
  analysisConfidence: string | null;
  analysisReasoning: string | null;
}

interface Opportunity {
  id: string;
  listingId: string;
  status: string;
  purchasePrice: number | null;
  purchaseDate: string | null;
  resalePrice: number | null;
  resalePlatform: string | null;
  resaleUrl: string | null;
  resaleDate: string | null;
  actualProfit: number | null;
  fees: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  listing: Listing;
}

interface Stats {
  totalOpportunities: number;
  totalProfit: number;
  totalInvested: number;
  totalRevenue: number;
}

interface ComparableReference {
  platform: string;
  label: string;
  url: string;
  type: string;
}

interface ComparableSale {
  title: string;
  price: number | null;
  url: string | null;
  soldAt: string | null;
}

function safeParseArray(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStringArray(value: string | null): string[] {
  return safeParseArray(value).filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

function parseComparableReferences(value: string | null): ComparableReference[] {
  return safeParseArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const ref = item as Record<string, unknown>;
      if (typeof ref.url !== "string" || !ref.url) return null;
      return {
        platform:
          typeof ref.platform === "string" && ref.platform.length > 0
            ? ref.platform
            : "Comparable",
        label:
          typeof ref.label === "string" && ref.label.length > 0
            ? ref.label
            : typeof ref.platform === "string"
            ? ref.platform
            : "Comparable",
        url: ref.url,
        type:
          typeof ref.type === "string" && ref.type.length > 0
            ? ref.type
            : "search",
      };
    })
    .filter((item): item is ComparableReference => Boolean(item));
}

function formatBooleanValue(
  value: boolean | null | undefined,
  trueLabel = "Yes",
  falseLabel = "No"
) {
  if (value === null || value === undefined) return "Unknown";
  return value ? trueLabel : falseLabel;
}

function formatRelativeDate(value: string | null) {
  if (!value) return "—";
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "—";
  }
}

function parseComparableSales(value: string | null): ComparableSale[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        return {
          title: typeof record.title === "string" ? record.title : "Comparable Sale",
          price: typeof record.price === "number" ? record.price : null,
          url: typeof record.url === "string" ? record.url : null,
          soldAt: typeof record.soldAt === "string" ? record.soldAt : null,
        };
      })
      .filter((item): item is ComparableSale => Boolean(item));
  } catch {
    return [];
  }
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(0)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOpportunities: 0,
    totalProfit: 0,
    totalInvested: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Opportunity>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    fetchOpportunities();
  }, [statusFilter]);

  useEffect(() => {
    if (!copiedMessageId) return;
    const timeout = setTimeout(() => setCopiedMessageId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedMessageId]);

  async function fetchOpportunities() {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/opportunities"
          : `/api/opportunities?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();

      setOpportunities(data.opportunities || []);
      setStats(data.stats || {
        totalOpportunities: 0,
        totalProfit: 0,
        totalInvested: 0,
        totalRevenue: 0,
      });
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateOpportunity(id: string, updates: Partial<Opportunity>) {
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchOpportunities();
        setEditingId(null);
        setEditForm({});
      }
    } catch (error) {
      console.error("Failed to update opportunity:", error);
    }
  }

  async function deleteOpportunity(id: string) {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;

    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchOpportunities();
      }
    } catch (error) {
      console.error("Failed to delete opportunity:", error);
    }
  }

  async function handleCopyMessage(id: string, message: string) {
    if (!message) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        setCopiedMessageId(id);
      }
    } catch (error) {
      console.error("Failed to copy request message:", error);
    }
  }

  function startEditing(opp: Opportunity) {
    setEditingId(opp.id);
    setEditForm({
      status: opp.status,
      purchasePrice: opp.purchasePrice,
      purchaseDate: opp.purchaseDate,
      resalePrice: opp.resalePrice,
      resalePlatform: opp.resalePlatform,
      resaleUrl: opp.resaleUrl,
      fees: opp.fees,
      notes: opp.notes,
    });
  }


  function cancelEditing() {
    setEditingId(null);
    setEditForm({});
  }

  function saveEditing(id: string) {
    updateOpportunity(id, editForm);
  }

  const normalizedSearch = searchTerm.toLowerCase();
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = opp.listing.title
      .toLowerCase()
      .includes(normalizedSearch);
    const matchesStatus =
      statusFilter === "all" || opp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "all", label: "All Statuses", icon: Package },
    { value: "IDENTIFIED", label: "Identified", icon: Search },
    { value: "CONTACTED", label: "Contacted", icon: Clock },
    { value: "PURCHASED", label: "Purchased", icon: ShoppingCart },
    { value: "LISTED", label: "Listed", icon: Store },
    { value: "SOLD", label: "Sold", icon: Trophy },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IDENTIFIED":
        return "bg-gradient-to-r from-blue-400 to-blue-600 text-white border-blue-400 shadow-blue-500/50";
      case "CONTACTED":
        return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-400 shadow-yellow-500/50";
      case "PURCHASED":
        return "bg-gradient-to-r from-purple-400 to-purple-600 text-white border-purple-400 shadow-purple-500/50";
      case "LISTED":
        return "bg-gradient-to-r from-orange-400 to-pink-500 text-white border-orange-400 shadow-orange-500/50";
      case "SOLD":
        return "bg-gradient-to-r from-green-400 to-emerald-600 text-white border-green-400 shadow-green-500/50 animate-pulse-slow";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-600 text-white border-gray-400 shadow-gray-500/50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "IDENTIFIED":
        return <Search className="w-4 h-4" />;
      case "CONTACTED":
        return <Clock className="w-4 h-4" />;
      case "PURCHASED":
        return <ShoppingCart className="w-4 h-4" />;
      case "LISTED":
        return <Store className="w-4 h-4" />;
      case "SOLD":
        return <Trophy className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-theme-orb-1 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-theme-orb-2 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-theme-orb-3 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header with frosted glass */}
      <header className="relative backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50 group"
            >
              <ArrowLeft className="w-5 h-5 text-white group-hover:text-purple-200 transition-colors" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/50 animate-pulse-slow">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  Opportunities
                </h1>
                <p className="text-xs text-blue-200/80">
                  Track your flips from start to finish
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards with frosted glass */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200/80 mb-1">
                  Total Opportunities
                </p>
                <p className="text-3xl font-bold text-white">
                  {stats.totalOpportunities}
                </p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-blue rounded-xl flex items-center justify-center shadow-theme-accent-blue group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200/80 mb-1">
                  Total Invested
                </p>
                <p className="text-3xl font-bold text-white">
                  ${stats.totalInvested.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-purple rounded-xl flex items-center justify-center shadow-theme-accent-purple group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-200/80 mb-1">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-white">
                  ${stats.totalRevenue.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-orange rounded-xl flex items-center justify-center shadow-theme-accent-orange group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
                <Store className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300 hover:scale-105 hover:bg-white/15">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200/80 mb-1">
                  Total Profit
                </p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                  ${stats.totalProfit.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-theme-accent-green rounded-xl flex items-center justify-center shadow-theme-accent-green group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110 animate-pulse-slow">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters with frosted glass */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300 group-focus-within:text-blue-200 transition-colors" />
                <input
                  type="text"
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 text-white placeholder-blue-200/50 transition-all duration-300 hover:bg-white/15"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${
                      statusFilter === option.value
                        ? "bg-theme-primary text-white border-blue-400 shadow-theme-primary scale-105"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:scale-105 hover:shadow-lg"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400/30 border-t-blue-400"></div>
            <p className="mt-4 text-blue-200 font-medium animate-pulse">
              Loading opportunities...
            </p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-12 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/50 animate-pulse-slow">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No opportunities found
            </h3>
            <p className="text-blue-200/80 mb-6">
              {searchTerm
                ? "Try adjusting your search or filters"
                : "Start by marking high-value listings as opportunities"}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 hover:scale-105"
            >
              <Search className="w-5 h-5" />
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOpportunities.map((opp) => {
              const listingImages = parseStringArray(opp.listing.imageUrls);
              const primaryImage = listingImages[0];
              const listingTags = parseStringArray(opp.listing.tags);
              const comparableUrls = parseComparableReferences(opp.listing.comparableUrls);
              const metadataItems = [
                { label: "Condition", value: opp.listing.condition || "Unknown" },
                { label: "Category", value: opp.listing.category || "Uncategorized" },
                {
                  label: "Shippable",
                  value: formatBooleanValue(opp.listing.shippable, "Yes", "Local only"),
                },
                {
                  label: "Negotiable",
                  value: formatBooleanValue(opp.listing.negotiable),
                },
                {
                  label: "Discount",
                  value:
                    opp.listing.discountPercent !== null &&
                    opp.listing.discountPercent !== undefined
                      ? `${opp.listing.discountPercent.toFixed(0)}% below comps`
                      : "—",
                },
                { label: "Posted", value: formatRelativeDate(opp.listing.postedAt) },
                {
                  label: "Identified Brand",
                  value: opp.listing.identifiedBrand || "—",
                },
                {
                  label: "Identified Model",
                  value: opp.listing.identifiedModel || "—",
                },
              ];
              const hasSellerDetails = opp.listing.sellerName || opp.listing.sellerContact;
              const llmDetails = [
                { label: "Variant", value: opp.listing.identifiedVariant },
                {
                  label: "Condition (LLM)",
                  value: opp.listing.identifiedCondition,
                },
                {
                  label: "LLM Analysis",
                  value: opp.listing.llmAnalyzed ? "Completed" : null,
                },
              ].filter((detail) => detail.value);

              const marketDetails = [
                {
                  label: "Verified Market Value",
                  value: formatCurrency(opp.listing.verifiedMarketValue),
                },
                {
                  label: "True Discount",
                  value:
                    opp.listing.trueDiscountPercent !== null
                      ? formatPercent(opp.listing.trueDiscountPercent)
                      : "—",
                },
                {
                  label: "Market Data Source",
                  value: opp.listing.marketDataSource || "—",
                },
                {
                  label: "Market Data Date",
                  value: formatDateTime(opp.listing.marketDataDate),
                },
                {
                  label: "Sellability Score",
                  value:
                    opp.listing.sellabilityScore !== null
                      ? opp.listing.sellabilityScore.toString()
                      : "—",
                },
                {
                  label: "Demand Level",
                  value: opp.listing.demandLevel || "—",
                },
                {
                  label: "Expected Days to Sell",
                  value:
                    opp.listing.expectedDaysToSell !== null
                      ? `${opp.listing.expectedDaysToSell} days`
                      : "—",
                },
                {
                  label: "Authenticity Risk",
                  value: opp.listing.authenticityRisk || "—",
                },
              ];

              const recommendationDetails = [
                {
                  label: "Recommended Offer",
                  value: formatCurrency(opp.listing.recommendedOffer),
                },
                {
                  label: "Recommended List Price",
                  value: formatCurrency(opp.listing.recommendedList),
                },
                {
                  label: "Analysis Confidence",
                  value: opp.listing.analysisConfidence || "—",
                },
                {
                  label: "Analysis Date",
                  value: formatDateTime(opp.listing.analysisDate),
                },
              ];

              const comparableSales = parseComparableSales(opp.listing.comparableSalesJson);
              const displayedLLMDetails = llmDetails;
              const displayedMarketDetails = marketDetails.filter(
                (detail) => detail.value && detail.value !== "—"
              );
              const displayedRecommendationDetails = recommendationDetails.filter(
                (detail) => detail.value && detail.value !== "—"
              );

              return (
                <div
                key={opp.id}
                className="group backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 overflow-hidden hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] hover:bg-white/15"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Image with glow effect */}
                    {primaryImage ? (
                      <div className="relative">
                        <img
                          src={primaryImage}
                          alt={opp.listing.title}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0 ring-2 ring-white/20 group-hover:ring-purple-400/50 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 ring-2 ring-white/20">
                        <Package className="w-8 h-8 text-purple-300" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-200 transition-colors">
                            {opp.listing.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-blue-200/70">
                            <span className="capitalize">
                              {opp.listing.platform.toLowerCase()}
                            </span>
                            {opp.listing.location && (
                              <>
                                <span>•</span>
                                <span>{opp.listing.location}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(opp.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge with glow */}
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium shadow-lg transition-all duration-300 ${getStatusColor(
                            opp.status
                          )}`}
                        >
                          {getStatusIcon(opp.status)}
                          <span>{opp.status}</span>
                        </div>
                      </div>

                      {/* Pricing Info with gradient backgrounds */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                          <p className="text-xs text-blue-200/70 mb-1">
                            Asking Price
                          </p>
                          <p className="text-lg font-bold text-white">
                            ${opp.listing.askingPrice.toFixed(0)}
                          </p>
                        </div>
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                          <p className="text-xs text-blue-200/70 mb-1">
                            Est. Value
                          </p>
                          <p className="text-lg font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                            ${opp.listing.estimatedValue?.toFixed(0) || "—"}
                          </p>
                        </div>
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                          <p className="text-xs text-blue-200/70 mb-1">
                            Potential Profit
                          </p>
                          <p className="text-lg font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                            ${opp.listing.profitPotential?.toFixed(0) || "—"}
                          </p>
                        </div>
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                          <p className="text-xs text-blue-200/70 mb-1">
                            Value Score
                          </p>
                          <p className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                            {opp.listing.valueScore?.toFixed(0) || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Listing metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {metadataItems.map((item) => (
                          <div
                            key={`${opp.id}-${item.label}`}
                            className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300"
                          >
                            <p className="text-xs text-blue-200/70 mb-1">{item.label}</p>
                            <p className="text-sm font-semibold text-white">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {displayedLLMDetails.length > 0 && (
                        <div
                          className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10"
                          data-testid="llm-identification"
                        >
                          <p className="text-xs text-blue-200/70 mb-2">LLM Identification</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {displayedLLMDetails.map((detail) => (
                              <div key={`${opp.id}-${detail.label}`}>
                                <p className="text-xs text-blue-200/60 mb-1">{detail.label}</p>
                                <p className="text-sm text-white font-medium">{detail.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {displayedMarketDetails.length > 0 && (
                        <div
                          className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10"
                          data-testid="market-insights"
                        >
                          <p className="text-xs text-blue-200/70 mb-2">Market Insights</p>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {displayedMarketDetails.map((detail) => (
                              <div key={`${opp.id}-market-${detail.label}`}>
                                <p className="text-xs text-blue-200/60 mb-1">{detail.label}</p>
                                <p className="text-sm text-white font-medium">{detail.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(displayedRecommendationDetails.length > 0 ||
                        opp.listing.resaleStrategy ||
                        opp.listing.analysisReasoning) && (
                        <div
                          className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10"
                          data-testid="recommendation-details"
                        >
                          <p className="text-xs text-blue-200/70 mb-2">Strategy & Recommendations</p>
                          {displayedRecommendationDetails.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                              {displayedRecommendationDetails.map((detail) => (
                                <div key={`${opp.id}-rec-${detail.label}`}>
                                  <p className="text-xs text-blue-200/60 mb-1">{detail.label}</p>
                                  <p className="text-sm text-white font-medium">{detail.value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {opp.listing.resaleStrategy && (
                            <div className="mb-3">
                              <p className="text-xs text-blue-200/70 mb-1">Resale Strategy</p>
                              <p className="text-sm text-white whitespace-pre-line">
                                {opp.listing.resaleStrategy}
                              </p>
                            </div>
                          )}
                          {opp.listing.analysisReasoning && (
                            <div>
                              <p className="text-xs text-blue-200/70 mb-1">Analysis Reasoning</p>
                              <p className="text-sm text-white whitespace-pre-line">
                                {opp.listing.analysisReasoning}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {listingTags.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-blue-200/70 mb-2">Detected Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {listingTags.map((tag) => (
                              <span
                                key={`${opp.id}-${tag}`}
                                className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white flex items-center gap-1"
                              >
                                <TagIcon className="w-3 h-3 text-purple-200" />
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {opp.listing.description && (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                          <p className="text-xs text-blue-200/70 mb-2">Listing Description</p>
                          <p className="text-sm text-white whitespace-pre-line">
                            {opp.listing.description}
                          </p>
                        </div>
                      )}

                      {opp.listing.priceReasoning && (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                          <p className="text-xs text-blue-200/70 mb-2">Pricing Reasoning</p>
                          <p className="text-sm text-white whitespace-pre-line">
                            {opp.listing.priceReasoning}
                          </p>
                        </div>
                      )}

                      {hasSellerDetails && (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                          <p className="text-xs text-blue-200/70 mb-2">Seller Details</p>
                          <div className="flex flex-col gap-2 text-sm text-white">
                            {opp.listing.sellerName && (
                              <span className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-200" />
                                {opp.listing.sellerName}
                              </span>
                            )}
                            {opp.listing.sellerContact && (
                              <span className="flex items-center gap-2 break-all">
                                {opp.listing.sellerContact.includes("@") ? (
                                  <Mail className="w-4 h-4 text-blue-200" />
                                ) : (
                                  <Phone className="w-4 h-4 text-blue-200" />
                                )}
                                {opp.listing.sellerContact}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {opp.listing.requestToBuy !== null &&
                        opp.listing.requestToBuy !== undefined && (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs text-blue-200/70 mb-2 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-200" />
                                Purchase Message
                              </p>
                              <p className="text-sm text-white whitespace-pre-line">
                                {opp.listing.requestToBuy}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                handleCopyMessage(opp.id, opp.listing.requestToBuy || "")
                              }
                              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedMessageId === opp.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}

                      {comparableUrls.length > 0 && (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                          <p className="text-xs text-blue-200/70 mb-2">Comparable Listings</p>
                          <div className="flex flex-col gap-2">
                            {comparableUrls.map((comp, index) => (
                              <a
                                key={`${opp.id}-comp-${index}`}
                                href={comp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-all duration-300"
                              >
                                <span className="text-sm font-semibold text-white">
                                  {comp.label}
                                </span>
                                <span className="text-xs text-blue-200/70">
                                  {comp.platform} • {comp.type}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {comparableSales.length > 0 && (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                          <p className="text-xs text-blue-200/70 mb-2">Comparable Sold Listings</p>
                          <div className="flex flex-col gap-3">
                            {comparableSales.map((sale, index) => (
                              <div
                                key={`${opp.id}-sale-${index}`}
                                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm text-white font-medium">{sale.title}</p>
                                  {sale.soldAt && (
                                    <p className="text-xs text-blue-200/60">
                                      Sold {formatDateTime(sale.soldAt)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-green-200 font-semibold">
                                    {sale.price ? formatCurrency(sale.price) : "—"}
                                  </span>
                                  {sale.url && (
                                    <a
                                      href={sale.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-200 hover:text-white transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(opp.listing.priceReasoning || opp.listing.notes) && (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10 space-y-4">
                          {opp.listing.priceReasoning && (
                            <div>
                              <p className="text-xs text-blue-200/70 mb-2">Value Reasoning</p>
                              <p className="text-sm text-white whitespace-pre-line">
                                {opp.listing.priceReasoning}
                              </p>
                            </div>
                          )}
                          {opp.listing.notes && (
                            <div>
                              <p className="text-xs text-blue-200/70 mb-2">Listing Notes</p>
                              <p className="text-sm text-white whitespace-pre-line">
                                {opp.listing.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Editing Form or Display */}
                      {editingId === opp.id ? (
                        <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-blue-200 mb-2">
                                Status
                              </label>
                              <select
                                value={editForm.status || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, status: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white transition-all duration-300"
                              >
                                <option value="IDENTIFIED" className="bg-slate-800">Identified</option>
                                <option value="CONTACTED" className="bg-slate-800">Contacted</option>
                                <option value="PURCHASED" className="bg-slate-800">Purchased</option>
                                <option value="LISTED" className="bg-slate-800">Listed</option>
                                <option value="SOLD" className="bg-slate-800">Sold</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-blue-200 mb-2">
                                Purchase Price
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.purchasePrice || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    purchasePrice: parseFloat(e.target.value) || null,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300"
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-blue-200 mb-2">
                                Resale Price
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.resalePrice || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    resalePrice: parseFloat(e.target.value) || null,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300"
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-blue-200 mb-2">
                                Fees
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.fees || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    fees: parseFloat(e.target.value) || null,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300"
                                placeholder="0.00"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-blue-200 mb-2">
                                Resale Platform
                              </label>
                              <input
                                type="text"
                                value={editForm.resalePlatform || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    resalePlatform: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300"
                                placeholder="e.g., eBay, Facebook Marketplace"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-blue-200 mb-2">
                                Notes
                              </label>
                              <textarea
                                value={editForm.notes || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, notes: e.target.value })
                                }
                                rows={3}
                                className="w-full px-3 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300"
                                placeholder="Add notes about this opportunity..."
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditing(opp.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-500/50 hover:shadow-green-500/80 hover:scale-105"
                            >
                              <Save className="w-4 h-4" />
                              Save Changes
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 hover:scale-105"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Display Mode */}
                          {(opp.purchasePrice ||
                            opp.resalePrice ||
                            opp.actualProfit ||
                            opp.notes) && (
                            <div className="backdrop-blur-sm bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {opp.purchasePrice && (
                                  <div>
                                    <p className="text-xs text-blue-200/70 mb-1">
                                      Purchase Price
                                    </p>
                                    <p className="text-sm font-semibold text-white">
                                      ${opp.purchasePrice.toFixed(2)}
                                    </p>
                                  </div>
                                )}
                                {opp.resalePrice && (
                                  <div>
                                    <p className="text-xs text-blue-200/70 mb-1">
                                      Resale Price
                                    </p>
                                    <p className="text-sm font-semibold text-white">
                                      ${opp.resalePrice.toFixed(2)}
                                    </p>
                                  </div>
                                )}
                                {opp.fees && (
                                  <div>
                                    <p className="text-xs text-blue-200/70 mb-1">
                                      Fees
                                    </p>
                                    <p className="text-sm font-semibold text-white">
                                      ${opp.fees.toFixed(2)}
                                    </p>
                                  </div>
                                )}
                                {opp.actualProfit !== null && (
                                  <div>
                                    <p className="text-xs text-blue-200/70 mb-1">
                                      Actual Profit
                                    </p>
                                    <p
                                      className={`text-sm font-semibold ${
                                        opp.actualProfit >= 0
                                          ? "bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent"
                                          : "bg-gradient-to-r from-red-300 to-pink-300 bg-clip-text text-transparent"
                                      }`}
                                    >
                                      ${opp.actualProfit.toFixed(2)}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {opp.notes && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                  <p className="text-xs text-blue-200/70 mb-1">
                                    Notes
                                  </p>
                                  <p className="text-sm text-white">
                                    {opp.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Actions with glow effects */}
                      <div className="flex items-center gap-2">
                        <a
                          href={opp.listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm shadow-lg shadow-blue-500/50 hover:shadow-blue-500/80 hover:scale-105"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Listing
                        </a>
                        {editingId !== opp.id && (
                          <>
                            <button
                              onClick={() => startEditing(opp)}
                              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 text-sm border border-white/20 hover:scale-105"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteOpportunity(opp.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 text-sm shadow-lg shadow-red-500/50 hover:shadow-red-500/80 hover:scale-105"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
