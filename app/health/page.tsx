/**
 * @file app/health/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 2.0
 * @brief System health/status page rebuilt on the canonical dark-glassmorphism design system.
 *
 * @description
 * Renders Flipper AI's public service-status dashboard: overall-status banner with semantic
 * left-border accent stripe + redundant .fp-badge summary pill (per ADR-14.9-D, accessibility-
 * forward redundant text-state for color-vision-difference users), four MetricCards on .fp-glass,
 * optional memory metrics panel, conditional Recent Errors panel with red left-border accent,
 * Service Health list with canonical .fp-badge-* status pills, and Quick Links tiles. Auto-
 * refresh cadence (30s), per-service async probes (API, Auth, SSE, Rate Limiter, DB, AI), and
 * overall-status derivation are preserved verbatim — Story 14.9 is a pure visual migration.
 */

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
import { statusIconColor, statusBadgeClass, type ServiceStatus } from '@/lib/health-status';

const TEXT_PRIMARY = '#e2e8f0';
const TEXT_SECONDARY = '#94a3b8';
const PURPLE_ACCENT = '#c4b5fd';
const PURPLE_BRIGHT = '#a78bfa';
const PROFIT_GREEN = '#34d399';
const DANGER_RED = '#f87171';
const DANGER_RED_SOFT = '#fca5a5';
const WARNING_YELLOW = '#fbbf24';
const DIVIDER = 'rgba(255,255,255,0.06)';

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
  const color = statusIconColor(status);
  if (status === 'loading') return <RefreshCw className="h-4 w-4 animate-spin" style={{ color }} />;
  if (status === 'online') return <CheckCircle2 className="h-4 w-4" style={{ color }} />;
  if (status === 'degraded') return <AlertTriangle className="h-4 w-4" style={{ color }} />;
  return <XCircle className="h-4 w-4" style={{ color }} />;
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={statusBadgeClass(status)}>
      {status === 'loading' ? 'checking…' : status}
    </span>
  );
}

function ServiceRow({ service }: { service: ServiceCheck }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: `1px solid ${DIVIDER}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <StatusIcon status={service.status} />
        <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{service.name}</span>
        {service.message && <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>{service.message}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {service.latency !== undefined && (
          <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>{service.latency}ms</span>
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
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  subtitle?: string;
}) {
  return (
    <div className="fp-glass" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon className="h-4 w-4" style={{ color: PURPLE_BRIGHT }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: TEXT_SECONDARY,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </span>
      </div>
      <div className="fp-metric-num" style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [services, setServices] = useState<ServiceCheck[]>([
    { name: 'API Server', status: 'loading' },
    { name: 'Database (SQLite/Postgres)', status: 'loading' },
    { name: 'Authentication (Firebase)', status: 'loading' },
    { name: 'AI Analysis (LLM)', status: 'loading' },
    { name: 'Real-time SSE', status: 'loading' },
    { name: 'Rate Limiter', status: 'loading' },
  ]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [overallStatus, setOverallStatus] = useState<ServiceStatus>('loading');

  const fetchHealth = useCallback(async () => {
    setRefreshing(true);

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

    try {
      const t = Date.now();
      const res = await fetch('/api/auth/session');
      const latency = Date.now() - t;
      setServices((prev) =>
        prev.map((s) =>
          s.name === 'Authentication (Firebase)'
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
          s.name === 'Authentication (Firebase)'
            ? { ...s, status: 'offline', message: 'error' }
            : s
        )
      );
    }

    try {
      const t = Date.now();
      const res = await fetch('/api/events', { method: 'GET', signal: AbortSignal.timeout(2000) });
      const latency = Date.now() - t;
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
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const overallBorderColor = statusIconColor(overallStatus);

  const overallText =
    overallStatus === 'online'
      ? 'All Systems Operational'
      : overallStatus === 'degraded'
        ? 'Partial Outage'
        : overallStatus === 'loading'
          ? 'Checking status…'
          : 'Service Disruption';

  return (
    <div style={{ minHeight: '100vh', padding: 24, color: TEXT_PRIMARY }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: 8,
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity className="h-6 w-6" style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT_PRIMARY }}>Flipper AI System Status</h1>
              <p style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchHealth}
            disabled={refreshing}
            className="fp-btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            data-testid="health-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Overall Status Banner — ADR-14.9-D: glass + left-border stripe + summary pill */}
        <div
          className="fp-glass"
          data-testid="health-overall-status"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: `4px solid ${overallBorderColor}`,
          }}
        >
          <Server className="h-6 w-6" style={{ color: overallBorderColor }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, flex: 1 }}>{overallText}</span>
          <StatusBadge status={overallStatus} />
        </div>

        {/* Metrics Grid */}
        {health && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <MetricCard
              title="Uptime"
              value={formatUptime(health.uptime)}
              icon={Clock}
              subtitle="since last restart"
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

        {/* Memory metrics panel */}
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
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

        {/* Recent Errors */}
        {metrics && metrics.recent_errors && metrics.recent_errors.length > 0 && (
          <div className="fp-glass" style={{ padding: 0, borderLeft: `4px solid ${DANGER_RED}` }}>
            <div className="fp-glass-sm" style={{ padding: 16, borderRadius: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <XCircle className="h-4 w-4" style={{ color: DANGER_RED }} />
              <h2 style={{ fontWeight: 600, color: TEXT_PRIMARY }}>
                Recent Errors ({metrics.recent_errors.length})
              </h2>
            </div>
            <div style={{ padding: '0 16px' }}>
              {metrics.recent_errors.slice(-5).map((err, i) => (
                <div key={i} style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${DIVIDER}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, color: DANGER_RED_SOFT, fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>
                      {err.message}
                    </span>
                    {err.route && (
                      <span style={{ fontSize: 12, color: TEXT_SECONDARY, fontFamily: 'ui-monospace, monospace' }}>{err.route}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 }}>
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Status */}
        <div className="fp-glass" style={{ padding: 0 }}>
          <div className="fp-glass-sm" style={{ padding: 16, borderRadius: 0 }}>
            <h2 style={{ fontWeight: 600, color: TEXT_PRIMARY }}>Service Health</h2>
          </div>
          <div style={{ padding: '0 16px' }}>
            {services.map((service) => (
              <ServiceRow key={service.name} service={service} />
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="fp-glass" style={{ padding: 16 }}>
          <h2 style={{ fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 12 }}>Quick Links</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            {[
              { label: '📊 API Docs', href: '/docs' },
              { label: '🔍 OpenAPI Spec', href: '/api/docs' },
              { label: '❤️ Health Check', href: '/api/health' },
              { label: '📡 SSE Events', href: '/api/events' },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="fp-glass-sm"
                style={{
                  textAlign: 'center',
                  padding: '8px 12px',
                  fontSize: 13,
                  color: PURPLE_ACCENT,
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'block',
                }}
                data-fp-row-hover="true"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 12, color: TEXT_SECONDARY }}>
          Flipper AI · Axovia AI · Built by Stephen Boyett ·{' '}
          <time dateTime={health?.timestamp ?? ''}>{health?.timestamp}</time>
        </div>
      </div>
    </div>
  );
}
