/**
 * @jest-environment jsdom
 *
 * Tests for OnboardingGuard — client-side redirect for un-onboarded users.
 * Covers: excluded paths, auth state pass-through, redirect logic, caching, error resilience.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

// Must be defined before mocks so factories can close over them
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({ replace: mockReplace })),
}));

jest.mock('@/components/providers/FirebaseAuthProvider', () => ({
  useAuthContext: jest.fn(() => ({ user: null, loading: false })),
}));

import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/providers/FirebaseAuthProvider';
import { OnboardingGuard } from '@/components/OnboardingGuard';

const mockPathname = usePathname as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockAuth = useAuthContext as jest.Mock;

const MOCK_USER = { uid: 'user-123', email: 'test@example.com' };

function renderGuard() {
  return render(
    <OnboardingGuard>
      <div data-testid="child">content</div>
    </OnboardingGuard>
  );
}

describe('OnboardingGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockReset();
    mockUseRouter.mockReturnValue({ replace: mockReplace });
    mockPathname.mockReturnValue('/dashboard');
    global.fetch = jest.fn();
  });

  // ─── Immediate pass-through (no API call) ────────────────────────────────

  describe('immediate pass-through (no API call)', () => {
    it('renders children when auth is still loading', () => {
      mockAuth.mockReturnValue({ user: null, loading: true });
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children when user is not authenticated', () => {
      mockAuth.mockReturnValue({ user: null, loading: false });
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /onboarding (excluded — prevents redirect loop)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/onboarding');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /onboarding/sub-path (excluded sub-path)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/onboarding/step-2');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /login (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/login');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /register (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/register');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /forgot-password (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/forgot-password');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /privacy (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/privacy');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /terms (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/terms');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /api/* paths (excluded — prevents circular redirects)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/api/user/onboarding');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /_next/* (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/_next/static/chunks/main.js');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /favicon.ico (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/favicon.ico');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('renders children for /robots.txt (excluded)', () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      mockPathname.mockReturnValue('/robots.txt');
      const { getByTestId } = renderGuard();
      expect(getByTestId('child')).toBeTruthy();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ─── Authenticated user on non-excluded path ─────────────────────────────

  describe('authenticated user on non-excluded path', () => {
    it('calls /api/user/onboarding to check status', async () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: true, data: { onboardingComplete: true } }),
      });

      renderGuard();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/onboarding');
      });
    });

    it('redirects to /onboarding when onboardingComplete is false', async () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          success: true,
          data: { onboardingComplete: false, onboardingStep: 1 },
        }),
      });

      renderGuard();

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('does NOT redirect when onboardingComplete is true', async () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          success: true,
          data: { onboardingComplete: true, onboardingStep: 6 },
        }),
      });

      const { getByTestId } = renderGuard();

      await waitFor(() => {
        expect(getByTestId('child')).toBeTruthy();
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('renders children after check completes (confirmed complete)', async () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: true, data: { onboardingComplete: true } }),
      });

      const { getByTestId } = renderGuard();

      await waitFor(() => {
        expect(getByTestId('child')).toBeTruthy();
      });
    });

    it('renders children even when API call fails (non-fatal)', async () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderGuard();

      await waitFor(() => {
        expect(getByTestId('child')).toBeTruthy();
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('does not redirect when API returns success=false', async () => {
      mockAuth.mockReturnValue({ user: MOCK_USER, loading: false });
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: false, error: { code: 'NOT_FOUND' } }),
      });

      const { getByTestId } = renderGuard();

      await waitFor(() => {
        expect(getByTestId('child')).toBeTruthy();
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
