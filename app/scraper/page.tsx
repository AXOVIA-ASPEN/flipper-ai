/**
 * @file app/scraper/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 2.0
 * @brief Scraper management page rebuilt on the canonical dark-glassmorphism design system.
 *
 * @description
 * Renders the multi-marketplace scrape form, real-time SSE progress indicator, save-config
 * flow, scraped-listings preview, tier-limit upgrade prompt, and full job-history table with
 * status/date filters. The migration is purely visual — all SSE subscription mechanics,
 * tier-limit handling, save/load config logic, fetch/delete job lifecycle, and the
 * `data-testid="scrape-progress-*"` attribute set are preserved verbatim per ADR-14.9-E so
 * Story 3.7's regression suite continues to pass. Surfaces collapse to canonical .fp-glass /
 * .fp-glass-nav / .fp-glass-sm; inputs use .fp-input; buttons use .fp-btn-primary /
 * .fp-btn-ghost; alerts use .fp-alert-success / .fp-alert-danger; status pills use
 * .fp-badge .fp-badge-{green|red|purple|gray}. Progress-bar fills use inline purple gradient
 * (running/complete) and red gradient (failed) per AC #4 and pre-mortem P-4.
 */

'use client';

import { useState, useEffect } from 'react';
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
  Clock,
  Trash2,
  RefreshCw,
  XCircle,
  History,
  Bookmark,
  Save,
  ChevronDown,
  Calendar,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import UpgradePrompt from '@/components/UpgradePrompt';
import type { SubscriptionTier } from '@/lib/subscription-tiers';
import { useSseEvents } from '@/hooks/useSseEvents';
import type { SseEventType } from '@/lib/sse-emitter';
import { LoadingSkeleton, EmptyState } from '@/components/ui';
import { getStatusColor, getStatusBadgeClass } from '@/lib/scraper-status';

// Story 3.7: Stable reference outside component prevents EventSource reconnect loops.
const SSE_EVENT_TYPES: SseEventType[] = [
  'job.started',
  'job.progress',
  'job.complete',
  'job.failed',
  'listing.found',
];

const TEXT_PRIMARY = '#e2e8f0';
const TEXT_SECONDARY = '#94a3b8';
const PURPLE_ACCENT = '#c4b5fd';
const PROFIT_GREEN = '#34d399';
const DANGER_RED = '#f87171';
const DANGER_RED_SOFT = '#fca5a5';
const RUNNING_PURPLE = '#a78bfa';
const PROGRESS_TRACK = 'rgba(255,255,255,0.06)';
const PROGRESS_FILL_RUNNING = 'linear-gradient(90deg, #7c3aed, #a78bfa)';
const PROGRESS_FILL_FAILED = 'linear-gradient(90deg, #f87171, #fca5a5)';
const ACTIVE_FILTER_BG = 'rgba(124,58,237,0.15)';

interface SseListingFoundData {
  jobId?: string;
  platform?: string;
  title?: string;
  price?: number;
  askingPrice?: number;
  discount?: number;
}

interface SseJobProgressData {
  jobId?: string;
  platform?: string;
  current?: number;
  total?: number | null;
  percentage?: number | null;
  listingsFound?: number;
}

interface SseJobFailedData {
  jobId?: string;
  platform?: string;
  errorMessage?: string;
}

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
  opportunitiesFound?: number;
  jobId?: string;
  error?: string;
}

