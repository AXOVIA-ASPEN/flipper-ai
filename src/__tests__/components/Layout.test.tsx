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
jest.mock('@/components/providers/SessionProvider', () => ({
  SessionProvider: function MockSessionProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="session-provider">{children}</div>;
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

  it('includes session and theme providers', () => {
    const { container } = render(
      <RootLayout>
        <span>Test</span>
      </RootLayout>,
      { container: document.createElement('div') }
    );
    expect(container.querySelector("[data-testid='session-provider']")).toBeTruthy();
    expect(container.querySelector("[data-testid='theme-provider']")).toBeTruthy();
  });
});
