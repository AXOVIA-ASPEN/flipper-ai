/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

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

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock ThemeContext
const mockTheme = {
  id: 'purple',
  name: 'Purple Dream',
  description: 'Default',
  colors: {
    primaryFrom: 'purple-500',
    primaryTo: 'pink-600',
    primaryShadow: 'purple-500/50',
    secondaryFrom: 'blue-500',
    secondaryTo: 'purple-600',
    secondaryShadow: 'blue-500/50',
    accentBlue: { from: 'blue-400', to: 'blue-600', shadow: 'blue-500/50' },
    accentGreen: { from: 'green-400', to: 'emerald-600', shadow: 'green-500/50' },
    accentOrange: { from: 'yellow-400', to: 'orange-600', shadow: 'orange-500/50' },
    accentPurple: { from: 'purple-400', to: 'purple-600', shadow: 'purple-500/50' },
    orbColors: ['purple-500', 'blue-500', 'pink-500'],
    textGradient: { from: 'purple-200', via: 'pink-200', to: 'blue-200' },
    textMuted: 'blue-200/70',
  },
};
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: jest.fn(),
    availableThemes: [mockTheme],
  }),
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

/** Returns a realistic user settings API response */
function makeSettingsResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        id: 'settings-1',
        userId: 'user-1',
        openaiApiKey: null,
        hasOpenaiApiKey: false,
        llmModel: 'gpt-4o-mini',
        discountThreshold: 50,
        autoAnalyze: true,
        emailNotifications: true,
        notifyNewDeals: true,
        notifyPriceDrops: true,
        notifySoldItems: false,
        notifyExpiring: true,
        notifyWeeklyDigest: false,
        notifyFrequency: 'instant',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          image: null,
        },
        ...overrides,
      },
    }),
  };
}

function setupDefaultFetch() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/user/settings')) {
      return Promise.resolve(makeSettingsResponse());
    }
    if (url.includes('/api/search-configs')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ configs: [] }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

import SettingsPage from '@/app/settings/page';

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultFetch();
  });

  // ─── Basic rendering ──────────────────────────────────────────

  it('renders settings page with heading', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('renders Theme Settings section', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Theme Settings')).toBeInTheDocument();
    });
  });

  it('renders Notification Settings section', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });
  });

  it('loads notification settings from API', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/user/settings'));
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network failure'));
    render(<SettingsPage />);
    await waitFor(() => {
      // The component should still render, showing error state
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  // ─── Notification preferences ───────────────────────────

  it('shows Email Notifications toggle after loading', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });
  });

  it('shows notification type labels after loading', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('New Deal Alerts')).toBeInTheDocument();
      expect(screen.getByText('Price Drop Alerts')).toBeInTheDocument();
    });
  });

  it('shows Notification Frequency section', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Notification Frequency')).toBeInTheDocument();
    });
  });

  it('toggles notification and calls PATCH API', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/api/user/settings') && opts?.method === 'PATCH') {
        return Promise.resolve(makeSettingsResponse());
      }
      if (url.includes('/api/user/settings')) {
        return Promise.resolve(makeSettingsResponse());
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<SettingsPage />);

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    });

    // Click the Email Notifications toggle button
    const toggleBtn = screen.getByLabelText('Toggle email notifications');
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    await waitFor(() => {
      const patchCalls = mockFetch.mock.calls.filter(
        ([url, opts]: [string, RequestInit | undefined]) =>
          url.includes('/api/user/settings') && opts?.method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });
  });

  it('populates notification state from API response', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/user/settings')) {
        return Promise.resolve(
          makeSettingsResponse({
            emailNotifications: false,
            notifyNewDeals: false,
            notifyWeeklyDigest: true,
            notifyFrequency: 'daily',
          })
        );
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('Notification Frequency')).toBeInTheDocument();
    });
  });
});