interface ScraperJob {
  id: string;
  platform: string;
  location: string | null;
  category: string | null;
  status: string;
  listingsFound: number;
  opportunitiesFound: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface SearchConfig {
  id: string;
  name: string;
  platform: string;
  location: string;
  category: string | null;
  keywords: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  enabled: boolean;
  lastRun: string | null;
}

function inferCurrentTier(errorDetail: string, details?: Record<string, unknown>): SubscriptionTier {
  if (details?.tier && typeof details.tier === 'string') {
    const tier = details.tier as SubscriptionTier;
    if (['FREE', 'FLIPPER', 'PRO'].includes(tier)) return tier;
  }
  if (errorDetail.includes('FREE plan') || errorDetail.includes('Upgrade to FLIPPER')) return 'FREE';
  if (errorDetail.includes('FLIPPER plan') || errorDetail.includes('Upgrade to PRO')) return 'FLIPPER';
  return 'FREE';
}

function inferFeatureName(errorDetail: string): string {
  if (errorDetail.includes('scan limit') || errorDetail.includes('scans')) return 'Scanning';
  if (errorDetail.includes('marketplace')) return 'Marketplaces';
  if (errorDetail.includes('Search config') || errorDetail.includes('search config')) return 'Saved Searches';
  return 'Feature';
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="w-4 h-4" />;
    case 'RUNNING':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'FAILED':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

const FORM_LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: TEXT_PRIMARY,
  marginBottom: 8,
};

const FILTER_BTN_STYLE = (active: boolean): React.CSSProperties =>
  active ? { background: ACTIVE_FILTER_BG, color: PURPLE_ACCENT } : {};

export default function ScraperPage() {
  const [platform, setPlatform] = useState('craigslist');
  const [location, setLocation] = useState('sarasota');
  const [category, setCategory] = useState('electronics');
  const [keywords, setKeywords] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  // Story 3.7: Real-time SSE subscription for job lifecycle events.
  const { events: sseEvents, clearEvents: clearSseEvents } = useSseEvents({
    eventTypes: SSE_EVENT_TYPES,
  });
  const [tierLimitError, setTierLimitError] = useState<{
    message: string;
    currentTier: SubscriptionTier;
    feature: string;
  } | null>(null);

  // Job history state
  const [jobs, setJobs] = useState<ScraperJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('');
  const [jobDateFilter, setJobDateFilter] = useState<string>('');

  // Saved configs state
  const [savedConfigs, setSavedConfigs] = useState<SearchConfig[]>([]);
  const [showSavedConfigs, setShowSavedConfigs] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveConfigName, setSaveConfigName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configMessage, setConfigMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchSavedConfigs();
  }, []);

  async function fetchSavedConfigs() {
    try {
      const response = await fetch('/api/search-configs?enabled=true');
      const data = await response.json();
      setSavedConfigs(data.configs || []);
    } catch (error) {
      console.error('Failed to fetch saved configs:', error);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setConfigMessage({ type, text });
    setTimeout(() => setConfigMessage(null), 4000);
  }

  function loadConfig(config: SearchConfig) {
    const configPlatform = config.platform.toLowerCase();
    setPlatform(configPlatform);
    setLocation(config.location);
    setCategory(config.category || 'electronics');
    setKeywords(config.keywords || '');
    setMinPrice(config.minPrice?.toString() || '');
    setMaxPrice(config.maxPrice?.toString() || '');
    setShowSavedConfigs(false);
    showMessage('success', `Loaded "${config.name}"`);
  }

  async function handleSaveConfig() {
    if (!saveConfigName.trim()) return;
    setSavingConfig(true);
    setTierLimitError(null);
    try {
      const response = await fetch('/api/search-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveConfigName,
          platform: platform.toUpperCase(),
          location,
          category,
          keywords: keywords || null,
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
          enabled: true,
        }),
      });
      if (response.ok) {
        showMessage('success', 'Search saved!');
        setShowSaveDialog(false);
        setSaveConfigName('');
        fetchSavedConfigs();
      } else {
        const data = await response.json();
        if (response.status === 403 && data.error?.code === 'FORBIDDEN') {
          const detail = data.error.detail || data.error.message || 'Feature limit reached.';
          setTierLimitError({
            message: detail,
            currentTier: inferCurrentTier(detail, data.error.details),
            feature: inferFeatureName(detail),
          });
          setShowSaveDialog(false);
          setSaveConfigName('');
        } else {
          showMessage('error', data.error?.detail || data.error?.message || 'Failed to save');
        }
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      showMessage('error', 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  }

  async function fetchJobs(status?: string, dateRange?: string) {
    setJobsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      const statusToUse = status ?? jobStatusFilter;
      const dateToUse = dateRange ?? jobDateFilter;

      if (statusToUse) params.set('status', statusToUse);

      const response = await fetch(`/api/scraper-jobs?${params}`);
      const data = await response.json();
      let filteredJobs = data.jobs || [];

      if (dateToUse) {
        const now = new Date();
        let cutoff: Date;
        switch (dateToUse) {
          case 'today':
            cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoff = new Date(0);
        }
        filteredJobs = filteredJobs.filter((job: ScraperJob) => new Date(job.createdAt) >= cutoff);
      }

      setJobs(filteredJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  }

  function handleStatusFilterChange(status: string) {
    setJobStatusFilter(status);
    fetchJobs(status, jobDateFilter);
  }

  function handleDateFilterChange(dateRange: string) {
    setJobDateFilter(dateRange);
    fetchJobs(jobStatusFilter, dateRange);
  }

  async function deleteJob(id: string) {
    if (!confirm('Delete this job from history?')) return;
    try {
      await fetch(`/api/scraper-jobs/${id}`, { method: 'DELETE' });
      fetchJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  }

  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    if (newPlatform === 'offerup') {
      setLocation('sarasota-fl');
    } else {
      setLocation('sarasota');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setTierLimitError(null);
    clearSseEvents();

    const apiEndpoint = platform === 'offerup' ? '/api/scraper/offerup' : '/api/scraper/craigslist';

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          category,
          keywords: keywords || undefined,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        }),
      });

      const data = await response.json();

      if (response.status === 403 && data.error?.code === 'FORBIDDEN') {
        const detail = data.error.detail || data.error.message || 'Feature limit reached.';
        setTierLimitError({
          message: detail,
          currentTier: inferCurrentTier(detail, data.error.details),
          feature: inferFeatureName(detail),
        });
        fetchJobs();
        return;
      }

      setResult(data);
      fetchJobs();
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to run scraper',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      fetchJobs();
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'sporting', label: 'Sporting Goods' },
    { value: 'tools', label: 'Tools' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'antiques', label: 'Antiques' },
    { value: 'video_gaming', label: 'Video Gaming' },
    { value: 'music_instr', label: 'Musical Instruments' },
    { value: 'computers', label: 'Computers' },
    { value: 'cell_phones', label: 'Cell Phones' },
  ];

  const craigslistLocations = [
    { value: 'sarasota', label: 'Sarasota, FL' },
    { value: 'tampa', label: 'Tampa, FL' },
    { value: 'orlando', label: 'Orlando, FL' },
    { value: 'miami', label: 'Miami, FL' },
    { value: 'jacksonville', label: 'Jacksonville, FL' },
    { value: 'sfbay', label: 'San Francisco Bay Area' },
    { value: 'losangeles', label: 'Los Angeles, CA' },
    { value: 'newyork', label: 'New York, NY' },
    { value: 'chicago', label: 'Chicago, IL' },
    { value: 'seattle', label: 'Seattle, WA' },
    { value: 'austin', label: 'Austin, TX' },
    { value: 'denver', label: 'Denver, CO' },
  ];

  const offerupLocations = [
    { value: 'sarasota-fl', label: 'Sarasota, FL' },
    { value: 'tampa-fl', label: 'Tampa, FL' },
    { value: 'orlando-fl', label: 'Orlando, FL' },
    { value: 'miami-fl', label: 'Miami, FL' },
    { value: 'jacksonville-fl', label: 'Jacksonville, FL' },
    { value: 'san-francisco-ca', label: 'San Francisco, CA' },
    { value: 'los-angeles-ca', label: 'Los Angeles, CA' },
    { value: 'new-york-ny', label: 'New York, NY' },
    { value: 'chicago-il', label: 'Chicago, IL' },
    { value: 'seattle-wa', label: 'Seattle, WA' },
    { value: 'austin-tx', label: 'Austin, TX' },
    { value: 'denver-co', label: 'Denver, CO' },
    { value: 'phoenix-az', label: 'Phoenix, AZ' },
    { value: 'atlanta-ga', label: 'Atlanta, GA' },
    { value: 'dallas-tx', label: 'Dallas, TX' },
  ];

  const locations = platform === 'offerup' ? offerupLocations : craigslistLocations;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', color: TEXT_PRIMARY }}>
      {/* Header */}
      <header className="fp-glass-nav" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 16 }}>
            <Link href="/" className="fp-btn-ghost" aria-label="Back to dashboard" style={{ padding: 8 }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div
              style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              }}
            >
              <Search className="w-6 h-6" style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT_PRIMARY }}>Scrape Listings</h1>
              <p style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                Find deals on {platform === 'offerup' ? 'OfferUp' : 'Craigslist'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Page content — landmark provided by app/layout.tsx <main>. */}
      <div style={{ position: 'relative', maxWidth: 1024, margin: '0 auto', padding: '32px 24px' }}>
        {/* Config Message Toast */}
        {configMessage && (
          <div
            className={configMessage.type === 'success' ? 'fp-alert-success' : 'fp-alert-danger'}
            style={{ position: 'fixed', top: 80, right: 16, zIndex: 50, padding: 16, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360 }}
          >
            {configMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5" style={{ color: PROFIT_GREEN }} />
            ) : (
              <AlertCircle className="w-5 h-5" style={{ color: DANGER_RED }} />
            )}
            <span style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600 }}>{configMessage.text}</span>
          </div>
        )}

        {/* Saved Searches Quick Select */}
        {savedConfigs.length > 0 && (
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowSavedConfigs(!showSavedConfigs)}
              className="fp-btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              aria-expanded={showSavedConfigs}
            >
              <Bookmark className="w-4 h-4" style={{ color: PURPLE_ACCENT }} />
              <span>Saved Searches</span>
              <ChevronDown
                className="w-4 h-4"
                style={{ transition: 'transform 0.2s', transform: showSavedConfigs ? 'rotate(180deg)' : 'none' }}
              />
            </button>
            {showSavedConfigs && (
              <div
                className="fp-glass"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 8,
                  width: 320,
                  zIndex: 20,
                  overflow: 'hidden',
                  padding: 0,
                }}
              >
                <div className="fp-glass-sm" style={{ padding: 8, borderRadius: 0 }}>
                  <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>Click to load search parameters</span>
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {savedConfigs.map((config) => (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => loadConfig(config)}
                      style={{
                        width: '100%',
                        padding: 12,
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        color: TEXT_PRIMARY,
                      }}
                      data-fp-row-hover="true"
                    >
                      <div style={{ fontWeight: 500, color: TEXT_PRIMARY, fontSize: 13 }}>{config.name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, fontSize: 12, color: TEXT_SECONDARY }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin className="w-3 h-3" />
                          {locations.find((l) => l.value === config.location)?.label || config.location}
                        </span>
                        {config.category && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Tag className="w-3 h-3" />
                            {categories.find((c) => c.value === config.category)?.label || config.category}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="fp-glass-sm" style={{ padding: 8, borderRadius: 0 }}>
                  <Link
                    href="/settings"
                    style={{ display: 'block', textAlign: 'center', fontSize: 12, color: PURPLE_ACCENT, textDecoration: 'none' }}
                    className="hover:underline"
                  >
                    Manage in Settings →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scraper Form */}
        <form onSubmit={handleSubmit} className="fp-glass" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            <div>
              <label style={FORM_LABEL_STYLE} htmlFor="scraper-platform">Platform</label>
              <select
                id="scraper-platform"
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="fp-input"
              >
                <option value="craigslist">Craigslist</option>
                <option value="offerup">OfferUp</option>
                <option value="facebook" disabled>Facebook Marketplace (coming soon)</option>
              </select>
            </div>

            <div>
              <label style={FORM_LABEL_STYLE} htmlFor="scraper-location">
                <MapPin className="w-4 h-4" style={{ display: 'inline', marginRight: 4 }} />
                Location
              </label>
              <select
                id="scraper-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="fp-input"
              >
                {locations.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={FORM_LABEL_STYLE} htmlFor="scraper-category">
                <Tag className="w-4 h-4" style={{ display: 'inline', marginRight: 4 }} />
                Category
              </label>
              <select
                id="scraper-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="fp-input"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={FORM_LABEL_STYLE} htmlFor="scraper-keywords">
                <Search className="w-4 h-4" style={{ display: 'inline', marginRight: 4 }} />
                Keywords (optional)
              </label>
              <input
                id="scraper-keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., iPhone, Nintendo, Dyson"
                className="fp-input"
              />
            </div>

            <div>
              <label style={FORM_LABEL_STYLE} htmlFor="scraper-min-price">
                <DollarSign className="w-4 h-4" style={{ display: 'inline', marginRight: 4 }} />
                Min Price
              </label>
              <input
                id="scraper-min-price"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="fp-input"
              />
            </div>

            <div>
              <label style={FORM_LABEL_STYLE} htmlFor="scraper-max-price">
                <DollarSign className="w-4 h-4" style={{ display: 'inline', marginRight: 4 }} />
                Max Price
              </label>
              <input
                id="scraper-max-price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="1000"
                min="0"
                className="fp-input"
              />
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              className="fp-btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px' }}
              data-testid="scraper-submit"
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
            <button
              type="button"
              onClick={() => setShowSaveDialog(true)}
              className="fp-btn-ghost"
              title="Save this search"
              aria-label="Save this search configuration"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px' }}
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Story 3.7: Real-time scrape progress indicator (SSE-driven) */}
        {loading && (() => {
          const platformUpper = platform.toUpperCase();
          const platformEvents = sseEvents.filter((e) => {
            const d = (e.data as { platform?: string })?.platform;
            return !d || d === platformUpper;
          });
          const latestProgress = platformEvents.find((e) => e.type === 'job.progress');
          const progressData = (latestProgress?.data as SseJobProgressData) || {};
          const percentage = progressData.percentage ?? 0;
          const current = progressData.current ?? 0;
          const total = progressData.total ?? null;
          const listingsFound = progressData.listingsFound ?? 0;
          const complete = platformEvents.find((e) => e.type === 'job.complete');
          const failed = platformEvents.find((e) => e.type === 'job.failed');
          const liveListings = platformEvents.filter((e) => e.type === 'listing.found').slice(0, 20);

          let borderColor = 'rgba(255,255,255,0.1)';
          if (complete) borderColor = 'rgba(52,211,153,0.5)';
          else if (failed) borderColor = 'rgba(248,113,113,0.5)';

          const effectivePercentage = complete ? 100 : percentage;
          const phaseLabel = platformEvents.length === 0
            ? `Connecting to ${platformUpper}...`
            : failed
              ? 'Scan Failed'
              : complete
                ? 'Scan Complete!'
                : `Scanning ${platformUpper}...`;

          const progressFill = failed ? PROGRESS_FILL_FAILED : PROGRESS_FILL_RUNNING;

          return (
            <div
              data-testid="scrape-progress-indicator"
              className="fp-glass"
              style={{ marginTop: 24, padding: 24, borderColor, transition: 'border-color 0.5s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                {failed ? (
                  <AlertCircle className="w-5 h-5" style={{ color: DANGER_RED }} />
                ) : complete ? (
                  <CheckCircle className="w-5 h-5" style={{ color: PROFIT_GREEN }} />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: RUNNING_PURPLE }} />
                )}
                <span
                  data-testid="scrape-progress-platform"
                  style={{ fontWeight: 500, color: TEXT_PRIMARY }}
                >
                  {phaseLabel}
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: 12,
                  borderRadius: 9999,
                  background: PROGRESS_TRACK,
                  overflow: 'hidden',
                }}
              >
                <div
                  data-testid="scrape-progress-bar"
                  style={{
                    height: '100%',
                    borderRadius: 9999,
                    width: `${effectivePercentage}%`,
                    background: progressFill,
                    transition: 'width 0.5s ease-out',
                  }}
                />
              </div>

              <div
                data-testid="sse-progress-region"
                aria-live="polite"
                aria-atomic="true"
                style={{ marginTop: 12, fontSize: 13, color: TEXT_SECONDARY, display: 'flex', flexWrap: 'wrap', gap: 16 }}
              >
                <span data-testid="scrape-progress-percentage">
                  {effectivePercentage}%
                </span>
                {total !== null && (
                  <span>{current}/{total} processed</span>
                )}
                <span style={{ color: PROFIT_GREEN }}>{listingsFound} opportunities</span>
              </div>

              {failed && (
                <p
                  style={{ marginTop: 12, fontSize: 13, color: DANGER_RED_SOFT }}
                  data-testid="scrape-progress-error"
                >
                  {(failed.data as SseJobFailedData).errorMessage ?? 'Scrape failed'}
                </p>
              )}

              {liveListings.length > 0 && (
                <div style={{ marginTop: 16 }} data-testid="scrape-progress-listings">
                  <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: TEXT_SECONDARY, marginBottom: 8 }}>
                    Latest finds:
                  </p>
                  {liveListings.map((ev, idx) => {
                    const d = ev.data as SseListingFoundData;
                    const price = d.price ?? d.askingPrice;
                    return (
                      <div
                        key={idx}
                        style={{ fontSize: 13, color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        • {d.title ?? 'Listing'} {price !== undefined && `— $${price}`}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Save Config Dialog */}
        {showSaveDialog && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-config-title"
          >
            <div className="fp-glass" style={{ padding: 24, maxWidth: 448, width: '100%', margin: '0 16px' }}>
              <h3
                id="save-config-title"
                style={{ fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Save className="w-5 h-5" style={{ color: PURPLE_ACCENT }} />
                Save Search Configuration
              </h3>
              <p style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 16 }}>
                Save your current search parameters for quick access later.
              </p>
              <input
                type="text"
                value={saveConfigName}
                onChange={(e) => setSaveConfigName(e.target.value)}
                placeholder="Search name (e.g., Electronics in Tampa)"
                className="fp-input"
                style={{ marginBottom: 16 }}
                autoFocus
                aria-label="Search configuration name"
              />
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p>Location: {locations.find((l) => l.value === location)?.label}</p>
                <p>Category: {categories.find((c) => c.value === category)?.label}</p>
                {keywords && <p>Keywords: {keywords}</p>}
                {(minPrice || maxPrice) && (
                  <p>Price: ${minPrice || '0'} - ${maxPrice || '∞'}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig || !saveConfigName.trim()}
                  className="fp-btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  data-testid="save-config-submit"
                >
                  {savingConfig ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveConfigName('');
                  }}
                  className="fp-btn-ghost"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tier Limit Upgrade Prompt */}
        {tierLimitError && (
          <div style={{ marginTop: 24 }} data-testid="tier-limit-upgrade">
            <UpgradePrompt
              currentTier={tierLimitError.currentTier}
              feature={tierLimitError.feature}
              message={tierLimitError.message}
            />
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ marginTop: 32 }}>
            {/* Status Message */}
            <div
              className={result.success ? 'fp-alert-success' : 'fp-alert-danger'}
              style={{ padding: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5" style={{ color: PROFIT_GREEN }} />
                ) : (
                  <AlertCircle className="w-5 h-5" style={{ color: DANGER_RED }} />
                )}
                <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{result.message}</span>
              </div>
              {result.savedCount !== undefined && (
                <p style={{ marginTop: 4, fontSize: 13, color: TEXT_SECONDARY }}>
                  {result.savedCount} listings saved to database
                </p>
              )}
              {result.error && <p style={{ marginTop: 4, fontSize: 13, color: TEXT_SECONDARY }}>{result.error}</p>}
            </div>

            {/* Scraped Listings Preview */}
            {result.listings && result.listings.length > 0 && (
              <div className="fp-glass" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
                <div className="fp-glass-sm" style={{ padding: 16, borderRadius: 0 }}>
                  <h3 style={{ fontWeight: 600, color: TEXT_PRIMARY }}>
                    Found {result.listings.length} Listings
                  </h3>
                </div>
                <div>
                  {result.listings.slice(0, 10).map((listing, index) => (
                    <div
                      key={index}
                      style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      data-fp-row-hover="true"
                    >
                      {listing.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.imageUrl}
                          alt={listing.title}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      ) : (
                        <div
                          className="fp-glass-sm"
                          style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Package className="w-6 h-6" style={{ color: TEXT_SECONDARY }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, color: TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.title}
                        </p>
                        <p style={{ fontSize: 13, color: TEXT_SECONDARY }}>{listing.location}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: PROFIT_GREEN }}>{listing.price}</p>
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 13, color: PURPLE_ACCENT, textDecoration: 'none' }}
                          className="hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                {result.listings.length > 10 && (
                  <div className="fp-glass-sm" style={{ padding: 16, textAlign: 'center', color: TEXT_SECONDARY, borderRadius: 0, fontSize: 13 }}>
                    +{result.listings.length - 10} more listings saved
                  </div>
                )}
              </div>
            )}

            {/* View Dashboard Link */}
            {result.success && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Link
                  href="/"
                  className="fp-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                >
                  View Dashboard
                  <ArrowLeft className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Job History Section */}
        <div className="fp-glass" style={{ marginTop: 32, padding: 0, overflow: 'hidden' }}>
          <div
            className="fp-glass-sm"
            style={{ padding: 16, borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History className="w-5 h-5" style={{ color: PURPLE_ACCENT }} />
              <h3 style={{ fontWeight: 600, color: TEXT_PRIMARY }}>Scraper Job History</h3>
            </div>
            <button
              type="button"
              onClick={() => fetchJobs()}
              className="fp-btn-ghost"
              aria-label="Refresh job history"
              style={{ padding: 6 }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filters */}
          <div
            className="fp-glass-sm"
            style={{ padding: 12, borderRadius: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: TEXT_SECONDARY }}>
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {['', 'COMPLETED', 'FAILED', 'RUNNING'].map((status) => {
                const active = jobStatusFilter === status;
                return (
                  <button
                    key={status || 'all'}
                    type="button"
                    onClick={() => handleStatusFilterChange(status)}
                    className="fp-btn-ghost"
                    aria-pressed={active}
                    style={{ padding: '4px 10px', fontSize: 12, ...FILTER_BTN_STYLE(active) }}
                  >
                    {status || 'All'}
                  </button>
                );
              })}
            </div>

            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />

            {/* Date Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY }} />
              {[
                { value: '', label: 'All time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This week' },
                { value: 'month', label: 'This month' },
              ].map((option) => {
                const active = jobDateFilter === option.value;
                return (
                  <button
                    key={option.value || 'all-time'}
                    type="button"
                    onClick={() => handleDateFilterChange(option.value)}
                    className="fp-btn-ghost"
                    aria-pressed={active}
                    style={{ padding: '4px 10px', fontSize: 12, ...FILTER_BTN_STYLE(active) }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {(jobStatusFilter || jobDateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setJobStatusFilter('');
                  setJobDateFilter('');
                  fetchJobs('', '');
                }}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  fontSize: 12,
                  color: DANGER_RED_SOFT,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                className="hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {jobsLoading ? (
            <div style={{ padding: 16 }}>
              <LoadingSkeleton variant="list" rows={3} />
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState
                title={jobStatusFilter || jobDateFilter ? 'No jobs match the current filters' : 'No scraper jobs yet'}
                message={
                  jobStatusFilter || jobDateFilter
                    ? 'Try clearing the filters to see all jobs.'
                    : 'Run your first scrape above to see job history.'
                }
              />
            </div>
          ) : (
            <div>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                  data-fp-row-hover="true"
                >
                  <div style={{ color: getStatusColor(job.status) }}>
                    <StatusIcon status={job.status} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{job.platform}</span>
                      <span className={getStatusBadgeClass(job.status)}>{job.status}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: TEXT_SECONDARY }}>
                      {job.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      {job.category && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Tag className="w-3 h-3" />
                          {job.category}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {job.errorMessage && (
                      <p style={{ fontSize: 12, color: DANGER_RED_SOFT, marginTop: 4 }}>{job.errorMessage}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, color: TEXT_PRIMARY }}>{job.listingsFound} listings</p>
                    {job.opportunitiesFound > 0 && (
                      <p style={{ fontSize: 12, color: PROFIT_GREEN }}>
                        {job.opportunitiesFound} opportunities
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteJob(job.id)}
                    className="fp-btn-ghost"
                    aria-label="Delete job"
                    style={{ padding: 6 }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
