/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: () => null }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const handler = {
    get: (_: any, name: string) => {
      const Component = (props: any) => <span data-testid={`icon-${name}`} {...props} />;
      Component.displayName = name;
      return Component;
    },
  };
  return new Proxy({}, handler);
});

import LandingPage from '../../../app/page';

describe('LandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the hero section with headline and subheadline', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Find Hidden Profits in/i)).toBeInTheDocument();
    expect(screen.getByText(/Every Marketplace/i)).toBeInTheDocument();
    expect(screen.getByText(/AI-powered marketplace scanner/i)).toBeInTheDocument();
  });

  it('renders the Flipper AI brand name', () => {
    render(<LandingPage />);
    const brandNames = screen.getAllByText('Flipper.ai');
    expect(brandNames.length).toBeGreaterThanOrEqual(1);
  });

  describe('Pricing Tiers', () => {
    it('renders Free tier with correct name and price', () => {
      render(<LandingPage />);
      expect(screen.getByText('Free')).toBeInTheDocument();
      const priceElements = screen.getAllByText(/\$0/);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('renders Pro tier with correct name and price', () => {
      render(<LandingPage />);
      const proHeadings = screen.getAllByText('Pro');
      expect(proHeadings.length).toBeGreaterThan(0);
      expect(screen.getByText('$29')).toBeInTheDocument();
    });

    it('renders Business tier with correct name and price', () => {
      render(<LandingPage />);
      expect(screen.getByText('Business')).toBeInTheDocument();
      expect(screen.getByText('$99')).toBeInTheDocument();
    });

    it('highlights Pro tier as MOST POPULAR', () => {
      render(<LandingPage />);
      expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
    });

    it('renders correct Free tier features', () => {
      render(<LandingPage />);
      expect(screen.getByText('✓ 5 scans per day')).toBeInTheDocument();
      expect(screen.getByText('✓ 1 marketplace')).toBeInTheDocument();
      expect(screen.getByText('✓ Basic AI analysis')).toBeInTheDocument();
    });

    it('renders correct Pro tier features', () => {
      render(<LandingPage />);
      expect(screen.getByText('✓ Unlimited scans')).toBeInTheDocument();
      expect(screen.getByText('✓ All 5 marketplaces')).toBeInTheDocument();
      expect(screen.getByText('✓ Profit tracking')).toBeInTheDocument();
    });

    it('renders correct Business tier features', () => {
      render(<LandingPage />);
      expect(screen.getByText('✓ Everything in Pro')).toBeInTheDocument();
      expect(screen.getByText('✓ Priority support')).toBeInTheDocument();
      expect(screen.getByText('✓ API access')).toBeInTheDocument();
    });
  });

  describe('CTA Navigation', () => {
    it('Get Started Free button navigates to /auth/signup', () => {
      render(<LandingPage />);
      const btn = screen.getAllByRole('button', { name: /Get Started Free/i });
      expect(btn.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(btn[0]);
      expect(mockPush).toHaveBeenCalledWith('/auth/signup');
    });

    it('Start Pro Trial button navigates to /auth/signup', () => {
      render(<LandingPage />);
      const btn = screen.getByRole('button', { name: /Start Pro Trial/i });
      fireEvent.click(btn);
      expect(mockPush).toHaveBeenCalledWith('/auth/signup');
    });

    it('Start Your Free Trial button navigates to /auth/signup', () => {
      render(<LandingPage />);
      const btn = screen.getByRole('button', { name: /Start Your Free Trial/i });
      fireEvent.click(btn);
      expect(mockPush).toHaveBeenCalledWith('/auth/signup');
    });

    it('Log In link points to /auth/login', () => {
      render(<LandingPage />);
      const loginLink = screen.getByRole('link', { name: 'Log In' });
      expect(loginLink).toHaveAttribute('href', '/auth/login');
    });
  });

  describe('Features Section', () => {
    it('renders all 6 feature cards with titles', () => {
      render(<LandingPage />);
      expect(screen.getByText('Multi-Platform Scanning')).toBeInTheDocument();
      expect(screen.getByText('AI Value Detection')).toBeInTheDocument();
      expect(screen.getByText('Profit Calculator')).toBeInTheDocument();
      expect(screen.getByText('Real-Time Alerts')).toBeInTheDocument();
      expect(screen.getByText('Market Insights')).toBeInTheDocument();
      expect(screen.getByText('Scam Detection')).toBeInTheDocument();
    });

    it('renders feature icons', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('icon-Search')).toBeInTheDocument();
      expect(screen.getByTestId('icon-TrendingUp')).toBeInTheDocument();
      expect(screen.getByTestId('icon-DollarSign')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Zap')).toBeInTheDocument();
      expect(screen.getByTestId('icon-BarChart')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Shield')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('renders Privacy link to /privacy', () => {
      render(<LandingPage />);
      const privacyLink = screen.getByRole('link', { name: 'Privacy' });
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('renders Terms link to /terms', () => {
      render(<LandingPage />);
      const termsLink = screen.getByRole('link', { name: 'Terms' });
      expect(termsLink).toHaveAttribute('href', '/terms');
    });

    it('renders Contact link to /contact', () => {
      render(<LandingPage />);
      const contactLink = screen.getByRole('link', { name: 'Contact' });
      expect(contactLink).toHaveAttribute('href', '/contact');
    });

    it('renders copyright with Axovia AI', () => {
      render(<LandingPage />);
      expect(screen.getByText(/Axovia AI/)).toBeInTheDocument();
    });

    it('renders copyright with current year', () => {
      render(<LandingPage />);
      const currentYear = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
    });

    it('uses footer element', () => {
      const { container } = render(<LandingPage />);
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Semantic HTML', () => {
    it('uses nav element for main navigation', () => {
      const { container } = render(<LandingPage />);
      const navs = container.querySelectorAll('nav');
      expect(navs.length).toBeGreaterThanOrEqual(1);
    });

    it('has h1 for brand name', () => {
      const { container } = render(<LandingPage />);
      const h1s = container.querySelectorAll('h1');
      expect(h1s.length).toBeGreaterThanOrEqual(1);
    });

    it('has section headings for features and pricing', () => {
      render(<LandingPage />);
      expect(screen.getByText('Everything You Need to Flip Like a Pro')).toBeInTheDocument();
      expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
    });
  });
});
