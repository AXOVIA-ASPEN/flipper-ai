/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';

// Mock CSS import
jest.mock('@/app/globals.css', () => ({}), { virtual: true });

// Mock next/font
jest.mock('next/font/google', () => ({
  Geist: () => ({ className: 'mock-geist', variable: '--font-geist' }),
  Geist_Mono: () => ({ className: 'mock-geist-mono', variable: '--font-geist-mono' }),
}));

// Mock providers
jest.mock('@/components/providers/FirebaseAuthProvider', () => ({
  FirebaseAuthProvider: function MockFirebaseAuthProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="firebase-auth-provider">{children}</div>;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock('@/components/ThemeStyles', () => ({
  ThemeStyles: () => <div data-testid="theme-styles" />,
}));

jest.mock('@/components/WebVitals', () => ({
  WebVitals: () => null,
}));

jest.mock('@/components/Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="navigation" />;
  };
});

jest.mock('@/components/ToastContainer', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toast-provider">{children}</div>
  ),
}));

jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}));

import RootLayout from '@/app/layout';

describe('RootLayout', () => {
  it('renders children within providers', () => {
    const { container } = render(
      <RootLayout>
        <div data-testid="child-content">Hello</div>
      </RootLayout>,
      { container: document.createElement('div') }
    );
    expect(container.querySelector("[data-testid='child-content']")).toBeTruthy();
  });

  it('includes Firebase auth and theme providers', () => {
    const { container } = render(
      <RootLayout>
        <span>Test</span>
      </RootLayout>,
      { container: document.createElement('div') }
    );
    expect(container.querySelector("[data-testid='firebase-auth-provider']")).toBeTruthy();
    expect(container.querySelector("[data-testid='theme-provider']")).toBeTruthy();
  });
});
