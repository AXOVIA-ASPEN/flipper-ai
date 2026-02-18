import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
