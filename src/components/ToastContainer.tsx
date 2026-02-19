/**
 * Toast Container Component
 * Manages a stack of toast notifications in the top-right corner
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
'use client';

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import Toast, { ToastProps } from './Toast';

interface ToastData extends Omit<ToastProps, 'id' | 'onClose'> {
  id?: string;
}

interface ToastContextValue {
  showToast: (toast: ToastData) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  const showToast = useCallback((toast: ToastData) => {
    const id = toast.id ?? `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
