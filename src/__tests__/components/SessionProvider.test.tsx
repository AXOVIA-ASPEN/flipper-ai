/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock FirebaseAuthProvider since it depends on firebase/auth
jest.mock('@/components/providers/FirebaseAuthProvider', () => ({
  FirebaseAuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="firebase-auth-provider">{children}</div>
  ),
}));

import { SessionProvider } from '@/components/providers/SessionProvider';

describe('SessionProvider', () => {
  it('renders children within FirebaseAuthProvider', () => {
    render(
      <SessionProvider>
        <div data-testid="child">Hello</div>
      </SessionProvider>
    );
    expect(screen.getByTestId('firebase-auth-provider')).toBeInTheDocument();
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
