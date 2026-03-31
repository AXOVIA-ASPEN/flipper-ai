/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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

// Mock stripe pricing for UpgradePrompt
jest.mock('@/lib/stripe', () => ({
  TIER_PRICING: {
    FREE: { monthly: 0, label: 'Free' },
    FLIPPER: { monthly: 1900, label: '$19/mo' },
    PRO: { monthly: 4900, label: '$49/mo' },
  },
}));

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

  it('shows UpgradePrompt when scrape returns 403 tier limit', async () => {
    // First load with normal fetches for jobs/configs
    render(<ScraperPage />);
    await waitFor(() => {
      expect(screen.getByText('Scrape Listings')).toBeInTheDocument();
    });

    // Now override fetch so scraper endpoint returns 403
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'POST' && url.includes('/api/scraper/')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({
            success: false,
            error: {
              code: 'FORBIDDEN',
              detail: 'Daily scan limit reached. Upgrade to FLIPPER for unlimited scans.',
            },
          }),
        });
      }
      if (url.includes('/api/scraper-jobs')) {
        return Promise.resolve({ ok: true, json: async () => ({ jobs: mockJobs }) });
      }
      if (url.includes('/api/search-configs')) {
        return Promise.resolve({ ok: true, json: async () => ({ configs: mockConfigs }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Start Scraping/i });
    fireEvent.click(submitButton);

    // UpgradePrompt should appear with the tier limit message
    await waitFor(() => {
      expect(screen.getByText(/Upgrade Required/)).toBeInTheDocument();
      expect(screen.getByText(/Daily scan limit reached/)).toBeInTheDocument();
    });
  });

  it('shows UpgradePrompt when save config returns 403 tier limit', async () => {
    render(<ScraperPage />);
    await waitFor(() => {
      expect(screen.getByText('Scrape Listings')).toBeInTheDocument();
    });

    // Override fetch for search-configs POST to return 403
    mockFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'POST' && url.includes('/api/search-configs')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({
            success: false,
            error: {
              code: 'FORBIDDEN',
              detail: 'Search config limit reached (3 on Free plan). Upgrade for more.',
            },
          }),
        });
      }
      if (url.includes('/api/scraper-jobs')) {
        return Promise.resolve({ ok: true, json: async () => ({ jobs: mockJobs }) });
      }
      if (url.includes('/api/search-configs')) {
        return Promise.resolve({ ok: true, json: async () => ({ configs: mockConfigs }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    // Open save dialog and save
    const saveButton = screen.getByTitle('Save this search');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Save Search Configuration/)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Search name/);
    fireEvent.change(nameInput, { target: { value: 'Test Config' } });

    const saveConfirmButton = screen.getByRole('button', { name: /^Save$/ });
    fireEvent.click(saveConfirmButton);

    await waitFor(() => {
      expect(screen.getByText(/Upgrade Required/)).toBeInTheDocument();
      expect(screen.getByText(/Search config limit reached/)).toBeInTheDocument();
    });
  });
});
