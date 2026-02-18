import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flipper.ai - Find Profitable Flips',
  description: 'AI-powered marketplace scraper to find underpriced items.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
