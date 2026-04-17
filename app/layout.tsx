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
        <div className="fp-bg-mesh" aria-hidden="true" />
        <div className="fp-bg-grid" aria-hidden="true" />
        <FirebaseAuthProvider>
          <ToastProvider>
            <WebVitals />
            <Navigation />
            <div className="fp-content">
              {children}
            </div>
          </ToastProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
