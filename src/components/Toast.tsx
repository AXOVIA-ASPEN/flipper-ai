/**
 * @file src/components/Toast.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 2.0
 * @brief Glassmorphism toast notification with type-based accent borders.
 *
 * @description
 * Dark glassmorphism toast. Each type gets a colored left accent border and
 * matching icon tint. Uses safe textContent patterns — no innerHTML with
 * dynamic values.
 */
'use client';

import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, TrendingUp } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'alert' | 'opportunity';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  alert: TrendingUp,
  opportunity: TrendingUp,
};

const ACCENT_MAP: Record<string, { border: string; icon: string }> = {
  success: { border: '#34d399', icon: '#34d399' },
  error: { border: '#f87171', icon: '#f87171' },
  info: { border: '#8b5cf6', icon: '#8b5cf6' },
  alert: { border: '#fbbf24', icon: '#fbbf24' },
  opportunity: { border: '#8b5cf6', icon: '#8b5cf6' },
};

export default function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const Icon = ICON_MAP[type];
  const accent = ACCENT_MAP[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="animate-slide-in-right"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
        borderRadius: 12, minWidth: 320, maxWidth: 420,
        background: 'rgba(12,16,28,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${accent.border}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(109,40,217,0.15)',
      }}
    >
      <Icon size={18} style={{ flexShrink: 0, marginTop: 1, color: accent.icon }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, margin: '3px 0 0' }}>{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2, borderRadius: 4, transition: 'color 0.2s' }}
        aria-label="Close notification"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
