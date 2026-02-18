'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect } from 'react';

export function ThemeStyles() {
  const { theme } = useTheme();

  useEffect(() => {
    // Apply theme CSS variables to :root
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-background', theme.background);
    root.style.setProperty('--color-surface', theme.surface);
    root.style.setProperty('--color-text', theme.text);
    root.style.setProperty('--color-text-secondary', theme.textSecondary);
    root.style.setProperty('--color-border', theme.border);
    root.style.setProperty('--color-success', theme.success);
    root.style.setProperty('--color-warning', theme.warning);
    root.style.setProperty('--color-error', theme.error);

    // Apply background color to body
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  }, [theme]);

  return null; // This component doesn't render anything
}
