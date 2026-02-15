/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

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

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockJobs = [
  {
    id: 'job-1',
    platform: 'EBAY',
    status: 'COMPLETED',
    location: 'tampa',
    category: 'electronics',
    listingsFound: 25,
    opportunitiesFound: 3,
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

const mockConfigs: any[] = [];

function setupFetch() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/scraper-jobs')) {
      return Promise.resolve({ ok: true, json: async () => ({ jobs: mockJobs }) });
    }
    if (url.includes('/api/search-configs')) {
      return Promise.resolve({ ok: true, json: async () => ({ configs: mockConfigs }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

import ScraperPage from '@/app/scraper/page';

describe('ScraperPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFetch();
  });

  it('renders the scraper page title', async () => {
    render(<ScraperPage />);
    await waitFor(() => {
      expect(screen.getByText('Scrape Listings')).toBeInTheDocument();
    });
  });

  it('fetches jobs on mount', async () => {
    render(<ScraperPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/scraper-jobs'));
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<ScraperPage />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('displays completed job info', async () => {
    render(<ScraperPage />);
    await waitFor(() => {
      expect(screen.getByText(/COMPLETED/i)).toBeInTheDocument();
    });
  });
});
