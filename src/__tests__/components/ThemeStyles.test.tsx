/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeStyles } from '@/components/ThemeStyles';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

describe('ThemeStyles', () => {
  it('renders without crashing within ThemeProvider', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeStyles />
      </ThemeProvider>
    );
    // ThemeStyles returns null, it applies CSS variables via useEffect
    expect(container.firstChild).toBeNull();
  });

  it('applies CSS custom properties to document root', () => {
    render(
      <ThemeProvider>
        <ThemeStyles />
      </ThemeProvider>
    );
    const root = document.documentElement;
    // Should have applied CSS custom properties
    expect(root.style.getPropertyValue('--color-primary')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-background')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-text')).toBeTruthy();
  });

  it('throws when used outside ThemeProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeStyles />)).toThrow();
    consoleSpy.mockRestore();
  });
});
