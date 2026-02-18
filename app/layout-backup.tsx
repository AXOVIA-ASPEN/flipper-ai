// BACKUP OF ORIGINAL LAYOUT
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemeStyles } from '@/components/ThemeStyles';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { WebVitals } from '@/components/WebVitals';
import Navigation from '@/components/Navigation';
import { Analytics } from '@vercel/analytics/next';

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
        <SessionProvider>
          <ThemeProvider>
            <ThemeStyles />
            <WebVitals />
            {children}
            <Analytics />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
