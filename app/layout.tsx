import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemeStyles } from '@/components/ThemeStyles';

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
        <SessionProvider>
          <ThemeProvider>
            <ThemeStyles />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
