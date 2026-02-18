'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DollarSign, TrendingUp, Zap, Shield, Search, BarChart } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleGetStarted = () => {
    router.push('/auth/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Header */}
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🐧</div>
              <h1 className="text-2xl font-bold text-white">Flipper.ai</h1>
            </div>
            <div className="flex gap-4">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-white hover:text-purple-300 transition-colors"
              >
                Log In
              </Link>
              <button
                onClick={handleGetStarted}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                Get Started Free
              </button>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Find Hidden Profits in
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                {' '}Every Marketplace
              </span>
            </h2>
            <p className="text-xl text-blue-200/80 mb-8 max-w-2xl mx-auto">
              AI-powered marketplace scanner that finds underpriced items on Craigslist, Facebook, eBay, OfferUp, and Mercari. 
              Turn $50 into $500 with smart flipping.
            </p>

            {/* CTA Form */}
            <div className="flex gap-3 max-w-md mx-auto mb-12">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleGetStarted}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all"
              >
                Start Free
              </button>
            </div>

            <p className="text-sm text-blue-200/60">
              ✨ Free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          Everything You Need to Flip Like a Pro
        </h3>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Multi-Platform Scanning</h4>
            <p className="text-blue-200/70">
              Search Craigslist, Facebook Marketplace, eBay, OfferUp, and Mercari simultaneously. Never miss a deal.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">AI Value Detection</h4>
            <p className="text-blue-200/70">
              Claude AI analyzes every listing to estimate market value and profit potential in seconds.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Profit Calculator</h4>
            <p className="text-blue-200/70">
              See instant profit projections including fees, shipping, and resale difficulty ratings.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Real-Time Alerts</h4>
            <p className="text-blue-200/70">
              Get instant notifications when high-value opportunities appear. Beat the competition.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mb-4">
              <BarChart className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Market Insights</h4>
            <p className="text-blue-200/70">
              Track trends, sold listings, and pricing history to make data-driven flipping decisions.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Scam Detection</h4>
            <p className="text-blue-200/70">
              AI flags suspicious listings, fake prices, and scams before you waste time.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          Simple, Transparent Pricing
        </h3>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h4 className="text-xl font-semibold text-white mb-2">Free</h4>
            <p className="text-4xl font-bold text-white mb-4">$0<span className="text-lg text-blue-200/60">/mo</span></p>
            <ul className="space-y-3 mb-6 text-blue-200/80">
              <li>✓ 5 scans per day</li>
              <li>✓ Basic AI analysis</li>
              <li>✓ 1 marketplace</li>
              <li>✓ Email alerts</li>
            </ul>
            <button className="w-full px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all">
              Start Free
            </button>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-8 border-2 border-purple-500 scale-105 shadow-2xl">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full w-fit mb-4">
              MOST POPULAR
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Pro</h4>
            <p className="text-4xl font-bold text-white mb-4">$29<span className="text-lg text-blue-200/60">/mo</span></p>
            <ul className="space-y-3 mb-6 text-blue-200/80">
              <li>✓ Unlimited scans</li>
              <li>✓ Advanced AI analysis</li>
              <li>✓ All 5 marketplaces</li>
              <li>✓ Real-time alerts</li>
              <li>✓ Profit tracking</li>
            </ul>
            <button
              onClick={handleGetStarted}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all"
            >
              Start Pro Trial
            </button>
          </div>

          {/* Business Tier */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h4 className="text-xl font-semibold text-white mb-2">Business</h4>
            <p className="text-4xl font-bold text-white mb-4">$99<span className="text-lg text-blue-200/60">/mo</span></p>
            <ul className="space-y-3 mb-6 text-blue-200/80">
              <li>✓ Everything in Pro</li>
              <li>✓ API access</li>
              <li>✓ Team collaboration</li>
              <li>✓ Custom alerts</li>
              <li>✓ Priority support</li>
            </ul>
            <button className="w-full px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all">
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-12 border border-purple-500/30 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Start Flipping Smarter?
          </h3>
          <p className="text-xl text-blue-200/80 mb-8 max-w-2xl mx-auto">
            Join thousands of flippers making consistent profits with AI-powered deal detection.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg rounded-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
          >
            Start Your Free Trial
          </button>
          <p className="text-sm text-blue-200/60 mt-4">
            No credit card required • 14-day free trial
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🐧</div>
              <span className="text-white font-semibold">Flipper.ai</span>
            </div>
            <div className="flex gap-6 text-blue-200/60 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
          <div className="mt-8 text-center text-blue-200/40 text-sm">
            © 2026 Flipper.ai by Axovia AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
