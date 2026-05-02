/**
 * @file src/components/providers/FirebaseAuthProvider.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Firebase auth context — observes onAuthStateChanged and exposes user/loading.
 *
 * @description
 * Client component that subscribes to Firebase Auth state at mount,
 * publishes the current user (or null) and a loading flag through React
 * context, and tears down the listener on unmount. Wrapped at the root
 * layout so any descendant client component can read auth state via
 * useFirebaseAuth() without re-establishing a Firebase listener.
 */
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // E2E test bypass: Playwright tests inject window.__E2E_AUTH_USER__ via
    // addInitScript before navigation. When present, skip the real Firebase
    // subscription and resolve immediately with the mocked user. Production
    // never sets this global — zero behavior change in production paths.
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { __E2E_AUTH_USER__?: User }).__E2E_AUTH_USER__
    ) {
      setUser((window as unknown as { __E2E_AUTH_USER__: User }).__E2E_AUTH_USER__);
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
