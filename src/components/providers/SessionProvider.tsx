/**
 * @file src/components/providers/SessionProvider.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Backward-compat session wrapper — delegates to FirebaseAuthProvider.
 *
 * @description
 * Client component retained as a thin alias for FirebaseAuthProvider so that
 * legacy import paths continue to resolve while the codebase migrates fully
 * to the Firebase-based auth context. Has no logic of its own; renders the
 * Firebase provider with the supplied children.
 */
'use client';

import { ReactNode } from 'react';
import { FirebaseAuthProvider } from '@/components/providers/FirebaseAuthProvider';

interface SessionProviderProps {
  children: ReactNode;
}
export function SessionProvider({ children }: SessionProviderProps) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
