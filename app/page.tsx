/**
 * @file app/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Public landing page — canonical dark-glassmorphism design, no page-level bg override.
 *
 * @description
 * Landing page for Flipper.ai. Authenticates users via FirebaseAuthProvider and
 * redirects already-signed-in users to /dashboard. All surfaces use .fp-* canonical
 * utility classes; no page-level background gradient, no animated orbs.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DollarSign, TrendingUp, Zap, Shield, Search, BarChart } from 'lucide-react';
import { useAuthContext } from '@/components/providers/FirebaseAuthProvider';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const [email, setEmail] = useState('');

  // FR-AUTH-ACCESS-04: authenticated users on landing are redirected to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleGetStarted = () => {
    router.push('/register');
  };

  return (
    <div className="min-h-screen">
      {/* Top-level header landmark — contains the public nav. */}
      <header>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🐧</div>
              <h1 className="text-2xl font-bold">
                <span className="fp-grad-purple">Flipper.ai</span>
              </h1>
            </div>
            <div className="flex gap-4 items-center">
              <Link href="/login" className="fp-btn-ghost">
                Log In
              </Link>
              <button onClick={handleGetStarted} className="fp-btn-hot">
                Get Started Free
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content — hero, features, pricing, CTA. Landmark provided by app/layout.tsx <main>. */}
      <div>
        {/* Hero Section */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: '#e2e8f0' }}>
            Find Hidden Profits in{' '}
            <span className="fp-grad-purple">Every Marketplace</span>
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#94a3b8' }}>
            AI-powered marketplace scanner that finds underpriced items on Craigslist, Facebook, eBay,
            OfferUp, and Mercari. Turn $50 into $500 with smart flipping.
          </p>

          {/* CTA Form */}
          <div className="flex gap-3 max-w-md mx-auto mb-12">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fp-input flex-1"
            />
            <button onClick={handleGetStarted} className="fp-btn-hot">
              Start Free
            </button>
          </div>

          <p className="text-sm" style={{ color: '#94a3b8' }}>
            ✨ Free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h3 className="text-3xl font-bold text-center mb-12" style={{ color: '#e2e8f0' }}>
          Everything You Need to Flip Like a Pro
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="fp-glow-card fp-glass p-6">
            <div className="fp-glass-sm w-12 h-12 flex items-center justify-center rounded-full mb-4">
              <Search className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            </div>
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Multi-Platform Scanning</h4>
            <p style={{ color: '#94a3b8' }}>
              Search Craigslist, Facebook Marketplace, eBay, OfferUp, and Mercari simultaneously. Never miss a deal.
            </p>
          </div>

          <div className="fp-glow-card fp-glass p-6">
            <div className="fp-glass-sm w-12 h-12 flex items-center justify-center rounded-full mb-4">
              <TrendingUp className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            </div>
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>AI Value Detection</h4>
            <p style={{ color: '#94a3b8' }}>
              Claude AI analyzes every listing to estimate market value and profit potential in seconds.
            </p>
          </div>

          <div className="fp-glow-card fp-glass p-6">
            <div className="fp-glass-sm w-12 h-12 flex items-center justify-center rounded-full mb-4">
              <DollarSign className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            </div>
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Profit Calculator</h4>
            <p style={{ color: '#94a3b8' }}>
              See instant profit projections including fees, shipping, and resale difficulty ratings.
            </p>
          </div>

          <div className="fp-glow-card fp-glass p-6">
            <div className="fp-glass-sm w-12 h-12 flex items-center justify-center rounded-full mb-4">
              <Zap className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            </div>
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Real-Time Alerts</h4>
            <p style={{ color: '#94a3b8' }}>
              Get instant notifications when high-value opportunities appear. Beat the competition.
            </p>
          </div>

          <div className="fp-glow-card fp-glass p-6">
            <div className="fp-glass-sm w-12 h-12 flex items-center justify-center rounded-full mb-4">
              <BarChart className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            </div>
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Market Insights</h4>
            <p style={{ color: '#94a3b8' }}>
              Track trends, sold listings, and pricing history to make data-driven flipping decisions.
            </p>
          </div>

          <div className="fp-glow-card fp-glass p-6">
            <div className="fp-glass-sm w-12 h-12 flex items-center justify-center rounded-full mb-4">
              <Shield className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            </div>
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Scam Detection</h4>
            <p style={{ color: '#94a3b8' }}>
              AI flags suspicious listings, fake prices, and scams before you waste time.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h3 className="text-3xl font-bold text-center mb-12" style={{ color: '#e2e8f0' }}>
          Simple, Transparent Pricing
        </h3>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          {/* Free Tier */}
          <div className="fp-glass p-8 rounded-xl">
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Free</h4>
            <p className="text-4xl font-bold mb-4" style={{ color: '#e2e8f0' }}>
              $0<span className="text-lg" style={{ color: '#94a3b8' }}>/mo</span>
            </p>
            <ul className="space-y-3 mb-6" style={{ color: '#94a3b8' }}>
              <li>✓ 5 scans per day</li>
              <li>✓ Basic AI analysis</li>
              <li>✓ 1 marketplace</li>
              <li>✓ Email alerts</li>
            </ul>
            <button onClick={handleGetStarted} className="fp-btn-ghost w-full">Start Free</button>
          </div>

          {/* Pro Tier — .fp-hot-card provides the animated border (::before z-index:-1)
              over a combined .fp-glass surface so the border stays visible without a
              nested wrapper that would create a new stacking context. */}
          <div className="fp-hot-card fp-glass p-10 rounded-xl">
            <span className="fp-badge fp-badge-purple mb-4 block w-fit">MOST POPULAR</span>
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Pro</h4>
            <p className="text-4xl font-bold mb-4" style={{ color: '#e2e8f0' }}>
              $29<span className="text-lg" style={{ color: '#94a3b8' }}>/mo</span>
            </p>
            <ul className="space-y-3 mb-6" style={{ color: '#94a3b8' }}>
              <li>✓ Unlimited scans</li>
              <li>✓ Advanced AI analysis</li>
              <li>✓ All 5 marketplaces</li>
              <li>✓ Real-time alerts</li>
              <li>✓ Profit tracking</li>
            </ul>
            <button onClick={handleGetStarted} className="fp-btn-primary w-full">Start Pro Trial</button>
          </div>

          {/* Business Tier */}
          <div className="fp-glass p-8 rounded-xl">
            <h4 className="text-xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Business</h4>
            <p className="text-4xl font-bold mb-4" style={{ color: '#e2e8f0' }}>
              $99<span className="text-lg" style={{ color: '#94a3b8' }}>/mo</span>
            </p>
            <ul className="space-y-3 mb-6" style={{ color: '#94a3b8' }}>
              <li>✓ Everything in Pro</li>
              <li>✓ API access</li>
              <li>✓ Team collaboration</li>
              <li>✓ Custom alerts</li>
              <li>✓ Priority support</li>
            </ul>
            <button className="fp-btn-ghost w-full">Contact Sales</button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="fp-glass p-12 rounded-2xl text-center">
          <h3 className="text-3xl font-bold mb-4" style={{ color: '#e2e8f0' }}>
            Ready to Start Flipping Smarter?
          </h3>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#94a3b8' }}>
            Join thousands of flippers making consistent profits with AI-powered deal detection.
          </p>
          <button
            onClick={handleGetStarted}
            className="fp-btn-hot text-lg px-8 py-4"
          >
            Start Your Free Trial
          </button>
          <p className="text-sm mt-4" style={{ color: '#94a3b8' }}>
            No credit card required • 14-day free trial
          </p>
        </div>
      </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '6rem' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🐧</div>
              <span className="font-semibold" style={{ color: '#e2e8f0' }}>Flipper.ai</span>
            </div>
            <div className="flex gap-6 text-sm" style={{ color: '#94a3b8' }}>
              <Link href="/privacy" className="hover:underline" style={{ color: '#94a3b8' }}>Privacy</Link>
              <Link href="/terms" className="hover:underline" style={{ color: '#94a3b8' }}>Terms</Link>
              <Link href="/contact" className="hover:underline" style={{ color: '#94a3b8' }}>Contact</Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm" style={{ color: '#94a3b8' }}>
            © 2026 Flipper.ai by Axovia AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
