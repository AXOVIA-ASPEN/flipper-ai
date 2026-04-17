'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
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
  LayoutGrid,
  List,
  Warehouse,
} from 'lucide-react';
import { calculateDaysHeld, calculateCarryingCost, isAgingInventory } from '@/lib/holding-cost';
import KanbanBoard, { type KanbanOpportunity } from '@/components/KanbanBoard';
import CrossPostModal from '@/components/posting-queue/CrossPostModal';
import FilterPanel from '@/components/FilterPanel';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  useFilterParams,
  toggleMultiSelectValue,
  isMultiSelectActive,
} from '@/hooks/useFilterParams';
import { LoadingSkeleton, EmptyState, ScoreRing } from '@/components/ui';

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
  // Story 5.2
  compMatchConfidence: string | null;
  // Story 5.3
  soldVolume30Days: number | null;
  soldVolume60Days: number | null;
  soldVolume90Days: number | null;
  // Story 5.4
  completenessLabel: string | null;
  sellerRating: number | null;
  sellerReviewCount: number | null;
  // Story 5.5
  sizeCategory: string | null;
  estimatedShippingCost: number | null;
  pickupDistanceMiles: number | null;
  outsidePickupRadius: boolean | null;
  adjustedProfitMargin: number | null;
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
    (item): item is string => typeof item === 'string' && item.length > 0
  );
}

function parseComparableReferences(value: string | null): ComparableReference[] {
  return safeParseArray(value)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const ref = item as Record<string, unknown>;
      if (typeof ref.url !== 'string' || !ref.url) return null;
      return {
        platform:
          typeof ref.platform === 'string' && ref.platform.length > 0 ? ref.platform : 'Comparable',
        label:
          typeof ref.label === 'string' && ref.label.length > 0
            ? ref.label
            : typeof ref.platform === 'string'
              ? ref.platform
              : 'Comparable',
        url: ref.url,
        type: typeof ref.type === 'string' && ref.type.length > 0 ? ref.type : 'search',
      };
    })
    .filter((item): item is ComparableReference => Boolean(item));
}

function formatBooleanValue(
  value: boolean | null | undefined,
  trueLabel = 'Yes',
  falseLabel = 'No'
) {
  if (value === null || value === undefined) return 'Unknown';
  return value ? trueLabel : falseLabel;
}

function formatRelativeDate(value: string | null) {
  if (!value) return '—';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '—';
  }
}

function parseComparableSales(value: string | null): ComparableSale[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        // Handle both new format (soldPrice/soldDate from comp-matcher) and
        // legacy format (price/soldAt from market-price raw listings)
        const price =
          typeof record.soldPrice === 'number' ? record.soldPrice :
          typeof record.price === 'number' ? record.price : null;
        const soldAt =
          typeof record.soldDate === 'string' ? record.soldDate :
          typeof record.soldAt === 'string' ? record.soldAt : null;
        return {
          title: typeof record.title === 'string' ? record.title : 'Comparable Sale',
          price,
          url: typeof record.url === 'string' ? record.url : null,
          soldAt,
        };
      })
      .filter((item): item is ComparableSale => Boolean(item));
  } catch {
    return [];
  }
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(0)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
          <LoadingSkeleton variant="list" rows={6} />
        </div>
      }
    >
      <OpportunitiesContent />
    </Suspense>
  );
}

