/**
 * @file app/(auth)/reset-password/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Reset-password page — validates token and submits new password via API.
 *
 * @description
 * Two render paths: invalid-token state (when ?token is absent) and main form.
 * Calls POST /api/auth/reset-password on submit. Includes 3-criteria password-strength
 * meter (length, uppercase, number — ADR-14.4-D carve-out for security signals).
 * All visuals use canonical .fp-* classes; supersedes Story 14.2 placeholder replacements
 * and removes legacy CSS variable references.
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#8b5cf6' }} />
          </div>
        }
      >
        <ResetPasswordInner />
      </Suspense>
    </>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordChecks = {
    length: password.length >= 8,
    maxLength: password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const passwordStrength = [passwordChecks.length, passwordChecks.uppercase, passwordChecks.number].filter(Boolean).length;

  function strengthBarColor(strength: number): string {
    // ADR-14.4-D: security carve-out — green/yellow/red are semantic for password strength
    if (strength <= 1) return '#f87171'; // fp-red
    if (strength === 2) return '#fbbf24'; // fp-yellow
    return '#34d399'; // fp-green
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md relative z-10" role="main">
          <div className="fp-glass rounded-2xl overflow-hidden p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#f87171' }} />
            <h1 className="text-xl font-bold mb-2" style={{ color: '#e2e8f0' }}>Invalid Reset Link</h1>
            <p className="mb-6" style={{ color: '#94a3b8' }}>This password reset link is invalid or incomplete.</p>
            <Link
              href="/forgot-password"
              className="fp-btn-primary inline-flex items-center gap-2"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!passwordChecks.length) {
      setErrorMessage('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }
    if (!passwordChecks.maxLength) {
      setErrorMessage('Password must be at most 128 characters');
      setIsLoading(false);
      return;
    }
    if (!passwordChecks.uppercase) {
      setErrorMessage('Password must contain at least 1 uppercase letter');
      setIsLoading(false);
      return;
    }
    if (!passwordChecks.number) {
      setErrorMessage('Password must contain at least 1 number');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/login?reset=success');
      } else {
        const detail = data?.error?.detail || 'Something went wrong. Please try again.';
        setErrorMessage(detail);
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
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
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#e2e8f0' }}>Set new password</h1>
            <p style={{ color: '#94a3b8' }}>Enter your new password below</p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="fp-alert-danger mx-8 mb-4 p-3 flex items-center gap-2" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
              <span className="text-sm" style={{ color: '#fca5a5' }}>{errorMessage}</span>
              {errorMessage.includes('expired') && (
                <Link href="/forgot-password" className="text-sm hover:underline ml-1 whitespace-nowrap" style={{ color: '#a78bfa' }}>
                  Request new link
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>New password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: '#475569' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Create a new password"
                  className="fp-input w-full pl-10 pr-12 py-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 pl-3 flex items-center justify-center min-w-[44px] min-h-[44px]"
                  style={{ color: '#475569' }}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password strength indicator — ADR-14.4-D carve-out */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
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
                    <div className="flex items-center gap-1" style={{ color: passwordChecks.number ? '#34d399' : '#475569' }}>
                      <CheckCircle className="w-3 h-3" />
                      Number
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>Confirm password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: '#475569' }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
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
              disabled={isLoading || password !== confirmPassword || !passwordChecks.length || !passwordChecks.uppercase || !passwordChecks.number}
              className="fp-btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Reset password</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm hover:underline"
              style={{ color: '#a78bfa' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
