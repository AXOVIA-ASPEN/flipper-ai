/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockGet = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockGet }),
}));

// Mock next-auth/react
const mockSignIn = jest.fn();
jest.mock('next-auth/react', () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
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

import LoginPage from '@/app/(auth)/login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it('renders login form with email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    render(<LoginPage />);
    const links = screen.getAllByRole('link');
    const registerLink = links.find((l) => l.getAttribute('href')?.includes('register'));
    expect(registerLink).toBeTruthy();
  });

  it('renders OAuth sign in buttons', () => {
    render(<LoginPage />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows error when credentials are invalid from URL param', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'error') return 'CredentialsSignin';
      return null;
    });
    render(<LoginPage />);
    expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('handles credentials login submission', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: null });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      });
    });
  });

  it('shows error on failed credentials login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ error: 'CredentialsSignin' });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('redirects to callbackUrl on successful login', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation((key: string) => {
      if (key === 'callbackUrl') return '/dashboard';
      return null;
    });
    mockSignIn.mockResolvedValue({ error: null });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles sign in error gracefully', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue(new Error('Network error'));

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // The toggle button is inside the password field's parent
    const passwordContainer = passwordInput.closest('div.relative') || passwordInput.parentElement;
    const toggleButton = passwordContainer?.querySelector('button');

    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});
