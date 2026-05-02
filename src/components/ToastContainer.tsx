/**
 * @file src/components/ToastContainer.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Toast notification stack provider — top-right anchored, auto-dismiss queue.
 *
 * @description
 * Client component exposing the ToastContext + useToast() hook. Maintains a
 * stack of in-flight ToastProps, renders them via <Toast> children inside a
 * fixed top-right region, and surfaces a single showToast() entry point that
 * the rest of the app calls for transient user feedback (success / error /
 * info). Used at app/layout.tsx as a top-level provider so any descendant
 * client component can request a toast.
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastData) => {
    const id = toast.id ?? `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  }, [removeToast]);

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
