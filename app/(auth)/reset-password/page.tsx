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
          <div className="min-h-screen bg-theme-page flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-theme-accent" />
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

  if (!token) {
    return (
      <div className="min-h-screen bg-theme-page flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-theme-orb-1 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-theme-orb-2 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h1>
            <p className="text-theme-muted mb-6">This password reset link is invalid or incomplete.</p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 px-4 py-3 bg-theme-button text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-theme-button hover:shadow-xl"
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
    <div className="min-h-screen bg-theme-page flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-theme-orb-1 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-theme-orb-2 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <Link href="/" className="inline-block mb-6 group">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-theme-primary rounded-xl flex items-center justify-center shadow-lg shadow-theme-button group-hover:shadow-xl transition-shadow">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, var(--theme-text-gradient-from), var(--theme-text-gradient-via), var(--theme-text-gradient-to))' }}>
                  Flipper.ai
                </span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
            <p className="text-theme-muted">Enter your new password below</p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mx-8 mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{errorMessage}</span>
              {errorMessage.includes('expired') && (
                <Link href="/forgot-password" className="text-sm text-theme-accent underline ml-1 whitespace-nowrap">
                  Request new link
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">New password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/50" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Create a new password"
                  className="w-full pl-10 pr-12 py-3 bg-white/10 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus-ring)] focus:border-[var(--theme-focus-ring)] text-white placeholder-white/30 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-blue-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? passwordStrength <= 1
                              ? 'bg-red-400'
                              : passwordStrength === 2
                                ? 'bg-yellow-400'
                                : 'bg-green-400'
                            : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-300' : 'text-white/40'}`}>
                      <CheckCircle className="w-3 h-3" />
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-1 ${passwordChecks.uppercase ? 'text-green-300' : 'text-white/40'}`}>
                      <CheckCircle className="w-3 h-3" />
                      Uppercase
                    </div>
                    <div className={`flex items-center gap-1 ${passwordChecks.number ? 'text-green-300' : 'text-white/40'}`}>
                      <CheckCircle className="w-3 h-3" />
                      Number
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Confirm password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/50" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--theme-focus-ring)] text-white placeholder-white/30 transition-all duration-300 ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-400/50'
                      : 'border-white/20 focus:border-purple-400/50'
                  }`}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-300">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || password !== confirmPassword || !passwordChecks.length || !passwordChecks.uppercase || !passwordChecks.number}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-button text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-theme-button hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="inline-flex items-center gap-1 text-sm text-theme-muted hover:text-white transition-colors"
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