function OpportunitiesContent() {
  const { filters, setFilter, setFilters, clearFilters, activeFilterCount } = useFilterParams();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOpportunities: 0,
    totalProfit: 0,
    totalInvested: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Opportunity>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'inventory'>('list');
  const [holdingCostRate, setHoldingCostRate] = useState<number>(2.0);
  const [pendingKanbanMove, setPendingKanbanMove] = useState<{
    opportunityId: string;
    targetStatus: string;
  } | null>(null);
  const [modalPurchasePrice, setModalPurchasePrice] = useState('');
  const [modalResaleUrl, setModalResaleUrl] = useState('');
  const [modalSalePrice, setModalSalePrice] = useState('');
  const [modalFees, setModalFees] = useState('');
  // Cross-post state — the parent owns modal visibility and stores the
  // source opportunity so the modal can read its platform + listing fields.
  const [crossPostTarget, setCrossPostTarget] = useState<Opportunity | null>(
    null
  );
  // Fetched from /api/user/tier on mount. The Firebase client session does
  // not include subscriptionTier, so without this we cannot decide whether
  // to wire up onCrossPost on the KanbanBoard.
  const [crossPostEnabled, setCrossPostEnabled] = useState(false);

  useEffect(() => {
    fetchOpportunities();
  }, [filters]);

  // Fetch tier once on mount. Cross-post CTA is gated to PRO+ tiers where
  // the ebayCrossListing feature is enabled.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/tier')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.success) {
          const tier = (json.data?.tier ?? 'FREE') as string;
          setCrossPostEnabled(tier !== 'FREE');
        }
      })
      .catch(() => {
        // Non-critical — fall back to disabled cross-post button.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCrossPost = useCallback(
    (opp: KanbanOpportunity) => {
      const source = opportunities.find((o) => o.id === opp.id);
      if (source) setCrossPostTarget(source);
    },
    [opportunities]
  );

  useEffect(() => {
    fetch('/api/user/settings')
      .then((res) => res.json())
      .then((result) => {
        if (result.success && typeof result.data.holdingCostDailyRate === 'number') {
          setHoldingCostRate(result.data.holdingCostDailyRate);
        }
      })
      .catch(() => {
        console.warn('Failed to fetch holding cost rate, using default ($2.00/day)');
      });
  }, []);

  useEffect(() => {
    if (!copiedMessageId) return;
    const timeout = setTimeout(() => setCopiedMessageId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedMessageId]);

  async function fetchOpportunities() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.statuses) params.set('statuses', filters.statuses);
      else if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.platforms) params.set('platforms', filters.platforms);
      else if (filters.platform && filters.platform !== 'all') params.set('platform', filters.platform);
      if (filters.minScore) params.set('minScore', filters.minScore);
      if (filters.maxScore) params.set('maxScore', filters.maxScore);
      if (filters.minProfit) params.set('minProfit', filters.minProfit);
      if (filters.maxProfit) params.set('maxProfit', filters.maxProfit);
      if (filters.categories) params.set('categories', filters.categories);
      else if (filters.category) params.set('category', filters.category);
      const qs = params.toString();
      const url = qs ? `/api/opportunities?${qs}` : '/api/opportunities';
      const response = await fetch(url);
      const data = await response.json();

      setOpportunities(data.opportunities || []);
      setStats(
        data.stats || {
          totalOpportunities: 0,
          totalProfit: 0,
          totalInvested: 0,
          totalRevenue: 0,
        }
      );
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateOpportunity(id: string, updates: Partial<Opportunity>) {
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchOpportunities();
        setEditingId(null);
        setEditForm({});
      }
    } catch (error) {
      console.error('Failed to update opportunity:', error);
    }
  }

  async function deleteOpportunity(id: string) {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchOpportunities();
      }
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
    }
  }

  async function handleCopyMessage(id: string, message: string) {
    if (!message) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        setCopiedMessageId(id);
      }
    } catch (error) {
      console.error('Failed to copy request message:', error);
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

  async function handleKanbanStatusChange(id: string, newStatus: string) {
    if (newStatus === 'PURCHASED' || newStatus === 'LISTED' || newStatus === 'SOLD') {
      setModalPurchasePrice('');
      setModalResaleUrl('');
      setModalSalePrice('');
      setModalFees('');
      setPendingKanbanMove({ opportunityId: id, targetStatus: newStatus });
    } else {
      await updateOpportunity(id, { status: newStatus });
    }
  }

  async function confirmPurchasedModal() {
    if (!pendingKanbanMove) return;
    await updateOpportunity(pendingKanbanMove.opportunityId, {
      status: 'PURCHASED',
      purchasePrice: parseFloat(modalPurchasePrice),
      purchaseDate: new Date().toISOString(),
    });
    setPendingKanbanMove(null);
  }

  async function confirmListedModal() {
    if (!pendingKanbanMove) return;
    await updateOpportunity(pendingKanbanMove.opportunityId, {
      status: 'LISTED',
      resaleUrl: modalResaleUrl,
    });
    setPendingKanbanMove(null);
  }

  async function confirmSoldModal() {
    if (!pendingKanbanMove) return;
    const opp = opportunities.find((o) => o.id === pendingKanbanMove.opportunityId);
    const payload: Partial<Opportunity> = {
      status: 'SOLD',
      resalePrice: parseFloat(modalSalePrice),
      resaleDate: new Date().toISOString(),
    };
    if (modalFees) payload.fees = parseFloat(modalFees);
    if (opp?.purchasePrice != null) payload.purchasePrice = opp.purchasePrice;
    await updateOpportunity(pendingKanbanMove.opportunityId, payload);
    setPendingKanbanMove(null);
  }

  function cancelKanbanModal() {
    setPendingKanbanMove(null);
  }

  // Server handles all filter params; client-side only applies searchTerm
  const filteredOpportunities = searchTerm
    ? opportunities.filter((opp) => {
        const normalized = searchTerm.toLowerCase();
        return (
          opp.listing.title.toLowerCase().includes(normalized) ||
          opp.listing.platform.toLowerCase().includes(normalized) ||
          (opp.listing.category || '').toLowerCase().includes(normalized)
        );
      })
    : opportunities;

  const statusOptions = [
    { value: 'all', label: 'All Statuses', icon: Package },
    { value: 'IDENTIFIED', label: 'Identified', icon: Search },
    { value: 'CONTACTED', label: 'Contacted', icon: Clock },
    { value: 'PURCHASED', label: 'Purchased', icon: ShoppingCart },
    { value: 'LISTED', label: 'Listed', icon: Store },
    { value: 'SOLD', label: 'Sold', icon: Trophy },
  ];

  // Map lifecycle status to a canonical .fp-badge-* class. Per ADR-14.7-A:
  // green is reserved for profit-positive states (SOLD with profit), so SOLD
  // maps to green. Non-financial lifecycle states use blue/yellow/purple/orange.
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'IDENTIFIED':
        return 'fp-badge fp-badge-blue';
      case 'CONTACTED':
        return 'fp-badge fp-badge-yellow';
      case 'PURCHASED':
        return 'fp-badge fp-badge-purple';
      case 'LISTED':
        return 'fp-badge fp-badge-orange';
      case 'SOLD':
        return 'fp-badge fp-badge-green';
      default:
        return 'fp-badge fp-badge-gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IDENTIFIED':
        return <Search className="w-4 h-4" />;
      case 'CONTACTED':
        return <Clock className="w-4 h-4" />;
      case 'PURCHASED':
        return <ShoppingCart className="w-4 h-4" />;
      case 'LISTED':
        return <Store className="w-4 h-4" />;
      case 'SOLD':
        return <Trophy className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div style={{ minHeight: '100vh' }} className="relative overflow-hidden">
      {/* Header — canonical glass navigation surface */}
      <header className="fp-glass-nav sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/"
              className="fp-btn-ghost group"
              style={{ padding: 8, display: 'inline-flex', alignItems: 'center' }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: '#c4b5fd' }} />
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="fp-glass-sm w-10 h-10 rounded-lg flex items-center justify-center"
              >
                <Trophy className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
                  Opportunities
                </h1>
                <p style={{ fontSize: 12, color: '#64748b' }}>Track your flips from start to finish</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards — canonical .fp-glow-card, single purple accent per ADR-14.7-C */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="fp-glow-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Total Opportunities</p>
                <p className="fp-metric-num" style={{ fontSize: 30, fontWeight: 700, color: '#e2e8f0' }}>{stats.totalOpportunities}</p>
              </div>
              <div className="fp-glass-sm w-12 h-12 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              </div>
            </div>
          </div>

          <div className="fp-glow-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Total Invested</p>
                <p className="fp-metric-num" style={{ fontSize: 30, fontWeight: 700, color: '#e2e8f0' }}>${stats.totalInvested.toFixed(0)}</p>
              </div>
              <div className="fp-glass-sm w-12 h-12 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              </div>
            </div>
          </div>

          <div className="fp-glow-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Total Revenue</p>
                <p className="fp-metric-num" style={{ fontSize: 30, fontWeight: 700, color: '#e2e8f0' }}>${stats.totalRevenue.toFixed(0)}</p>
              </div>
              <div className="fp-glass-sm w-12 h-12 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              </div>
            </div>
          </div>

          <div className="fp-glow-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>Total Profit</p>
                <p className="fp-metric-num" style={{ fontSize: 30, fontWeight: 700, color: '#34d399' }}>
                  ${stats.totalProfit.toFixed(0)}
                </p>
              </div>
              <div className="fp-glass-sm w-12 h-12 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters — canonical .fp-glass panel */}
        <div className="fp-glass p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative group">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  style={{ color: '#94a3b8' }}
                />
                <input
                  type="text"
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="fp-input w-full pl-10 pr-4"
                />
              </div>
            </div>

            {/* View Toggle — aria-pressed idiom for toggle group */}
            <div
              className="flex gap-1 rounded-lg p-1"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              role="group"
              aria-label="View mode"
            >
              <button
                onClick={() => setViewMode('list')}
                className="fp-btn-ghost flex items-center gap-1"
                style={{
                  padding: '6px 12px',
                  fontSize: 14,
                  background: viewMode === 'list' ? 'rgba(124,58,237,0.15)' : undefined,
                  color: viewMode === 'list' ? '#c4b5fd' : '#94a3b8',
                }}
                aria-pressed={viewMode === 'list'}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="fp-btn-ghost flex items-center gap-1"
                style={{
                  padding: '6px 12px',
                  fontSize: 14,
                  background: viewMode === 'kanban' ? 'rgba(124,58,237,0.15)' : undefined,
                  color: viewMode === 'kanban' ? '#c4b5fd' : '#94a3b8',
                }}
                aria-pressed={viewMode === 'kanban'}
                title="Kanban view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('inventory')}
                className="fp-btn-ghost flex items-center gap-1"
                style={{
                  padding: '6px 12px',
                  fontSize: 14,
                  background: viewMode === 'inventory' ? 'rgba(124,58,237,0.15)' : undefined,
                  color: viewMode === 'inventory' ? '#c4b5fd' : '#94a3b8',
                }}
                aria-pressed={viewMode === 'inventory'}
                title="Inventory view"
              >
                <Warehouse className="w-4 h-4" />
              </button>
            </div>

            {/* Status Filter — canonical .fp-btn-ghost with purple active state */}
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isAll = option.value === 'all';
                const isActive = isAll
                  ? !filters.statuses
                  : isMultiSelectActive(filters.statuses, option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (isAll) {
                        setFilter('statuses', '');
                      } else {
                        setFilter(
                          'statuses',
                          toggleMultiSelectValue(filters.statuses, option.value)
                        );
                      }
                    }}
                    className="fp-btn-ghost flex items-center gap-2"
                    style={{
                      background: isActive ? 'rgba(124,58,237,0.15)' : undefined,
                      color: isActive ? '#c4b5fd' : '#e2e8f0',
                      padding: '8px 16px',
                    }}
                    aria-pressed={isActive}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="fp-btn-ghost flex items-center gap-2"
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              <TagIcon className="w-4 h-4" />
              {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <FilterPanel
                filters={filters}
                setFilter={setFilter}
                setFilters={setFilters}
                clearFilters={clearFilters}
                activeFilterCount={activeFilterCount}
                statusOptions={[
                  { value: 'IDENTIFIED', label: 'Identified' },
                  { value: 'CONTACTED', label: 'Contacted' },
                  { value: 'PURCHASED', label: 'Purchased' },
                  { value: 'LISTED', label: 'Listed' },
                  { value: 'SOLD', label: 'Sold' },
                  { value: 'PASSED', label: 'Passed' },
                ]}
              />
            </div>
          )}
        </div>

        {/* Kanban View */}
        {viewMode === 'kanban' && !loading && (
          <KanbanBoard
            opportunities={filteredOpportunities as unknown as KanbanOpportunity[]}
            onStatusChange={handleKanbanStatusChange}
            onCrossPost={crossPostEnabled ? handleCrossPost : undefined}
          />
        )}

        {/* Cross-post modal — rendered at the page level so it overlays the
            full screen regardless of which view is active. */}
        {crossPostTarget && (
          <CrossPostModal
            listingId={crossPostTarget.listing.id}
            sourcePlatform={crossPostTarget.listing.platform}
            listingTitle={crossPostTarget.listing.title}
            askingPrice={crossPostTarget.listing.askingPrice}
            onClose={() => setCrossPostTarget(null)}
            onSuccess={() => {
              // Modal handles its own success toast. Parent just clears
              // the target; no refetch needed here because cross-posts
              // show up on /posting-queue, not on this page.
            }}
          />
        )}

        {/* Inventory View */}
        {viewMode === 'inventory' && !loading && (() => {
          const purchasedItems = opportunities.filter((opp) => opp.status === 'PURCHASED');
          if (purchasedItems.length === 0) {
            return (
              <EmptyState
                icon={
                  <div
                    className="fp-glass-sm"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Warehouse className="w-10 h-10" style={{ color: '#8b5cf6' }} />
                  </div>
                }
                title="No inventory yet"
                message="Mark an opportunity as Purchased to track holding costs here."
              />
            );
          }
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="inventory-view">
              {purchasedItems.map((opp) => {
                const daysHeld = opp.purchaseDate
                  ? calculateDaysHeld(new Date(opp.purchaseDate))
                  : null;
                const carryingCost =
                  daysHeld !== null ? calculateCarryingCost(daysHeld, holdingCostRate) : null;
                const aging = daysHeld !== null ? isAgingInventory(daysHeld) : false;
                return (
                  <div
                    key={opp.id}
                    className="fp-glass p-5"
                    data-testid="inventory-card"
                  >
                    {aging && (
                      <div style={{ marginBottom: 12 }}>
                        <span className="fp-badge fp-badge-yellow">⚠️ Aging Inventory</span>
                      </div>
                    )}
                    <h3 style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }} className="line-clamp-2">
                      {opp.listing.title}
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: '#94a3b8' }}>Purchase Price</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                          {opp.purchasePrice != null ? `$${opp.purchasePrice.toFixed(2)}` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#94a3b8' }}>Market Value</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                          {opp.listing.estimatedValue != null
                            ? `$${opp.listing.estimatedValue.toFixed(2)}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#94a3b8' }}>Days Held</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                          {daysHeld !== null ? `${daysHeld} days` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#94a3b8' }}>Carrying Cost</span>
                        <span
                          style={{
                            color: aging ? '#f87171' : '#e2e8f0',
                            fontWeight: aging ? 700 : 500,
                          }}
                        >
                          {carryingCost !== null ? `$${carryingCost.toFixed(2)}` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* List View */}
        {loading ? (
          <LoadingSkeleton variant="list" rows={6} />
        ) : viewMode === 'kanban' || viewMode === 'inventory' ? null : filteredOpportunities.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            message={searchTerm ? 'Try adjusting your search or filters' : 'Start by marking high-value listings as opportunities'}
            action={{ label: 'Run a scrape', href: '/scraper' }}
          />
        ) : (
          <div className="space-y-4">
            {filteredOpportunities.map((opp) => {
              const listingImages = parseStringArray(opp.listing.imageUrls);
              const primaryImage = listingImages[0];
              const listingTags = parseStringArray(opp.listing.tags);
              const comparableUrls = parseComparableReferences(opp.listing.comparableUrls);
              const metadataItems = [
                { label: 'Condition', value: opp.listing.condition || 'Unknown' },
                { label: 'Category', value: opp.listing.category || 'Uncategorized' },
                {
                  label: 'Shippable',
                  value: formatBooleanValue(opp.listing.shippable, 'Yes', 'Local only'),
                },
                {
                  label: 'Negotiable',
                  value: formatBooleanValue(opp.listing.negotiable),
                },
                {
                  label: 'Discount',
                  value:
                    opp.listing.discountPercent !== null &&
                    opp.listing.discountPercent !== undefined
                      ? `${opp.listing.discountPercent.toFixed(0)}% below comps`
                      : '—',
                },
                { label: 'Posted', value: formatRelativeDate(opp.listing.postedAt) },
                {
                  label: 'Identified Brand',
                  value: opp.listing.identifiedBrand || '—',
                },
                {
                  label: 'Identified Model',
                  value: opp.listing.identifiedModel || '—',
                },
              ];
              const hasSellerDetails = opp.listing.sellerName || opp.listing.sellerContact;
              const llmDetails = [
                { label: 'Variant', value: opp.listing.identifiedVariant },
                {
                  label: 'Condition (LLM)',
                  value: opp.listing.identifiedCondition,
                },
                {
                  label: 'LLM Analysis',
                  value: opp.listing.llmAnalyzed ? 'Completed' : null,
                },
              ].filter((detail) => detail.value);

              const marketDetails = [
                {
                  label: 'Verified Market Value',
                  value: formatCurrency(opp.listing.verifiedMarketValue),
                },
                {
                  label: 'True Discount',
                  value:
                    opp.listing.trueDiscountPercent !== null
                      ? formatPercent(opp.listing.trueDiscountPercent)
                      : '—',
                },
                {
                  label: 'Market Data Source',
                  value: opp.listing.marketDataSource || '—',
                },
                {
                  label: 'Market Data Date',
                  value: formatDateTime(opp.listing.marketDataDate),
                },
                {
                  label: 'Sellability Score',
                  value:
                    opp.listing.sellabilityScore !== null
                      ? opp.listing.sellabilityScore.toString()
                      : '—',
                },
                {
                  label: 'Demand Level',
                  value: opp.listing.demandLevel || '—',
                },
                {
                  label: 'Sold (30 days)',
                  value:
                    opp.listing.soldVolume30Days !== null
                      ? `${opp.listing.soldVolume30Days} units`
                      : '—',
                },
                {
                  label: 'Sold (60 days)',
                  value:
                    opp.listing.soldVolume60Days !== null
                      ? `${opp.listing.soldVolume60Days} units`
                      : '—',
                },
                {
                  label: 'Sold (90 days)',
                  value:
                    opp.listing.soldVolume90Days !== null
                      ? `${opp.listing.soldVolume90Days} units`
                      : '—',
                },
                {
                  label: 'Expected Days to Sell',
                  value:
                    opp.listing.expectedDaysToSell !== null
                      ? `${opp.listing.expectedDaysToSell} days`
                      : '—',
                },
                {
                  label: 'Authenticity Risk',
                  value: opp.listing.authenticityRisk || '—',
                },
                {
                  label: 'Item Completeness',
                  value: opp.listing.completenessLabel || '—',
                },
                {
                  label: 'Seller Rating',
                  value:
                    opp.listing.sellerRating !== null
                      ? `${opp.listing.sellerRating}${opp.listing.platform === 'MERCARI' ? '/5' : '%'} (${opp.listing.sellerReviewCount ?? '?'} reviews)`
                      : '—',
                },
                // Story 5.5: Logistics
                {
                  label: 'Size Category',
                  value: opp.listing.sizeCategory
                    ? opp.listing.sizeCategory.replace(/_/g, ' ')
                    : '—',
                },
                {
                  label: 'Est. Shipping Cost',
                  value:
                    opp.listing.estimatedShippingCost != null
                      ? `$${opp.listing.estimatedShippingCost.toFixed(2)}`
                      : '—',
                },
                {
                  label: 'Pickup Distance',
                  value:
                    opp.listing.pickupDistanceMiles != null
                      ? `${opp.listing.pickupDistanceMiles} mi`
                      : '—',
                },
                {
                  label: 'Adj. Profit Margin',
                  value:
                    opp.listing.adjustedProfitMargin != null
                      ? `$${opp.listing.adjustedProfitMargin.toFixed(2)}`
                      : '—',
                },
              ];

              const recommendationDetails = [
                {
                  label: 'Recommended Offer',
                  value: formatCurrency(opp.listing.recommendedOffer),
                },
                {
                  label: 'Recommended List Price',
                  value: formatCurrency(opp.listing.recommendedList),
                },
                {
                  label: 'Analysis Confidence',
                  value: opp.listing.analysisConfidence || '—',
                },
                {
                  label: 'Analysis Date',
                  value: formatDateTime(opp.listing.analysisDate),
                },
              ];

              const comparableSales = parseComparableSales(opp.listing.comparableSalesJson);
              const displayedLLMDetails = llmDetails;
              const displayedMarketDetails = marketDetails.filter(
                (detail) => detail.value && detail.value !== '—'
              );
              const displayedRecommendationDetails = recommendationDetails.filter(
                (detail) => detail.value && detail.value !== '—'
              );

              return (
                <div
                  key={opp.id}
                  className="fp-glow-card group"
                  style={{ overflow: 'hidden' }}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      {primaryImage ? (
                        <div className="relative">
                          <img
                            src={primaryImage}
                            alt={opp.listing.title}
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                        </div>
                      ) : (
                        <div
                          className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0 fp-glass-sm"
                        >
                          <Package className="w-8 h-8" style={{ color: '#c4b5fd' }} />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3
                              className="text-lg font-semibold mb-1 transition-colors"
                              style={{ color: '#e2e8f0' }}
                            >
                              {opp.listing.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
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

                          {/* Status Badge — canonical .fp-badge-* */}
                          <div
                            className={getStatusBadgeClass(opp.status)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            {getStatusIcon(opp.status)}
                            <span>{opp.status}</span>
                          </div>
                        </div>

                        {/* Pricing Info — canonical .fp-glass-sm tiles */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="fp-glass-sm p-3">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Asking Price</p>
                            <p style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                              ${opp.listing.askingPrice.toFixed(0)}
                            </p>
                          </div>
                          <div className="fp-glass-sm p-3">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                              {opp.listing.verifiedMarketValue !== null ? 'Verified Value' : 'Est. Value'}
                            </p>
                            <p style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                              ${(opp.listing.verifiedMarketValue ?? opp.listing.estimatedValue)?.toFixed(0) || '—'}
                            </p>
                          </div>
                          <div className="fp-glass-sm p-3">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Potential Profit</p>
                            <p style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>
                              ${opp.listing.profitPotential?.toFixed(0) || '—'}
                            </p>
                          </div>
                          <div className="fp-glass-sm p-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Value Score</p>
                            <ScoreRing score={opp.listing.valueScore ?? 0} size={40} />
                          </div>
                        </div>

                        {/* Listing metadata */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          {metadataItems.map((item) => (
                            <div
                              key={`${opp.id}-${item.label}`}
                              className="fp-glass-sm p-3"
                            >
                              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{item.label}</p>
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{item.value}</p>
                            </div>
                          ))}
                        </div>

                        {displayedLLMDetails.length > 0 && (
                          <div
                            className="fp-glass-sm p-4 mb-4"
                            data-testid="llm-identification"
                          >
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>LLM Identification</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {displayedLLMDetails.map((detail) => (
                                <div key={`${opp.id}-${detail.label}`}>
                                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{detail.label}</p>
                                  <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{detail.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Low-liquidity warning (Story 5.3) */}
                        {opp.listing.demandLevel === 'low_liquidity' && (
                          <div
                            className="fp-alert-danger mb-4"
                            data-testid="low-liquidity-warning"
                          >
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#fca5a5' }}>⚠ Low Liquidity Warning</p>
                            <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 4, opacity: 0.9 }}>
                              No verified sales found in the past 90 days. Resale may take significantly longer than expected.
                            </p>
                          </div>
                        )}

                        {/* Outside pickup radius warning (Story 5.5) */}
                        {opp.listing.outsidePickupRadius && (
                          <div
                            className="fp-alert-warn mb-4"
                            data-testid="outside-pickup-radius-warning"
                          >
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#fcd34d' }}>⚠ Outside Pickup Radius</p>
                            <p style={{ fontSize: 12, color: '#fcd34d', marginTop: 4, opacity: 0.9 }}>
                              This local-only item is beyond your configured pickup radius.
                              {opp.listing.pickupDistanceMiles !== null &&
                                ` Estimated distance: ${opp.listing.pickupDistanceMiles} miles.`}
                            </p>
                          </div>
                        )}

                        {displayedMarketDetails.length > 0 && (
                          <div
                            className="fp-glass-sm p-4 mb-4"
                            data-testid="market-insights"
                          >
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Market Insights</p>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {displayedMarketDetails.map((detail) => (
                                <div key={`${opp.id}-market-${detail.label}`}>
                                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{detail.label}</p>
                                  <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{detail.value}</p>
                                </div>
                              ))}
                            </div>
                            {/* Story 5.4: Low seller rating warning (AC #4) — uses platform thresholds
                                to avoid false positives from LLM-driven authenticityRisk escalation */}
                            {opp.listing.sellerRating !== null &&
                              ((opp.listing.platform === 'EBAY' && opp.listing.sellerRating < 97) ||
                                (opp.listing.platform === 'MERCARI' &&
                                  opp.listing.sellerRating < 4.0)) && (
                                <div
                                  className="fp-alert-warn"
                                  style={{ marginTop: 12 }}
                                  data-testid="low-seller-rating-warning"
                                >
                                  <span style={{ fontSize: 13, color: '#fcd34d' }}>
                                    ⚠️ Low Seller Rating — Below-average feedback. Verify item condition carefully before purchasing.
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                        {(displayedRecommendationDetails.length > 0 ||
                          opp.listing.resaleStrategy ||
                          opp.listing.analysisReasoning) && (
                          <div
                            className="fp-glass-sm p-4 mb-4"
                            data-testid="recommendation-details"
                          >
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                              Strategy & Recommendations
                            </p>
                            {displayedRecommendationDetails.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                {displayedRecommendationDetails.map((detail) => (
                                  <div key={`${opp.id}-rec-${detail.label}`}>
                                    <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{detail.label}</p>
                                    <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{detail.value}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {opp.listing.resaleStrategy && (
                              <div className="mb-3">
                                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Resale Strategy</p>
                                <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                                  {opp.listing.resaleStrategy}
                                </p>
                              </div>
                            )}
                            {opp.listing.analysisReasoning && (
                              <div>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Analysis Reasoning</p>
                                <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                                  {opp.listing.analysisReasoning}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {listingTags.length > 0 && (
                          <div className="mb-4">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Detected Tags</p>
                            <div className="flex flex-wrap gap-2">
                              {listingTags.map((tag) => (
                                <span
                                  key={`${opp.id}-${tag}`}
                                  className="fp-badge fp-badge-gray"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <TagIcon className="w-3 h-3" style={{ color: '#c4b5fd' }} />#{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {opp.listing.description && (
                          <div className="fp-glass-sm p-4 mb-4">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Listing Description</p>
                            <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                              {opp.listing.description}
                            </p>
                          </div>
                        )}

                        {opp.listing.priceReasoning && (
                          <div className="fp-glass-sm p-4 mb-4">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Pricing Reasoning</p>
                            <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                              {opp.listing.priceReasoning}
                            </p>
                          </div>
                        )}

                        {hasSellerDetails && (
                          <div className="fp-glass-sm p-4 mb-4">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Seller Details</p>
                            <div className="flex flex-col gap-2" style={{ fontSize: 14, color: '#e2e8f0' }}>
                              {opp.listing.sellerName && (
                                <span className="flex items-center gap-2">
                                  <User className="w-4 h-4" style={{ color: '#c4b5fd' }} />
                                  {opp.listing.sellerName}
                                </span>
                              )}
                              {opp.listing.sellerContact && (
                                <span className="flex items-center gap-2 break-all">
                                  {opp.listing.sellerContact.includes('@') ? (
                                    <Mail className="w-4 h-4" style={{ color: '#c4b5fd' }} />
                                  ) : (
                                    <Phone className="w-4 h-4" style={{ color: '#c4b5fd' }} />
                                  )}
                                  {opp.listing.sellerContact}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {opp.listing.requestToBuy !== null &&
                          opp.listing.requestToBuy !== undefined && (
                            <div className="fp-glass-sm p-4 mb-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p
                                    className="flex items-center gap-2"
                                    style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}
                                  >
                                    <MessageSquare className="w-4 h-4" style={{ color: '#c4b5fd' }} />
                                    Purchase Message
                                  </p>
                                  <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                                    {opp.listing.requestToBuy}
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    handleCopyMessage(opp.id, opp.listing.requestToBuy || '')
                                  }
                                  className="fp-btn-ghost flex items-center gap-2"
                                  style={{ fontSize: 12, padding: '6px 12px' }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  {copiedMessageId === opp.id ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          )}

                        {comparableUrls.length > 0 && (
                          <div className="fp-glass-sm p-4 mb-4">
                            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Comparable Listings</p>
                            <div className="flex flex-col gap-2">
                              {comparableUrls.map((comp, index) => (
                                <a
                                  key={`${opp.id}-comp-${index}`}
                                  href={comp.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="fp-glass-sm flex flex-col transition-all"
                                  style={{ padding: '8px 12px', textDecoration: 'none' }}
                                >
                                  <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                    {comp.label}
                                  </span>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                    {comp.platform} • {comp.type}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {(comparableSales.length > 0 || opp.listing.compMatchConfidence === 'insufficient') && (
                          <div className="fp-glass-sm p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <p style={{ fontSize: 12, color: '#94a3b8' }}>Comparable Sold Listings</p>
                              {opp.listing.compMatchConfidence && (
                                <span
                                  className={(() => {
                                    switch (opp.listing.compMatchConfidence) {
                                      case 'high':
                                        return 'fp-badge fp-badge-green';
                                      case 'medium':
                                        return 'fp-badge fp-badge-yellow';
                                      case 'low':
                                        return 'fp-badge fp-badge-orange';
                                      default:
                                        return 'fp-badge fp-badge-gray';
                                    }
                                  })()}
                                >
                                  {opp.listing.compMatchConfidence === 'insufficient'
                                    ? 'Insufficient Market Data'
                                    : `${opp.listing.compMatchConfidence.charAt(0).toUpperCase() + opp.listing.compMatchConfidence.slice(1)} Confidence`}
                                </span>
                              )}
                            </div>
                            {comparableSales.length === 0 && opp.listing.compMatchConfidence === 'insufficient' && (
                              <p style={{ fontSize: 14, color: '#64748b', fontStyle: 'italic' }}>
                                No comparable sold listings found for this item.
                              </p>
                            )}
                            <div className="flex flex-col gap-3">
                              {comparableSales.map((sale, index) => (
                                <div
                                  key={`${opp.id}-sale-${index}`}
                                  className="fp-glass-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                                  style={{ padding: '8px 12px' }}
                                >
                                  <div>
                                    <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>{sale.title}</p>
                                    {sale.soldAt && (
                                      <p style={{ fontSize: 12, color: '#94a3b8' }}>
                                        Sold {formatDateTime(sale.soldAt)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#34d399' }}>
                                      {sale.price ? formatCurrency(sale.price) : '—'}
                                    </span>
                                    {sale.url && (
                                      <a
                                        href={sale.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 transition-colors"
                                        style={{ fontSize: 12, color: '#c4b5fd', textDecoration: 'none' }}
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
                          <div className="fp-glass-sm p-4 mb-4 space-y-4">
                            {opp.listing.priceReasoning && (
                              <div>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Value Reasoning</p>
                                <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                                  {opp.listing.priceReasoning}
                                </p>
                              </div>
                            )}
                            {opp.listing.notes && (
                              <div>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Listing Notes</p>
                                <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                                  {opp.listing.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Editing Form or Display */}
                        {editingId === opp.id ? (
                          <div className="fp-glass-sm p-4 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label
                                  className="block text-sm font-medium mb-2"
                                  style={{ color: '#c4b5fd' }}
                                >
                                  Status
                                </label>
                                <select
                                  value={editForm.status || ''}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, status: e.target.value })
                                  }
                                  className="fp-input w-full"
                                >
                                  <option value="IDENTIFIED" style={{ background: '#1e293b' }}>
                                    Identified
                                  </option>
                                  <option value="CONTACTED" style={{ background: '#1e293b' }}>
                                    Contacted
                                  </option>
                                  <option value="PURCHASED" style={{ background: '#1e293b' }}>
                                    Purchased
                                  </option>
                                  <option value="LISTED" style={{ background: '#1e293b' }}>
                                    Listed
                                  </option>
                                  <option value="SOLD" style={{ background: '#1e293b' }}>
                                    Sold
                                  </option>
                                </select>
                              </div>

                              <div>
                                <label
                                  className="block text-sm font-medium mb-2"
                                  style={{ color: '#c4b5fd' }}
                                >
                                  Purchase Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.purchasePrice || ''}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      purchasePrice: parseFloat(e.target.value) || null,
                                    })
                                  }
                                  className="fp-input w-full"
                                  placeholder="0.00"
                                />
                              </div>

                              <div>
                                <label
                                  className="block text-sm font-medium mb-2"
                                  style={{ color: '#c4b5fd' }}
                                >
                                  Resale Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.resalePrice || ''}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      resalePrice: parseFloat(e.target.value) || null,
                                    })
                                  }
                                  className="fp-input w-full"
                                  placeholder="0.00"
                                />
                              </div>

                              <div>
                                <label
                                  className="block text-sm font-medium mb-2"
                                  style={{ color: '#c4b5fd' }}
                                >
                                  Fees
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.fees || ''}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      fees: parseFloat(e.target.value) || null,
                                    })
                                  }
                                  className="fp-input w-full"
                                  placeholder="0.00"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label
                                  className="block text-sm font-medium mb-2"
                                  style={{ color: '#c4b5fd' }}
                                >
                                  Resale Platform
                                </label>
                                <input
                                  type="text"
                                  value={editForm.resalePlatform || ''}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      resalePlatform: e.target.value,
                                    })
                                  }
                                  className="fp-input w-full"
                                  placeholder="e.g., eBay, Facebook Marketplace"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label
                                  className="block text-sm font-medium mb-2"
                                  style={{ color: '#c4b5fd' }}
                                >
                                  Notes
                                </label>
                                <textarea
                                  value={editForm.notes || ''}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, notes: e.target.value })
                                  }
                                  rows={3}
                                  className="fp-input w-full"
                                  placeholder="Add notes about this opportunity..."
                                />
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEditing(opp.id)}
                                className="fp-btn-primary flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Save Changes
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="fp-btn-ghost flex items-center gap-2"
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
                              <div className="fp-glass-sm p-4 mb-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {opp.purchasePrice && (
                                    <div>
                                      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                                        Purchase Price
                                      </p>
                                      <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        ${opp.purchasePrice.toFixed(2)}
                                      </p>
                                    </div>
                                  )}
                                  {opp.resalePrice && (
                                    <div>
                                      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Resale Price</p>
                                      <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        ${opp.resalePrice.toFixed(2)}
                                      </p>
                                    </div>
                                  )}
                                  {opp.fees && (
                                    <div>
                                      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Fees</p>
                                      <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                                        ${opp.fees.toFixed(2)}
                                      </p>
                                    </div>
                                  )}
                                  {opp.actualProfit !== null && (
                                    <div>
                                      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Actual Profit</p>
                                      <p
                                        style={{
                                          fontSize: 14,
                                          fontWeight: 600,
                                          color: opp.actualProfit >= 0 ? '#34d399' : '#f87171',
                                        }}
                                      >
                                        ${opp.actualProfit.toFixed(2)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {opp.notes && (
                                  <div
                                    className="mt-3 pt-3"
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                                  >
                                    <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Notes</p>
                                    <p style={{ fontSize: 14, color: '#e2e8f0' }}>{opp.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <a
                            href={opp.listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fp-btn-primary flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Listing
                          </a>
                          {editingId !== opp.id && (
                            <>
                              <button
                                onClick={() => startEditing(opp)}
                                className="fp-btn-ghost flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => deleteOpportunity(opp.id)}
                                className="fp-btn-ghost flex items-center gap-2"
                                style={{ color: '#f87171' }}
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

      {/* Kanban Lifecycle Modals */}

      {/* PURCHASED Modal */}
      {pendingKanbanMove?.targetStatus === 'PURCHASED' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div
            role="dialog"
            aria-label="Mark as Purchased"
            className="fp-glass max-w-md w-full mx-4 p-6"
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Mark as Purchased</h2>
            <div className="mb-5">
              <label
                htmlFor="modal-purchase-price"
                className="block text-sm mb-1"
                style={{ color: '#c4b5fd' }}
              >
                Purchase Price *
              </label>
              <input
                id="modal-purchase-price"
                type="number"
                min="0"
                step="0.01"
                value={modalPurchasePrice}
                onChange={(e) => setModalPurchasePrice(e.target.value)}
                className="fp-input w-full"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelKanbanModal}
                className="fp-btn-ghost"
                style={{ fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchasedModal}
                disabled={!modalPurchasePrice}
                className="fp-btn-primary"
                style={{ fontSize: 14, opacity: !modalPurchasePrice ? 0.4 : 1 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTED Modal */}
      {pendingKanbanMove?.targetStatus === 'LISTED' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div
            role="dialog"
            aria-label="Mark as Listed"
            className="fp-glass max-w-md w-full mx-4 p-6"
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Mark as Listed</h2>
            <div className="mb-5">
              <label
                htmlFor="modal-resale-url"
                className="block text-sm mb-1"
                style={{ color: '#c4b5fd' }}
              >
                Resale URL *
              </label>
              <input
                id="modal-resale-url"
                type="url"
                value={modalResaleUrl}
                onChange={(e) => setModalResaleUrl(e.target.value)}
                className="fp-input w-full"
                placeholder="https://ebay.com/..."
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelKanbanModal}
                className="fp-btn-ghost"
                style={{ fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmListedModal}
                disabled={!modalResaleUrl}
                className="fp-btn-primary"
                style={{ fontSize: 14, opacity: !modalResaleUrl ? 0.4 : 1 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOLD Modal */}
      {pendingKanbanMove?.targetStatus === 'SOLD' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        >
          <div
            role="dialog"
            aria-label="Mark as Sold"
            className="fp-glass max-w-md w-full mx-4 p-6"
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Mark as Sold</h2>
            <div className="mb-4">
              <label
                htmlFor="modal-sale-price"
                className="block text-sm mb-1"
                style={{ color: '#c4b5fd' }}
              >
                Sale Price *
              </label>
              <input
                id="modal-sale-price"
                type="number"
                min="0"
                step="0.01"
                value={modalSalePrice}
                onChange={(e) => setModalSalePrice(e.target.value)}
                className="fp-input w-full"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="mb-5">
              <label
                htmlFor="modal-fees"
                className="block text-sm mb-1"
                style={{ color: '#c4b5fd' }}
              >
                Fees (optional)
              </label>
              <input
                id="modal-fees"
                type="number"
                min="0"
                step="0.01"
                value={modalFees}
                onChange={(e) => setModalFees(e.target.value)}
                className="fp-input w-full"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelKanbanModal}
                className="fp-btn-ghost"
                style={{ fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSoldModal}
                disabled={!modalSalePrice}
                className="fp-btn-primary"
                style={{ fontSize: 14, opacity: !modalSalePrice ? 0.4 : 1 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
