/**
 * Toast Notification Component
 * Simple, reusable toast for SSE notifications and alerts
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
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

const COLOR_MAP = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  alert: 'bg-yellow-500',
  opportunity: 'bg-purple-500',
};

export default function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const Icon = ICON_MAP[type];
  const colorClass = COLOR_MAP[type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg shadow-lg
        ${colorClass} bg-opacity-95 text-white
        min-w-[320px] max-w-[420px]
        animate-slide-in-right
      `}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs mt-1 opacity-90">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
