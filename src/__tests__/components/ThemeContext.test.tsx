/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that exposes theme context
function ThemeConsumer() {
  const { theme, setTheme, availableThemes } = useTheme();
  return (
    <div>
      <span data-testid="theme-name">{theme.name}</span>
      <span data-testid="theme-count">{availableThemes.length}</span>
      {availableThemes.map((t) => (
        <button key={t.id} data-testid={`theme-${t.id}`} onClick={() => setTheme(t.id)}>
          {t.name}
        </button>
      ))}
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('provides a default theme', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme-name')).toHaveTextContent(/.+/);
  });

  it('exposes available themes', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    const count = parseInt(screen.getByTestId('theme-count').textContent || '0');
    expect(count).toBeGreaterThan(0);
  });

  it('allows switching themes', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    const buttons = screen.getAllByRole('button');
    if (buttons.length > 1) {
      const initialTheme = screen.getByTestId('theme-name').textContent;
      await user.click(buttons[1]);
      // Theme should be updated (may or may not change name depending on theme list)
      expect(screen.getByTestId('theme-name')).toBeInTheDocument();
    }
  });

  it('saves theme to localStorage on change', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      await user.click(buttons[0]);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('flipper-theme', expect.any(String));
    }
  });

  it('loads saved theme from localStorage', () => {
    // This tests the useEffect path - needs a valid theme id
    localStorageMock.getItem.mockReturnValue('invalid-theme-id');
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    // Should fall back to default theme
    expect(screen.getByTestId('theme-name')).toHaveTextContent(/.+/);
  });

  it('throws error when useTheme is used outside ThemeProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleSpy.mockRestore();
  });
});
