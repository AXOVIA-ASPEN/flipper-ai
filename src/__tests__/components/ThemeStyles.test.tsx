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
    // ThemeStyles injects a <style> tag with CSS variables
    const styleTag = container.querySelector('style');
    expect(styleTag).toBeInTheDocument();
  });

  it('injects CSS custom properties', () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeStyles />
      </ThemeProvider>
    );
    const styleTag = container.querySelector('style');
    if (styleTag) {
      const cssText = styleTag.textContent || '';
      // Should contain CSS custom property definitions
      expect(cssText).toContain('--');
    }
  });

  it('throws when used outside ThemeProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeStyles />)).toThrow();
    consoleSpy.mockRestore();
  });
});
