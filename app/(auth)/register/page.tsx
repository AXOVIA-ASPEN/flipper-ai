/**
 * @file app/(auth)/register/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Registration page — canonical .fp-glass card with password-strength meter.
 *
 * @description
 * New-user registration via email/password or OAuth (Google, GitHub). Uses Firebase
 * Auth via useFirebaseAuth. Includes a 4-criteria password-strength meter using
 * inline hex colors (ADR-14.4-D: security carve-out from green-for-profit rule).
 * All visuals use .fp-* canonical classes; supersedes Story 14.2 placeholder replacements.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, signInWithGitHub } = useFirebaseAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength indicators
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  function strengthBarColor(strength: number): string {
    // ADR-14.4-D: security carve-out — green/yellow/red are semantic for password strength
    if (strength <= 2) return '#f87171'; // fp-red weak
    if (strength === 3) return '#fbbf24'; // fp-yellow medium
    return '#34d399'; // fp-green strong
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Validate password match
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (!passwordChecks.length) {
      setErrorMessage('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      // Create Firebase user and exchange token for session cookie.
      // Name is passed through to the session exchange which upserts the Prisma user.
      await signUp(email, password, name || undefined);

      router.push('/settings');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      if (message.includes('auth/email-already-in-use')) {
        setErrorMessage('An account with this email already exists');
      } else if (message.includes('auth/weak-password')) {
        setErrorMessage('Password is too weak. Please use a stronger password.');
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
      router.push('/settings');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth sign-in failed';
      if (message.includes('auth/popup-closed-by-user')) {
        setIsLoading(false);
        return;
      }
      setErrorMessage('Sign-up failed. Please try again.');
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
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#e2e8f0' }}>Create your account</h1>
            <p style={{ color: '#94a3b8' }}>Start finding profitable flips in minutes</p>
          </div>

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
              <span className="font-medium">Sign up with Google</span>
            </button>

            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
              className="fp-btn-ghost w-full"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="font-medium">Sign up with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="px-8 my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent" style={{ color: '#475569' }}>or create with email</span>
              </div>
            </div>
          </div>

          {/* Registration form */}
          <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>Full name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5" style={{ color: '#475569' }} />
                </div>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="fp-input w-full pl-10 pr-4 py-3"
                />
              </div>
            </div>

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
                  placeholder="Create a password"
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

              {/* Password strength indicator — ADR-14.4-D carve-out */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background: passwordStrength >= level
                            ? strengthBarColor(passwordStrength)
                            : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1" style={{ color: passwordChecks.length ? '#34d399' : '#475569' }}>
                      <CheckCircle className="w-3 h-3" />
                      8+ characters
                    </div>
                    <div className="flex items-center gap-1" style={{ color: passwordChecks.uppercase ? '#34d399' : '#475569' }}>
                      <CheckCircle className="w-3 h-3" />
                      Uppercase
                    </div>
                    <div className="flex items-center gap-1" style={{ color: passwordChecks.lowercase ? '#34d399' : '#475569' }}>
                      <CheckCircle className="w-3 h-3" />
                      Lowercase
                    </div>
                    <div className="flex items-center gap-1" style={{ color: passwordChecks.number ? '#34d399' : '#475569' }}>
                      <CheckCircle className="w-3 h-3" />
                      Number
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>
                Confirm password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: '#475569' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                  className="fp-input w-full pl-10 pr-4 py-3"
                  style={
                    confirmPassword && password !== confirmPassword
                      ? { borderColor: 'rgba(248,113,113,0.5)' }
                      : undefined
                  }
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs" style={{ color: '#f87171' }}>Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || password !== confirmPassword}
              className="fp-btn-primary w-full flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-medium hover:underline" style={{ color: '#a78bfa' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Terms notice */}
        <p className="text-center text-xs mt-6 px-4" style={{ color: '#475569' }}>
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
