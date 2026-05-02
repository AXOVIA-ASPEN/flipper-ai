/**
 * @file app/layout.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Root layout — global providers, navigation, skip-link, and main landmark.
 *
 * @description
 * Server component root layout for every Flipper.ai page. Wires the canonical
 * providers (FirebaseAuth → Toast), renders the persistent <Navigation>, and
 * exposes a single <main id="main" tabIndex={-1}> landmark with a sibling
 * skip-link as the first focusable element of <body> (Story 14.10 AC #1).
 * Background canvas is composited via .fp-bg-mesh + .fp-bg-grid. The skip-link
 * + landmark satisfy WCAG 2.4.1 (Bypass Blocks) and 2.4.7 (Focus Visible).
 */
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { FirebaseAuthProvider } from '@/components/providers/FirebaseAuthProvider';
import { WebVitals } from '@/components/WebVitals';
import Navigation from '@/components/Navigation';
import { ToastProvider } from '@/components/ToastContainer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Flipper.ai - Find Profitable Flips',
  description:
    'AI-powered marketplace scraper to find underpriced items on Craigslist, Facebook Marketplace, and eBay for flipping profit.',
  keywords: ['flipping', 'reselling', 'marketplace', 'craigslist', 'ebay', 'facebook marketplace'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main" className="fp-skip-link">Skip to main content</a>
        <div className="fp-bg-mesh" aria-hidden="true" />
        <div className="fp-bg-grid" aria-hidden="true" />
        <FirebaseAuthProvider>
          <ToastProvider>
            <WebVitals />
            <Navigation />
            <main className="fp-content" id="main" tabIndex={-1}>
              {children}
            </main>
          </ToastProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
