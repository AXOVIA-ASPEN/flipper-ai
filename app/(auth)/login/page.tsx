/**
 * @file app/(auth)/login/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Login page — canonical .fp-glass card, no competing theme or orb system.
 *
 * @description
 * Email/password and OAuth (Google, GitHub) login page. Uses Firebase Auth via
 * useFirebaseAuth hook. Adaptive CAPTCHA via hCaptcha for high-risk attempts.
 * Validates callbackUrl to prevent open-redirect attacks. All visuals use
 * canonical .fp-* classes; supersedes Story 14.2 placeholder replacements.
 */
'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#8b5cf6' }} />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Validate callbackUrl is a same-origin relative path to prevent open-redirect
  // attacks (FR-AUTH-ACCESS — never redirect to untrusted external URLs).
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl =
    rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//')
      ? rawCallback
      : '/';
  const loggedOut = searchParams.get('loggedOut') === 'true' || searchParams.get('loggedOut') === '1';

  const { signIn, signInWithGoogle, signInWithGitHub } = useFirebaseAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    loggedOut ? 'You have been logged out.' : null
  );
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '';

  // Check if CAPTCHA is required when email changes
  useEffect(() => {
    const checkCaptchaRequired = async () => {
      if (!email || email.length < 3) {
        setShowCaptcha(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/captcha-required', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase() }),
        });

        if (response.ok) {
          const data = await response.json();
          setShowCaptcha(data.requiresCaptcha);
        }
      } catch (error) {
        console.error('Failed to check CAPTCHA requirement:', error);
      }
    };

    const debounce = setTimeout(checkCaptchaRequired, 500);
    return () => clearTimeout(debounce);
  }, [email]);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Check if CAPTCHA is required but not completed
    if (showCaptcha && !captchaToken) {
      setErrorMessage('Please complete the CAPTCHA verification');
      setIsLoading(false);
      return;
    }

    try {
      await signIn(email, password);
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      if (message.includes('auth/wrong-password') || message.includes('auth/user-not-found') || message.includes('auth/invalid-credential')) {
        setErrorMessage('Invalid email or password');
        // Reset CAPTCHA on failed attempt
        setCaptchaToken(null);
        if (captchaRef.current) {
          captchaRef.current.resetCaptcha();
        }
      } else if (message.includes('auth/too-many-requests')) {
        setErrorMessage('Too many failed attempts. Please try again later.');
        setShowCaptcha(true);
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuthSignIn(provider: 'google' | 'github') {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGitHub();
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth sign-in failed';
      if (message.includes('auth/popup-closed-by-user')) {
        // User closed the popup — not an error
        setIsLoading(false);
        return;
      }
      setErrorMessage('Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10" role="main">
        <div className="fp-glass rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <Link href="/" className="inline-block mb-6 group">
              <div className="flex items-center justify-center gap-3">
                <div className="fp-glass-sm w-12 h-12 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" style={{ color: '#8b5cf6' }} />
                </div>
                <span className="text-2xl font-bold fp-grad-purple">Flipper.ai</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#e2e8f0' }}>Welcome back</h1>
            <p style={{ color: '#94a3b8' }}>Sign in to find your next profitable flip</p>
          </div>

          {/* Success message (e.g. after logout) */}
          {successMessage && (
            <div
              className="fp-alert-success mx-8 mb-4 p-3 flex items-center gap-2"
              role="status"
              aria-live="polite"
              data-testid="logout-success-message"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#34d399' }} />
              <span className="text-sm" style={{ color: '#6ee7b7' }}>{successMessage}</span>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="fp-alert-danger mx-8 mb-4 p-3 flex items-center gap-2" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
              <span className="text-sm" style={{ color: '#fca5a5' }}>{errorMessage}</span>
            </div>
          )}

          {/* OAuth buttons */}
          <div className="px-8 space-y-3">
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
              className="fp-btn-ghost w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium">Continue with Google</span>
            </button>

            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
              className="fp-btn-ghost w-full"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="font-medium">Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="px-8 my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent" style={{ color: '#475569' }}>or continue with email</span>
              </div>
            </div>
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentialsSubmit} className="px-8 pb-8 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5" style={{ color: '#475569' }} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="fp-input w-full pl-10 pr-4 py-3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: '#475569' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="fp-input w-full pl-10 pr-12 py-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 p-2 flex items-center"
                  style={{ color: '#475569' }}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* CAPTCHA Widget */}
            {showCaptcha && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: '#fcd34d' }}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security verification required</span>
                </div>
                <div className="fp-glass-sm flex justify-center p-4 rounded-xl">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={hcaptchaSiteKey}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => {
                      setCaptchaToken(null);
                      setErrorMessage('CAPTCHA error. Please try again.');
                    }}
                    theme="dark"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="fp-btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Forgot password link */}
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm hover:underline"
                style={{ color: '#94a3b8' }}
              >
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium hover:underline" style={{ color: '#a78bfa' }}>
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-sm mt-6" style={{ color: '#475569' }}>
          Powered by AI to maximize your flipping profits
        </p>
      </div>
    </div>
  );
}
