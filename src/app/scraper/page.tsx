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

export default function ScraperPage() {
  const [platform, setPlatform] = useState('craigslist');
  const [location, setLocation] = useState('sarasota');
  const [category, setCategory] = useState('electronics');
  const [keywords, setKeywords] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  // Job history state
  const [jobs, setJobs] = useState<ScraperJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('');
  const [jobDateFilter, setJobDateFilter] = useState<string>(''); // "today", "week", "month", ""

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
    // Set platform first, then location (to match platform's location format)
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
        showMessage('error', data.error || 'Failed to save');
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

      // Client-side date filtering
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

  function getStatusColor(status: string) {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400';
      case 'RUNNING':
        return 'text-blue-400';
      case 'FAILED':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  function getStatusIcon(status: string) {
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

  // Reset location when platform changes
  const handlePlatformChange = (newPlatform: string) => {
    setPlatform(newPlatform);
    // Set default location for the new platform
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

    // Determine API endpoint based on platform
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
      setResult(data);
      // Refresh job history after scrape
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

  // Craigslist locations (subdomain format)
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

  // OfferUp locations (city-state format)
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

  // Get locations based on selected platform
  const locations = platform === 'offerup' ? offerupLocations : craigslistLocations;

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50 group"
            >
              <ArrowLeft className="w-5 h-5 text-white group-hover:text-purple-200 transition-colors" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse-slow">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-transparent">
                Scrape Listings
              </h1>
              <p className="text-xs text-blue-200/70">
                Find deals on {platform === 'offerup' ? 'OfferUp' : 'Craigslist'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Config Message Toast */}
        {configMessage && (
          <div
            className={`fixed top-20 right-4 z-50 p-4 rounded-xl border shadow-lg flex items-center gap-2 ${
              configMessage.type === 'success'
                ? 'backdrop-blur-xl bg-gradient-to-r from-green-400/20 to-emerald-600/20 border-green-400/50 text-white'
                : 'backdrop-blur-xl bg-gradient-to-r from-red-400/20 to-pink-600/20 border-red-400/50 text-white'
            }`}
          >
            {configMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-300" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-300" />
            )}
            {configMessage.text}
          </div>
        )}

        {/* Saved Searches Quick Select */}
        {savedConfigs.length > 0 && (
          <div className="mb-4 relative">
            <button
              type="button"
              onClick={() => setShowSavedConfigs(!showSavedConfigs)}
              className="flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/10 rounded-lg border border-white/20 text-white hover:bg-white/15 transition-all"
            >
              <Bookmark className="w-4 h-4 text-purple-300" />
              <span>Saved Searches</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showSavedConfigs ? 'rotate-180' : ''}`}
              />
            </button>
            {showSavedConfigs && (
              <div className="absolute top-full left-0 mt-2 w-80 backdrop-blur-xl bg-slate-800/95 rounded-xl border border-white/20 shadow-2xl z-20 overflow-hidden">
                <div className="p-2 border-b border-white/10 bg-white/5">
                  <span className="text-xs text-blue-200/70">Click to load search parameters</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {savedConfigs.map((config) => (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => loadConfig(config)}
                      className="w-full p-3 text-left hover:bg-white/10 transition-all border-b border-white/5 last:border-0"
                    >
                      <div className="font-medium text-white text-sm">{config.name}</div>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-blue-200/60">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {locations.find((l) => l.value === config.location)?.label ||
                            config.location}
                        </span>
                        {config.category && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {categories.find((c) => c.value === config.category)?.label ||
                              config.category}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-white/10 bg-white/5">
                  <Link
                    href="/settings"
                    className="block text-center text-xs text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    Manage in Settings →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scraper Form */}
        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white transition-all duration-300 hover:bg-white/15"
              >
                <option value="craigslist" className="bg-slate-800 text-white">
                  Craigslist
                </option>
                <option value="offerup" className="bg-slate-800 text-white">
                  OfferUp
                </option>
                <option value="facebook" disabled className="bg-slate-800 text-gray-400">
                  Facebook Marketplace (coming soon)
                </option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white transition-all duration-300 hover:bg-white/15"
              >
                {locations.map((loc) => (
                  <option key={loc.value} value={loc.value} className="bg-slate-800 text-white">
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white transition-all duration-300 hover:bg-white/15"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-slate-800 text-white">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Keywords (optional)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., iPhone, Nintendo, Dyson"
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300 hover:bg-white/15"
              />
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Min Price
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300 hover:bg-white/15"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Max Price
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="1000"
                min="0"
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white placeholder-blue-200/50 transition-all duration-300 hover:bg-white/15"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/80 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
              className="flex items-center justify-center gap-2 px-4 py-3 backdrop-blur-xl bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
              title="Save this search"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Save Config Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="backdrop-blur-xl bg-slate-800/95 rounded-xl border border-white/20 p-6 shadow-2xl w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Save className="w-5 h-5 text-purple-300" />
                Save Search Configuration
              </h3>
              <p className="text-sm text-blue-200/70 mb-4">
                Save your current search parameters for quick access later.
              </p>
              <input
                type="text"
                value={saveConfigName}
                onChange={(e) => setSaveConfigName(e.target.value)}
                placeholder="Search name (e.g., Electronics in Tampa)"
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50 mb-4"
                autoFocus
              />
              <div className="text-xs text-blue-200/50 mb-4 space-y-1">
                <p>Location: {locations.find((l) => l.value === location)?.label}</p>
                <p>Category: {categories.find((c) => c.value === category)?.label}</p>
                {keywords && <p>Keywords: {keywords}</p>}
                {(minPrice || maxPrice) && (
                  <p>
                    Price: ${minPrice || '0'} - ${maxPrice || '∞'}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig || !saveConfigName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                >
                  {savingConfig ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveConfigName('');
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-8">
            {/* Status Message */}
            <div
              className={`p-4 rounded-xl border shadow-lg ${
                result.success
                  ? 'backdrop-blur-xl bg-gradient-to-r from-green-400/20 to-emerald-600/20 border-green-400/50 text-white shadow-green-500/30'
                  : 'backdrop-blur-xl bg-gradient-to-r from-red-400/20 to-pink-600/20 border-red-400/50 text-white shadow-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-300" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-300" />
                )}
                <span className="font-medium">{result.message}</span>
              </div>
              {result.savedCount !== undefined && (
                <p className="mt-1 text-sm text-blue-200/70">
                  {result.savedCount} listings saved to database
                </p>
              )}
              {result.error && <p className="mt-1 text-sm text-blue-200/50">{result.error}</p>}
            </div>

            {/* Scraped Listings Preview */}
            {result.listings && result.listings.length > 0 && (
              <div className="mt-6 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 bg-white/5">
                  <h3 className="font-semibold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                    Found {result.listings.length} Listings
                  </h3>
                </div>
                <div className="divide-y divide-white/10">
                  {result.listings.slice(0, 10).map((listing, index) => (
                    <div
                      key={index}
                      className="p-4 flex items-center gap-4 hover:bg-white/5 transition-all duration-300"
                    >
                      {listing.imageUrl ? (
                        <img
                          src={listing.imageUrl}
                          alt={listing.title}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-white/20 ring-2 ring-white/10"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                          <Package className="w-6 h-6 text-blue-200/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{listing.title}</p>
                        <p className="text-sm text-blue-200/70">{listing.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                          {listing.price}
                        </p>
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-300 hover:text-blue-200 transition-colors hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                {result.listings.length > 10 && (
                  <div className="p-4 text-center text-blue-200/70 border-t border-white/10 bg-white/5">
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
                  className="inline-flex items-center gap-2 px-6 py-3 backdrop-blur-xl bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
                >
                  View Dashboard
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Job History Section */}
        <div className="mt-8 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-300" />
              <h3 className="font-semibold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                Scraper Job History
              </h3>
            </div>
            <button
              onClick={() => fetchJobs()}
              className="p-1.5 hover:bg-white/10 rounded transition-all text-blue-300"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-white/10 bg-white/5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-blue-200/70">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              {['', 'COMPLETED', 'FAILED', 'RUNNING'].map((status) => (
                <button
                  key={status || 'all'}
                  onClick={() => handleStatusFilterChange(status)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    jobStatusFilter === status
                      ? 'bg-purple-500/40 text-white border border-purple-400/50'
                      : 'bg-white/5 text-blue-200/70 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-white/20" />

            {/* Date Filter */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-200/70" />
              {[
                { value: '', label: 'All time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This week' },
                { value: 'month', label: 'This month' },
              ].map((option) => (
                <button
                  key={option.value || 'all-time'}
                  onClick={() => handleDateFilterChange(option.value)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    jobDateFilter === option.value
                      ? 'bg-purple-500/40 text-white border border-purple-400/50'
                      : 'bg-white/5 text-blue-200/70 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Clear filters */}
            {(jobStatusFilter || jobDateFilter) && (
              <button
                onClick={() => {
                  setJobStatusFilter('');
                  setJobDateFilter('');
                  fetchJobs('', '');
                }}
                className="ml-auto px-2 py-1 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded transition-all"
              >
                Clear filters
              </button>
            )}
          </div>

          {jobsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center text-blue-200/50 py-6">
              {jobStatusFilter || jobDateFilter
                ? 'No jobs match the current filters.'
                : 'No scraper jobs yet. Run your first scrape above.'}
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 flex items-center gap-4 hover:bg-white/5 transition-all duration-300"
                >
                  <div className={`${getStatusColor(job.status)}`}>{getStatusIcon(job.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{job.platform}</span>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/30 text-purple-200">
                        {job.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-blue-200/60">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      {job.category && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {job.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {job.errorMessage && (
                      <p className="text-xs text-red-300 mt-1">{job.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">{job.listingsFound} listings</p>
                    {job.opportunitiesFound > 0 && (
                      <p className="text-xs text-green-300">
                        {job.opportunitiesFound} opportunities
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded transition-all text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
