"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === "CredentialsSignin" ? "Invalid email or password" : null
  );

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuthSignIn(provider: "google" | "github") {
    setIsLoading(true);
    setErrorMessage(null);
    await signIn(provider, { callbackUrl });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-6000" />
      </div>

      {/* Floating stats cards */}
      <div className="absolute left-10 top-1/4 hidden lg:block">
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 transform -rotate-6 hover:rotate-0 transition-transform duration-500 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-300">Avg. Profit</p>
              <p className="text-xl font-bold text-white">$127/flip</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-10 top-1/3 hidden lg:block">
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 transform rotate-6 hover:rotate-0 transition-transform duration-500 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-300">Success Rate</p>
              <p className="text-xl font-bold text-white">94%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-20 bottom-1/4 hidden lg:block">
        <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 transform rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-300">AI Powered</p>
              <p className="text-xl font-bold text-white">100%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main login card */}
      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <Link href="/" className="inline-block mb-6 group">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:shadow-purple-500/80 transition-shadow">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 bg-clip-text text-transparent">
                  Flipper.ai
                </span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-blue-200/70">
              Sign in to find your next profitable flip
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mx-8 mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          {/* OAuth buttons */}
          <div className="px-8 space-y-3">
            <button
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
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
              <span className="font-medium group-hover:translate-x-0.5 transition-transform">
                Continue with Google
              </span>
            </button>

            <button
              onClick={() => handleOAuthSignIn("github")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="font-medium group-hover:translate-x-0.5 transition-transform">
                Continue with GitHub
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="px-8 my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-blue-200/50">
                  or continue with email
                </span>
              </div>
            </div>
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentialsSubmit} className="px-8 pb-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-blue-300/50" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white placeholder-blue-200/30 transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/90 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-blue-300/50" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 bg-white/10 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 text-white placeholder-blue-200/30 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300/50 hover:text-blue-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-blue-200/60 text-sm">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-purple-300 hover:text-purple-200 font-medium transition-colors"
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-blue-200/40 text-sm mt-6">
          Powered by AI to maximize your flipping profits
        </p>
      </div>
    </div>
  );
}
