/**
 * @file app/(auth)/forgot-password/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Forgot-password page — sends Firebase password reset email.
 *
 * @description
 * Public page that accepts an email address and calls Firebase resetPassword().
 * auth/user-not-found is treated as success to avoid leaking whether an account
 * exists. All visuals use canonical .fp-* classes; replaces raw purple/pink gradients
 * that existed before Epic 14 (this page was not on the legacy theme-class system).
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/firebase/auth';
import {
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      if (message.includes('auth/user-not-found')) {
        // Don't reveal whether user exists
        setSuccess(true);
      } else if (message.includes('auth/too-many-requests')) {
        setErrorMessage('Too many attempts. Please try again later.');
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
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
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#e2e8f0' }}>Reset your password</h1>
            <p style={{ color: '#94a3b8' }}>
              {success
                ? 'Check your email for a reset link'
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="fp-alert-danger mx-8 mb-4 p-3 flex items-center gap-2" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
              <span className="text-sm" style={{ color: '#fca5a5' }}>{errorMessage}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div
              className="fp-alert-success mx-8 mb-4 p-3 flex items-center gap-2"
              role="status"
              aria-live="polite"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#34d399' }} />
              <span className="text-sm" style={{ color: '#6ee7b7' }}>
                If an account exists with this email, you&apos;ll receive a password reset link shortly.
              </span>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="fp-input w-full pl-10 pr-4 py-3"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="fp-btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>Send reset link</span>
                )}
              </button>
            </form>
          ) : (
            <div className="px-8 pb-8">
              <Link href="/login" className="fp-btn-primary w-full flex items-center justify-center gap-2">
                <span>Back to sign in</span>
              </Link>
            </div>
          )}

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
