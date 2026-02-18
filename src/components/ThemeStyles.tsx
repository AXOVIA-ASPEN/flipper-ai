'use client';

import { useTheme } from '@/contexts/ThemeContext';

/**
 * Component that injects dynamic CSS variables based on the current theme
 * This allows us to use theme colors with Tailwind's arbitrary value syntax
 */
export function ThemeStyles() {
  const { theme } = useTheme();
  const { colors } = theme;

  // Map Tailwind color names to actual hex values
  const colorMap: Record<string, string> = {
    // Purple shades
    'purple-400': '#c084fc',
    'purple-500': '#a855f7',
    'purple-600': '#9333ea',
    'purple-700': '#7e22ce',

    // Pink shades
    'pink-400': '#f472b6',
    'pink-500': '#ec4899',
    'pink-600': '#db2777',
    'pink-700': '#be185d',

    // Blue shades
    'blue-400': '#60a5fa',
    'blue-500': '#3b82f6',
    'blue-600': '#2563eb',
    'blue-700': '#1d4ed8',

    // Cyan shades
    'cyan-400': '#22d3ee',
    'cyan-500': '#06b6d4',
    'cyan-600': '#0891b2',

    // Teal shades
    'teal-400': '#2dd4bf',
    'teal-500': '#14b8a6',
    'teal-600': '#0d9488',

    // Green shades
    'green-400': '#4ade80',
    'green-500': '#22c55e',
    'green-600': '#16a34a',

    // Emerald shades
    'emerald-400': '#34d399',
    'emerald-600': '#059669',

    // Lime shades
    'lime-400': '#a3e635',
    'lime-500': '#84cc16',

    // Yellow shades
    'yellow-400': '#facc15',
    'yellow-500': '#eab308',

    // Orange shades
    'orange-400': '#fb923c',
    'orange-500': '#f97316',
    'orange-600': '#ea580c',

    // Red shades
    'red-500': '#ef4444',
    'red-600': '#dc2626',

    // Indigo shades
    'indigo-400': '#818cf8',
    'indigo-500': '#6366f1',
    'indigo-600': '#4f46e5',
    'indigo-700': '#4338ca',

    // Violet shades
    'violet-400': '#a78bfa',
    'violet-500': '#8b5cf6',

    // Fuchsia shades
    'fuchsia-400': '#e879f9',
    'fuchsia-500': '#d946ef',
    'fuchsia-600': '#c026d3',

    // Rose shades
    'rose-500': '#f43f5e',
    'rose-600': '#e11d48',

    // Sky shades
    'sky-400': '#38bdf8',
  };

  const getColor = (colorName: string): string => {
    return colorMap[colorName] || '#a855f7'; // fallback to purple-500
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
      }
    `}</style>
  );
}
