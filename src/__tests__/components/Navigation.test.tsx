/**
 * @file src/__tests__/components/Navigation.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-15
 * @version 1.0
 * @brief Auth-gating tests for the top Navigation component.
 *
 * @description
 * Verifies FR-AUTH-ACCESS-02: Navigation (dashboard links) must never render
 * for unauthenticated users or on public routes (landing, privacy, terms,
 * login, register, forgot-password, reset-password). Also verifies the
 * component renders correctly for authenticated users on protected routes.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
const mockPathname = jest.fn<string, []>();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// Mock auth context
const mockAuthContext = jest.fn<{ user: unknown; loading: boolean }, []>();
jest.mock('@/components/providers/FirebaseAuthProvider', () => ({
  useAuthContext: () => mockAuthContext(),
}));

// Mock UserMenu (has its own auth check we don't want to re-run here)
jest.mock('@/components/UserMenu', () => ({
  __esModule: true,
  default: () => <div data-testid="user-menu" />,
}));

// Mock fetch so the unread-count effect is silent
global.fetch = jest.fn().mockResolvedValue({ ok: false });

import Navigation from '@/components/Navigation';

function setAuth({ user, loading = false }: { user: unknown; loading?: boolean }) {
  mockAuthContext.mockReturnValue({ user, loading });
}

function setPath(path: string) {
  mockPathname.mockReturnValue(path);
}

describe('Navigation — auth gating (FR-AUTH-ACCESS-02)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renders nothing for unauthenticated users', () => {
    it.each([
      ['/', 'landing'],
      ['/login', 'login'],
      ['/register', 'register'],
      ['/forgot-password', 'forgot-password'],
      ['/reset-password', 'reset-password'],
      ['/privacy', 'privacy'],
      ['/terms', 'terms'],
      ['/dashboard', 'dashboard (even if path is protected)'],
      ['/opportunities', 'opportunities'],
    ])('returns null on %s (%s) when user is null', (path) => {
      setPath(path);
      setAuth({ user: null });
      const { container } = render(<Navigation />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null while auth is still loading', () => {
      setPath('/dashboard');
      setAuth({ user: null, loading: true });
      const { container } = render(<Navigation />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('does not render on public routes even when authed', () => {
    const authedUser = { uid: 'test-user-id', email: 'test@example.com' };

    it.each([
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/privacy',
      '/terms',
    ])('returns null on public route %s', (path) => {
      setPath(path);
      setAuth({ user: authedUser });
      const { container } = render(<Navigation />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('renders full nav for authenticated users on protected routes', () => {
    const authedUser = { uid: 'test-user-id', email: 'test@example.com' };

    it.each([
      '/dashboard',
      '/opportunities',
      '/messages',
      '/posting-queue',
      '/settings',
    ])('renders nav on %s when user is authenticated', (path) => {
      setPath(path);
      setAuth({ user: authedUser });
      render(<Navigation />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Opportunities')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Cross-Posts')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('Dashboard nav link points to /dashboard (not /)', () => {
      setPath('/dashboard');
      setAuth({ user: authedUser });
      render(<Navigation />);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });
});
