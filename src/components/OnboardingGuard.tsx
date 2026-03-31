'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/FirebaseAuthProvider';

const EXCLUDED_PATHS = [
  '/onboarding',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/signout',
];

function isExcluded(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/sitemap.xml') return true;
  return EXCLUDED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  // Cache the result so we only hit the API once per session, not on every navigation
  const onboardingCompleteRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (authLoading || !user || isExcluded(pathname)) {
      setChecked(true);
      return;
    }

    // Short-circuit after first confirmed-complete check — no need to re-fetch
    if (onboardingCompleteRef.current === true) {
      setChecked(true);
      return;
    }

    fetch('/api/user/onboarding')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          onboardingCompleteRef.current = data.data.onboardingComplete;
          if (data.data.onboardingComplete === false) {
            router.replace('/onboarding');
          }
        }
      })
      .catch(() => {
        // Non-fatal — don't block the app
      })
      .finally(() => setChecked(true));
  }, [user, authLoading, pathname, router]);

  // Don't block rendering for excluded paths or while auth is still loading
  if (authLoading || isExcluded(pathname)) return <>{children}</>;
  if (!user) return <>{children}</>;
  if (!checked) return null;

  return <>{children}</>;
}
