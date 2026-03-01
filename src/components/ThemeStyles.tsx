'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { colorMap } from '@/lib/theme-config';

/**
 * Component that injects dynamic CSS variables based on the current theme.
 * This allows us to use theme colors with CSS custom properties.
 */
export function ThemeStyles() {
  const { theme } = useTheme();
  const { colors } = theme;

  const getColor = (colorName: string): string => {
    // Handle opacity suffixes like 'blue-200/70' → just use the base color
    const base = colorName.split('/')[0];
    return colorMap[base] || '#a855f7'; // fallback to purple-500
  };

  // Compute a muted text color with opacity from the textMuted field (e.g. 'blue-200/70')
  const getMutedColor = (colorName: string): string => {
    const parts = colorName.split('/');
    const hex = colorMap[parts[0]] || '#bfdbfe';
    const opacity = parts[1] ? parseInt(parts[1]) / 100 : 0.7;
    // Convert hex to rgba
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Compute shadow color with opacity from e.g. 'purple-500/50'
  const getShadowColor = (colorName: string): string => {
    const parts = colorName.split('/');
    const hex = colorMap[parts[0]] || '#a855f7';
    const opacity = parts[1] ? parseInt(parts[1]) / 100 : 0.3;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <style jsx global>{`
      :root {
        --theme-primary-from: ${getColor(colors.primaryFrom)};
        --theme-primary-to: ${getColor(colors.primaryTo)};
        --theme-secondary-from: ${getColor(colors.secondaryFrom)};
        --theme-secondary-to: ${getColor(colors.secondaryTo)};
        --theme-accent-blue-from: ${getColor(colors.accentBlue.from)};
        --theme-accent-blue-to: ${getColor(colors.accentBlue.to)};
        --theme-accent-green-from: ${getColor(colors.accentGreen.from)};
        --theme-accent-green-to: ${getColor(colors.accentGreen.to)};
        --theme-accent-orange-from: ${getColor(colors.accentOrange.from)};
        --theme-accent-orange-to: ${getColor(colors.accentOrange.to)};
        --theme-accent-purple-from: ${getColor(colors.accentPurple.from)};
        --theme-accent-purple-to: ${getColor(colors.accentPurple.to)};
        --theme-orb-1: ${getColor(colors.orbColors[0])};
        --theme-orb-2: ${getColor(colors.orbColors[1])};
        --theme-orb-3: ${getColor(colors.orbColors[2])};
        --theme-page-bg-from: ${getColor(colors.pageBg[0])};
        --theme-page-bg-via: ${getColor(colors.pageBg[1])};
        --theme-page-bg-to: ${getColor(colors.pageBg[2])};
        --theme-text-accent: ${getColor(colors.primaryFrom)};
        --theme-text-muted: ${getMutedColor(colors.textMuted)};
        --theme-text-gradient-from: ${getColor(colors.textGradient.from)};
        --theme-text-gradient-via: ${getColor(colors.textGradient.via)};
        --theme-text-gradient-to: ${getColor(colors.textGradient.to)};
        --theme-nav-active-bg: ${getColor(colors.navActive.bg)};
        --theme-nav-active-text: ${getColor(colors.navActive.text)};
        --theme-focus-ring: ${getShadowColor(colors.primaryFrom + '/50')};
        --theme-button-shadow: ${getShadowColor(colors.primaryShadow)};
      }
    `}</style>
  );
}
