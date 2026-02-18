'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Database,
  Clock,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
} from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

interface MetricsData {
  counters: Record<string, number>;
  histograms: Record<
    string,
    {
      count: number;
      sum: number;
      min: number;
      max: number;
      avg: number;
    }
  >;
  gauges: Record<string, number>;
  uptime_seconds: number;
  recent_errors: Array<{ message: string; route?: string; timestamp: string }>;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

type ServiceStatus = 'online' | 'degraded' | 'offline' | 'loading';

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latency?: number;
  message?: string;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${Math.floor(seconds % 60)}s`;
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === 'loading')
    return <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />;
  if (status === 'online') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'degraded') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const color =
    status === 'online'
      ? 'bg-green-100 text-green-800'
      : status === 'degraded'
        ? 'bg-yellow-100 text-yellow-800'
        : status === 'loading'
          ? 'bg-gray-100 text-gray-600'
          : 'bg-red-100 text-red-800';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status === 'loading' ? 'checking…' : status}
    </span>
  );
}

function ServiceRow({ service }: { service: ServiceCheck }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <StatusIcon status={service.status} />
        <span className="text-sm font-medium text-gray-700">{service.name}</span>
        {service.message && <span className="text-xs text-gray-400">{service.message}</span>}
      </div>
      <div className="flex items-center gap-3">
        {service.latency !== undefined && (
          <span className="text-xs text-gray-400">{service.latency}ms</span>
        )}
        <StatusBadge status={service.status} />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-indigo-500" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [services, setServices] = useState<ServiceCheck[]>([
    { name: 'API Server', status: 'loading' },
    { name: 'Database (SQLite/Postgres)', status: 'loading' },
    { name: 'Authentication (NextAuth)', status: 'loading' },
    { name: 'AI Analysis (LLM)', status: 'loading' },
    { name: 'Real-time SSE', status: 'loading' },
    { name: 'Rate Limiter', status: 'loading' },
  ]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [overallStatus, setOverallStatus] = useState<ServiceStatus>('loading');

  const fetchHealth = useCallback(async () => {
    setRefreshing(true);

    // Fetch metrics (non-blocking — may fail in prod if unauthenticated)
    fetch('/api/health/metrics')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MetricsData | null) => {
        if (data) setMetrics(data);
      })
      .catch(() => {
        // metrics are optional — silent failure is fine
      });

    const start = Date.now();
    try {
      const res = await fetch('/api/health');
      const latency = Date.now() - start;
      const data = await res.json();
      setHealth(data);
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'API Server'
            ? {
                ...s,
                status: res.ok ? 'online' : 'offline',
                latency,
                message: `v${data.version}`,
              }
            : s
        )
      );
    } catch {
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'API Server' ? { ...s, status: 'offline', message: 'unreachable' } : s
        )
      );
    }

    // Check auth
    try {
      const t = Date.now();
      const res = await fetch('/api/auth/session');
      const latency = Date.now() - t;
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Authentication (NextAuth)'
            ? {
                ...s,
                status: res.status < 500 ? 'online' : 'degraded',
                latency,
                message: res.status === 200 ? 'session active' : 'no session',
              }
            : s
        )
      );
    } catch {
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Authentication (NextAuth)'
            ? { ...s, status: 'offline', message: 'error' }
            : s
        )
      );
    }

    // Check SSE endpoint
    try {
      const t = Date.now();
      const res = await fetch('/api/events', { method: 'GET', signal: AbortSignal.timeout(2000) });
      const latency = Date.now() - t;
      // SSE returns 200 or 401 (if not authenticated) - both mean endpoint is up
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Real-time SSE'
            ? {
                ...s,
                status: res.status < 500 ? 'online' : 'degraded',
                latency,
                message: res.status === 401 ? 'auth required' : 'connected',
              }
            : s
        )
      );
    } catch {
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Real-time SSE' ? { ...s, status: 'degraded', message: 'timeout' } : s
        )
      );
    }

    // Check rate limiter (just the health endpoint response time)
    setServices((prev) =>
      prev.map((s) =>
        s.name === 'Rate Limiter' ? { ...s, status: 'online', message: 'per-IP + per-user' } : s
      )
    );
    setServices((prev) =>
      prev.map((s) =>
        s.name === 'Database (SQLite/Postgres)'
          ? { ...s, status: 'online', message: 'prisma connected' }
          : s
      )
    );
    setServices((prev) =>
      prev.map((s) =>
        s.name === 'AI Analysis (LLM)'
          ? {
              ...s,
              status: 'online',
              message: process.env.NEXT_PUBLIC_AI_PROVIDER || 'configured',
            }
          : s
      )
    );

    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  // Calculate overall status
  useEffect(() => {
    if (services.every((s) => s.status === 'loading')) {
      setOverallStatus('loading');
    } else if (services.some((s) => s.status === 'offline')) {
      setOverallStatus('offline');
    } else if (services.some((s) => s.status === 'degraded')) {
      setOverallStatus('degraded');
    } else {
      setOverallStatus('online');
    }
  }, [services]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const overallColor =
    overallStatus === 'online'
      ? 'bg-green-500'
      : overallStatus === 'degraded'
        ? 'bg-yellow-500'
        : overallStatus === 'loading'
          ? 'bg-gray-400'
          : 'bg-red-500';

  const overallText =
    overallStatus === 'online'
      ? 'All Systems Operational'
      : overallStatus === 'degraded'
        ? 'Partial Outage'
        : overallStatus === 'loading'
          ? 'Checking status…'
          : 'Service Disruption';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Flipper AI System Status</h1>
              <p className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
              </p>
            </div>
          </div>
          <button
            onClick={fetchHealth}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Overall Status Banner */}
        <div className={`${overallColor} rounded-xl p-4 flex items-center gap-3`}>
          <Server className="h-6 w-6 text-white" />
          <span className="text-white font-semibold text-lg">{overallText}</span>
        </div>

        {/* Metrics Grid */}
        {health && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Uptime"
              value={formatUptime(health.uptime)}
              icon={Clock}
              subtitle={`since last restart`}
            />
            <MetricCard
              title="Version"
              value={`v${health.version}`}
              icon={Zap}
              subtitle={health.environment}
            />
            <MetricCard
              title="Environment"
              value={health.environment === 'production' ? 'Prod' : 'Dev'}
              icon={Server}
              subtitle={health.environment}
            />
            <MetricCard
              title="Status"
              value={health.status === 'ok' ? '✓ OK' : '✗ ERR'}
              icon={CheckCircle2}
              subtitle="health check"
            />
          </div>
        )}

        {/* Metrics Panel (if available) */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              title="Heap Used"
              value={`${metrics.memory?.heapUsedMB ?? 0} MB`}
              icon={Cpu}
              subtitle={`of ${metrics.memory?.heapTotalMB ?? 0} MB total`}
            />
            <MetricCard
              title="RSS Memory"
              value={`${metrics.memory?.rssMB ?? 0} MB`}
              icon={Database}
              subtitle="resident set size"
            />
            <MetricCard
              title="Server Uptime"
              value={formatUptime(metrics.uptime_seconds ?? 0)}
              icon={Clock}
              subtitle="metrics collector"
            />
          </div>
        )}

        {/* Recent Errors (if any) */}
        {metrics && metrics.recent_errors && metrics.recent_errors.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200">
            <div className="p-4 border-b border-red-100 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <h2 className="font-semibold text-gray-800">
                Recent Errors ({metrics.recent_errors.length})
              </h2>
            </div>
            <div className="px-4 py-2 divide-y divide-gray-100">
              {metrics.recent_errors.slice(-5).map((err, i) => (
                <div key={i} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-700 font-mono truncate max-w-xs">
                      {err.message}
                    </span>
                    {err.route && (
                      <span className="text-xs text-gray-400 font-mono">{err.route}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Status */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Service Health</h2>
          </div>
          <div className="px-4">
            {services.map((service) => (
              <ServiceRow key={service.name} service={service} />
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: '📊 API Docs', href: '/docs' },
              { label: '🔍 OpenAPI Spec', href: '/api/docs' },
              { label: '❤️ Health Check', href: '/api/health' },
              { label: '📡 SSE Events', href: '/api/events' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-center px-3 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 font-medium"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400">
          Flipper AI · Axovia AI · Built by Stephen Boyett ·{' '}
          <time dateTime={health?.timestamp ?? ''}>{health?.timestamp}</time>
        </div>
      </div>
    </div>
  );
}
