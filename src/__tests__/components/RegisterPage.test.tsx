/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Mock Firebase auth hook
const mockSignUp = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockSignInWithGitHub = jest.fn();
jest.mock('@/hooks/useFirebaseAuth', () => ({
  useFirebaseAuth: () => ({
    user: null,
    loading: false,
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithGitHub: mockSignInWithGitHub,
    signOut: jest.fn(),
  }),
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

// Mock fetch (for PATCH /api/user/settings after signUp)
const mockFetch = jest.fn();
global.fetch = mockFetch;

import RegisterPage from '@/app/(auth)/register/page';

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders registration form fields', () => {
    render(<RegisterPage />);
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
  });

  it('renders create account button', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(<RegisterPage />);
    const links = screen.getAllByRole('link');
    const loginLink = links.find((l) => l.getAttribute('href')?.includes('login'));
    expect(loginLink).toBeTruthy();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Create a password'), 'Password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'Different456');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Create a password'), 'short');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'short');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('submits registration via Firebase signUp on success', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Create a password'), 'Password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'Password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password123', 'Test User');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/settings');
    });
  });

  it('shows error when email already in use', async () => {
    const user = userEvent.setup();
    mockSignUp.mockRejectedValue(new Error('auth/email-already-in-use'));

    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('Create a password'), 'Password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'Password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it('handles network error gracefully', async () => {
    const user = userEvent.setup();
    mockSignUp.mockRejectedValue(new Error('Network error'));

    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Create a password'), 'Password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'Password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('renders OAuth buttons for Google and GitHub', () => {
    render(<RegisterPage />);
    expect(screen.getByText(/sign up with google/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up with github/i)).toBeInTheDocument();
  });

  it('shows password strength indicators as user types', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const passwordField = screen.getByPlaceholderText('Create a password');
    await user.type(passwordField, 'Abcd1234');

    expect(passwordField).toHaveValue('Abcd1234');
  });
});
