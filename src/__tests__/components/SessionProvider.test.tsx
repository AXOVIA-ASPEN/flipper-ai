/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionProvider } from '@/components/providers/SessionProvider';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="next-auth-provider">{children}</div>
  ),
}));

describe('SessionProvider', () => {
  it('renders children within NextAuth SessionProvider', () => {
    render(
      <SessionProvider>
        <div data-testid="child">Hello</div>
      </SessionProvider>
    );
    expect(screen.getByTestId('next-auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('wraps multiple children', () => {
    render(
      <SessionProvider>
        <span>One</span>
        <span>Two</span>
      </SessionProvider>
    );
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });
});
