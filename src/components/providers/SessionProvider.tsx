'use client';

import { ReactNode } from 'react';
import { FirebaseAuthProvider } from '@/components/providers/FirebaseAuthProvider';

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Session provider — wraps the app with FirebaseAuthProvider.
 * Retained for backward compatibility with imports.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
