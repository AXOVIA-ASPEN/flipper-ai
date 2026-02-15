/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  }),
  signOut: jest.fn(),
}));

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

function setupFetch() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        claudeApiKey: '',
        preferredPlatforms: ['EBAY'],
        defaultLocation: 'tampa',
        notificationsEnabled: true,
        autoScanEnabled: false,
        scanInterval: 30,
      },
    }),
  });
}

import SettingsPage from '@/app/settings/page';

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFetch();
  });

  it('renders settings page', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('loads user settings from API', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/user/settings'));
    });
  });

  it('handles fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('fail'));
    render(<SettingsPage />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('shows save button', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Save Settings/i)).toBeInTheDocument();
    });
  });
});
