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
  it('renders a style element within ThemeProvider', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeStyles />
      </ThemeProvider>
    );
    // ThemeStyles renders a <style> element with CSS variables
    const styleElement = container.querySelector('style');
    expect(styleElement).not.toBeNull();
  });

  it('includes theme CSS custom properties in style tag', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeStyles />
      </ThemeProvider>
    );
    const styleElement = container.querySelector('style');
    const cssText = styleElement?.textContent || '';
    // Should contain theme CSS custom properties
    expect(cssText).toContain('--theme-primary-from');
    expect(cssText).toContain('--theme-primary-to');
    expect(cssText).toContain('--theme-orb-1');
  });

  it('throws when used outside ThemeProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeStyles />)).toThrow();
    consoleSpy.mockRestore();
  });
});
