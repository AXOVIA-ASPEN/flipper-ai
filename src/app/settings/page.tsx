'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Bell,
  DollarSign,
  Target,
  Save,
  CheckCircle,
  Palette,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  MapPin,
  Tag,
  Play,
  ToggleLeft,
  ToggleRight,
  Clock,
  Loader2,
  AlertCircle,
  Bookmark,
  User,
  Key,
  Eye,
  EyeOff,
  LogOut,
  Sparkles,
  ExternalLink,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

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
  createdAt: string;
}

interface SearchFormData {
  name: string;
  platform: string;
  location: string;
  category: string;
  keywords: string;
  minPrice: string;
  maxPrice: string;
  enabled: boolean;
}

const defaultSearchFormData: SearchFormData = {
  name: '',
  platform: 'CRAIGSLIST',
  location: 'sarasota',
  category: 'electronics',
  keywords: '',
  minPrice: '',
  maxPrice: '',
  enabled: true,
};

interface UserSettings {
  id: string;
  userId: string;
  openaiApiKey: string | null;
  hasOpenaiApiKey: boolean;
  llmModel: string;
  discountThreshold: number;
  autoAnalyze: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [saved, setSaved] = useState(false);
  const { theme, setTheme, availableThemes } = useTheme();

  // User settings state
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'valid' | 'invalid' | 'not_set' | null>(null);
  const [llmModel, setLlmModel] = useState('gpt-4o-mini');
  const [discountThreshold, setDiscountThreshold] = useState(50);
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  // Search configs state
  const [configs, setConfigs] = useState<SearchConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchFormData, setSearchFormData] = useState<SearchFormData>(defaultSearchFormData);
  const [savingConfig, setSavingConfig] = useState(false);
  const [runningConfigId, setRunningConfigId] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const searchLocations = [
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

  // Fetch user settings on mount
  useEffect(() => {
    fetchUserSettings();
    fetchConfigs();
  }, []);

  async function fetchUserSettings() {
    try {
      const response = await fetch('/api/user/settings');
      const data = await response.json();
      if (data.success && data.data) {
        setUserSettings(data.data);
        setLlmModel(data.data.llmModel);
        setDiscountThreshold(data.data.discountThreshold);
        setAutoAnalyze(data.data.autoAnalyze);
        setApiKeyStatus(data.data.hasOpenaiApiKey ? 'valid' : 'not_set');
      }
    } catch (error) {
      console.error('Failed to fetch user settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleSaveApiKey() {
    setSavingApiKey(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: apiKey || null }),
      });
      const data = await response.json();
      if (data.success) {
        setUserSettings(data.data);
        setApiKey('');
        setApiKeyStatus(data.data.hasOpenaiApiKey ? 'valid' : 'not_set');
        showConfigMessage('success', 'API key saved securely');
      } else {
        showConfigMessage('error', data.error || 'Failed to save API key');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      showConfigMessage('error', 'Failed to save API key');
    } finally {
      setSavingApiKey(false);
    }
  }

  async function handleTestApiKey() {
    setTestingApiKey(true);
    try {
      const response = await fetch('/api/user/settings/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey || undefined }),
      });
      const data = await response.json();
      if (data.success && data.valid) {
        setApiKeyStatus('valid');
        showConfigMessage('success', 'API key is valid!');
      } else {
        setApiKeyStatus('invalid');
        showConfigMessage('error', data.error || 'API key is invalid');
      }
    } catch (error) {
      console.error('Failed to test API key:', error);
      setApiKeyStatus('invalid');
      showConfigMessage('error', 'Failed to test API key');
    } finally {
      setTestingApiKey(false);
    }
  }

  async function handleSaveLlmSettings() {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmModel, discountThreshold, autoAnalyze }),
      });
      const data = await response.json();
      if (data.success) {
        setUserSettings(data.data);
        showConfigMessage('success', 'LLM settings saved');
      } else {
        showConfigMessage('error', data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
      showConfigMessage('error', 'Failed to save settings');
    }
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' });
  }

  async function fetchConfigs() {
    try {
      const response = await fetch('/api/search-configs');
      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setConfigsLoading(false);
    }
  }

  function showConfigMessage(type: 'success' | 'error', text: string) {
    setConfigMessage({ type, text });
    setTimeout(() => setConfigMessage(null), 5000);
  }

  async function handleCreateConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const response = await fetch('/api/search-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: searchFormData.name,
          platform: searchFormData.platform,
          location: searchFormData.location,
          category: searchFormData.category || null,
          keywords: searchFormData.keywords || null,
          minPrice: searchFormData.minPrice || null,
          maxPrice: searchFormData.maxPrice || null,
          enabled: searchFormData.enabled,
        }),
      });
      if (response.ok) {
        showConfigMessage('success', 'Search configuration created');
        setShowCreateForm(false);
        setSearchFormData(defaultSearchFormData);
        fetchConfigs();
      } else {
        const data = await response.json();
        showConfigMessage('error', data.error || 'Failed to create');
      }
    } catch (error) {
      console.error('Failed to create config:', error);
      showConfigMessage('error', 'Failed to create configuration');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleUpdateConfig(id: string) {
    setSavingConfig(true);
    try {
      const response = await fetch(`/api/search-configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: searchFormData.name,
          platform: searchFormData.platform,
          location: searchFormData.location,
          category: searchFormData.category || null,
          keywords: searchFormData.keywords || null,
          minPrice: searchFormData.minPrice || null,
          maxPrice: searchFormData.maxPrice || null,
          enabled: searchFormData.enabled,
        }),
      });
      if (response.ok) {
        showConfigMessage('success', 'Configuration updated');
        setEditingConfigId(null);
        setSearchFormData(defaultSearchFormData);
        fetchConfigs();
      } else {
        showConfigMessage('error', 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      showConfigMessage('error', 'Failed to update configuration');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleDeleteConfig(id: string) {
    if (!confirm('Delete this search configuration?')) return;
    try {
      const response = await fetch(`/api/search-configs/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showConfigMessage('success', 'Configuration deleted');
        fetchConfigs();
      }
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  }

  async function handleToggleConfig(config: SearchConfig) {
    try {
      await fetch(`/api/search-configs/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled }),
      });
      fetchConfigs();
    } catch (error) {
      console.error('Failed to toggle config:', error);
    }
  }

  async function handleRunConfig(config: SearchConfig) {
    setRunningConfigId(config.id);
    try {
      const response = await fetch('/api/scraper/craigslist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: config.location,
          category: config.category,
          keywords: config.keywords || undefined,
          minPrice: config.minPrice || undefined,
          maxPrice: config.maxPrice || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showConfigMessage('success', `Found ${data.savedCount || 0} listings`);
        await fetch(`/api/search-configs/${config.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastRun: new Date().toISOString() }),
        });
        fetchConfigs();
      } else {
        showConfigMessage('error', data.message || 'Scraping failed');
      }
    } catch (error) {
      console.error('Failed to run scraper:', error);
      showConfigMessage('error', 'Failed to run scraper');
    } finally {
      setRunningConfigId(null);
    }
  }

  function startEditingConfig(config: SearchConfig) {
    setEditingConfigId(config.id);
    setSearchFormData({
      name: config.name,
      platform: config.platform,
      location: config.location,
      category: config.category || '',
      keywords: config.keywords || '',
      minPrice: config.minPrice?.toString() || '',
      maxPrice: config.maxPrice?.toString() || '',
      enabled: config.enabled,
    });
  }

  function getLocationLabel(value: string): string {
    return searchLocations.find((l) => l.value === value)?.label || value;
  }

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [notifyOnHighScore, setNotifyOnHighScore] = useState(true);
  const [minScoreThreshold, setMinScoreThreshold] = useState('70');

  // Profit settings
  const [minProfitMargin, setMinProfitMargin] = useState('20');
  const [maxInvestment, setMaxInvestment] = useState('500');
  const [preferredCategories, setPreferredCategories] = useState<string[]>([
    'electronics',
    'furniture',
  ]);

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

  const handleSave = () => {
    // In a real app, this would save to database/API
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleCategory = (category: string) => {
    setPreferredCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50 group"
            >
              <ArrowLeft className="w-5 h-5 text-white group-hover:text-purple-200 transition-colors" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50 animate-pulse-slow">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-xs text-blue-200/70">Configure your preferences</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

        {/* Account Section */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
              Account
            </h2>
          </div>

          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : session?.user ? (
            <div className="space-y-4">
              {/* User Profile */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-14 h-14 rounded-full border-2 border-purple-400/50"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-lg font-semibold text-white">
                    {session.user.name || 'Anonymous User'}
                  </p>
                  <p className="text-sm text-blue-200/60">{session.user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-red-300 rounded-lg hover:bg-red-500/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-blue-200/60 mb-4">Sign in to sync your settings across devices</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg"
              >
                <User className="w-5 h-5" />
                Sign in
              </Link>
            </div>
          )}
        </div>

        {/* API Keys Section */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/50">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                API Keys
              </h2>
              <p className="text-xs text-blue-200/50">Required for AI-powered analysis</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* OpenAI API Key */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-blue-200/90">OpenAI API Key</label>
                <div className="flex items-center gap-2">
                  {apiKeyStatus === 'valid' && (
                    <span className="flex items-center gap-1 text-xs text-green-300">
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </span>
                  )}
                  {apiKeyStatus === 'invalid' && (
                    <span className="flex items-center gap-1 text-xs text-red-300">
                      <AlertCircle className="w-3 h-3" />
                      Invalid
                    </span>
                  )}
                  {apiKeyStatus === 'not_set' && (
                    <span className="flex items-center gap-1 text-xs text-yellow-300">
                      <AlertCircle className="w-3 h-3" />
                      Not set
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    userSettings?.hasOpenaiApiKey
                      ? userSettings.openaiApiKey || '••••••••••••'
                      : 'sk-...'
                  }
                  className="w-full px-4 py-3 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 text-white placeholder-blue-200/30 transition-all duration-300 pr-24"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 text-blue-300/50 hover:text-blue-200 transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleSaveApiKey}
                  disabled={savingApiKey}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50"
                >
                  {savingApiKey ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  Save
                </button>
                <button
                  onClick={handleTestApiKey}
                  disabled={testingApiKey || (!apiKey && !userSettings?.hasOpenaiApiKey)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-blue-300 text-sm rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
                >
                  {testingApiKey ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  Test
                </button>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-blue-300/60 text-sm hover:text-blue-200 transition-colors"
                >
                  Get API key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="mt-2 text-xs text-blue-200/40">
                Your API key is encrypted and stored securely. It's never exposed in logs or
                transmitted to our servers.
              </p>
            </div>
          </div>
        </div>

        {/* LLM Analysis Preferences */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent">
              AI Analysis Preferences
            </h2>
          </div>

          <div className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">LLM Model</label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white"
              >
                <option value="gpt-4o-mini" className="bg-slate-800">
                  GPT-4o Mini (Recommended)
                </option>
                <option value="gpt-4o" className="bg-slate-800">
                  GPT-4o (More accurate)
                </option>
                <option value="gpt-4-turbo" className="bg-slate-800">
                  GPT-4 Turbo (Highest quality)
                </option>
              </select>
              <p className="mt-1 text-xs text-blue-200/40">
                GPT-4o Mini offers the best balance of speed and accuracy for listing analysis.
              </p>
            </div>

            {/* Discount Threshold */}
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                Minimum Discount Threshold: {discountThreshold}%
              </label>
              <input
                type="range"
                min="10"
                max="80"
                value={discountThreshold}
                onChange={(e) => setDiscountThreshold(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-blue-200/40 mt-1">
                <span>10% (More deals)</span>
                <span>80% (Only steep discounts)</span>
              </div>
            </div>

            {/* Auto-Analyze Toggle */}
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all duration-300 cursor-pointer">
              <div>
                <span className="text-white">Auto-analyze new listings</span>
                <p className="text-xs text-blue-200/40">
                  Automatically run AI analysis on scraped listings
                </p>
              </div>
              <button type="button" onClick={() => setAutoAnalyze(!autoAnalyze)} className="p-1">
                {autoAnalyze ? (
                  <ToggleRight className="w-8 h-8 text-green-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-400" />
                )}
              </button>
            </label>

            {/* Save Button */}
            <button
              onClick={handleSaveLlmSettings}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg"
            >
              <Save className="w-4 h-4" />
              Save AI Settings
            </button>
          </div>
        </div>

        {/* Saved Search Configurations */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                Saved Searches
              </h2>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setEditingConfigId(null);
                setSearchFormData(defaultSearchFormData);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateConfig}
              className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-400" />
                Create New Search
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={searchFormData.name}
                    onChange={(e) => setSearchFormData({ ...searchFormData, name: e.target.value })}
                    placeholder="Search name (e.g., Electronics in Tampa)"
                    required
                    className="w-full px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50"
                  />
                </div>
                <select
                  value={searchFormData.location}
                  onChange={(e) =>
                    setSearchFormData({ ...searchFormData, location: e.target.value })
                  }
                  className="px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white"
                >
                  {searchLocations.map((loc) => (
                    <option key={loc.value} value={loc.value} className="bg-slate-800">
                      {loc.label}
                    </option>
                  ))}
                </select>
                <select
                  value={searchFormData.category}
                  onChange={(e) =>
                    setSearchFormData({ ...searchFormData, category: e.target.value })
                  }
                  className="px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-slate-800">
                      {cat.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchFormData.keywords}
                  onChange={(e) =>
                    setSearchFormData({ ...searchFormData, keywords: e.target.value })
                  }
                  placeholder="Keywords (optional)"
                  className="px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={searchFormData.minPrice}
                    onChange={(e) =>
                      setSearchFormData({ ...searchFormData, minPrice: e.target.value })
                    }
                    placeholder="Min $"
                    className="flex-1 px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50"
                  />
                  <input
                    type="number"
                    value={searchFormData.maxPrice}
                    onChange={(e) =>
                      setSearchFormData({ ...searchFormData, maxPrice: e.target.value })
                    }
                    placeholder="Max $"
                    className="flex-1 px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white placeholder-blue-200/50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                >
                  {savingConfig ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Configs List */}
          {configsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : configs.length === 0 ? (
            <p className="text-center text-blue-200/50 py-6">
              No saved searches yet. Create one to quickly run your favorite searches.
            </p>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`p-4 rounded-lg border transition-all ${
                    config.enabled
                      ? 'bg-white/5 border-white/20 hover:bg-white/10'
                      : 'bg-white/2 border-white/10 opacity-60'
                  }`}
                >
                  {editingConfigId === config.id ? (
                    /* Edit Form */
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={searchFormData.name}
                            onChange={(e) =>
                              setSearchFormData({ ...searchFormData, name: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-white"
                          />
                        </div>
                        <select
                          value={searchFormData.location}
                          onChange={(e) =>
                            setSearchFormData({ ...searchFormData, location: e.target.value })
                          }
                          className="px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 text-white"
                        >
                          {searchLocations.map((loc) => (
                            <option key={loc.value} value={loc.value} className="bg-slate-800">
                              {loc.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={searchFormData.category}
                          onChange={(e) =>
                            setSearchFormData({ ...searchFormData, category: e.target.value })
                          }
                          className="px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 text-white"
                        >
                          {categories.map((cat) => (
                            <option key={cat.value} value={cat.value} className="bg-slate-800">
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={searchFormData.keywords}
                          onChange={(e) =>
                            setSearchFormData({ ...searchFormData, keywords: e.target.value })
                          }
                          placeholder="Keywords"
                          className="px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 text-white placeholder-blue-200/50"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={searchFormData.minPrice}
                            onChange={(e) =>
                              setSearchFormData({ ...searchFormData, minPrice: e.target.value })
                            }
                            placeholder="Min $"
                            className="flex-1 px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 text-white placeholder-blue-200/50"
                          />
                          <input
                            type="number"
                            value={searchFormData.maxPrice}
                            onChange={(e) =>
                              setSearchFormData({ ...searchFormData, maxPrice: e.target.value })
                            }
                            placeholder="Max $"
                            className="flex-1 px-3 py-2 text-sm bg-white/10 rounded-lg border border-white/20 text-white placeholder-blue-200/50"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateConfig(config.id)}
                          disabled={savingConfig}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm rounded-lg disabled:opacity-50"
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
                            setEditingConfigId(null);
                            setSearchFormData(defaultSearchFormData);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{config.name}</span>
                          <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/30 text-purple-200">
                            {config.platform}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-blue-200/60">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getLocationLabel(config.location)}
                          </span>
                          {config.category && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {categories.find((c) => c.value === config.category)?.label}
                            </span>
                          )}
                          {config.keywords && (
                            <span className="flex items-center gap-1">
                              <Search className="w-3 h-3" />
                              {config.keywords}
                            </span>
                          )}
                          {config.lastRun && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(config.lastRun), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleConfig(config)}
                          className="p-1.5 hover:bg-white/10 rounded transition-all"
                          title={config.enabled ? 'Disable' : 'Enable'}
                        >
                          {config.enabled ? (
                            <ToggleRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRunConfig(config)}
                          disabled={runningConfigId === config.id}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded hover:bg-blue-500/30 transition-all disabled:opacity-50"
                        >
                          {runningConfigId === config.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          Run
                        </button>
                        <button
                          onClick={() => startEditingConfig(config)}
                          className="p-1.5 hover:bg-white/10 rounded transition-all text-blue-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded transition-all text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/50">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
              Notifications
            </h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all duration-300 cursor-pointer">
              <span className="text-white">Email Notifications</span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-5 h-5 rounded accent-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all duration-300 cursor-pointer">
              <span className="text-white">Push Notifications</span>
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="w-5 h-5 rounded accent-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all duration-300 cursor-pointer">
              <span className="text-white">Notify on High-Score Listings</span>
              <input
                type="checkbox"
                checked={notifyOnHighScore}
                onChange={(e) => setNotifyOnHighScore(e.target.checked)}
                className="w-5 h-5 rounded accent-purple-500"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                Minimum Score Threshold
              </label>
              <input
                type="number"
                value={minScoreThreshold}
                onChange={(e) => setMinScoreThreshold(e.target.value)}
                min="0"
                max="100"
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white transition-all duration-300 hover:bg-white/15"
              />
              <p className="mt-1 text-xs text-blue-200/50">
                Get notified when listings score above this value (0-100)
              </p>
            </div>
          </div>
        </div>

        {/* Profit Settings */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/50">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-green-200 to-emerald-200 bg-clip-text text-transparent">
              Profit Targets
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                Minimum Profit Margin (%)
              </label>
              <input
                type="number"
                value={minProfitMargin}
                onChange={(e) => setMinProfitMargin(e.target.value)}
                min="0"
                max="100"
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white transition-all duration-300 hover:bg-white/15"
              />
              <p className="mt-1 text-xs text-blue-200/50">
                Only show opportunities with at least this profit margin
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                Maximum Investment ($)
              </label>
              <input
                type="number"
                value={maxInvestment}
                onChange={(e) => setMaxInvestment(e.target.value)}
                min="0"
                className="w-full px-4 py-2 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white transition-all duration-300 hover:bg-white/15"
              />
              <p className="mt-1 text-xs text-blue-200/50">
                Maximum amount you're willing to invest per item
              </p>
            </div>
          </div>
        </div>

        {/* Category Preferences */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/50">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-pink-200 to-purple-200 bg-clip-text text-transparent">
              Preferred Categories
            </h2>
          </div>

          <p className="text-sm text-blue-200/70 mb-4">
            Select categories you're interested in flipping
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => toggleCategory(category.value)}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  preferredCategories.includes(category.value)
                    ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 shadow-lg shadow-purple-500/30 scale-105'
                    : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                <span className="text-sm text-white">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/50">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
              Color Theme
            </h2>
          </div>

          <p className="text-sm text-blue-200/70 mb-4">Choose your preferred color scheme</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`group p-4 rounded-xl border-2 transition-all duration-300 ${
                  theme.id === t.id
                    ? 'border-white/50 bg-white/15 shadow-lg shadow-white/20 scale-105'
                    : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 hover:scale-102'
                }`}
              >
                {/* Theme preview gradient */}
                <div className="flex gap-2 mb-3">
                  <div
                    className={`h-8 w-full rounded-lg bg-gradient-to-r from-${t.colors.primaryFrom} to-${t.colors.primaryTo} shadow-md`}
                  ></div>
                  <div
                    className={`h-8 w-full rounded-lg bg-gradient-to-r from-${t.colors.secondaryFrom} to-${t.colors.secondaryTo} shadow-md`}
                  ></div>
                </div>

                {/* Theme name and description */}
                <div className="text-left">
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    {t.name}
                    {theme.id === t.id && <CheckCircle className="w-4 h-4 text-green-300" />}
                  </h3>
                  <p className="text-xs text-blue-200/60">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <div className="flex items-center gap-2 text-green-300 animate-pulse-slow">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Settings saved!</span>
            </div>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/80 hover:scale-105"
          >
            <Save className="w-5 h-5" />
            Save Settings
          </button>
        </div>
      </main>
    </div>
  );
}
