/**
 * Theme Configuration System
 * Defines color themes for the application
 */

export interface ThemeColors {
  // Primary gradient colors
  primaryFrom: string;
  primaryTo: string;
  primaryShadow: string;

  // Secondary gradient colors
  secondaryFrom: string;
  secondaryTo: string;
  secondaryShadow: string;

  // Accent colors for stats cards
  accentBlue: { from: string; to: string; shadow: string };
  accentGreen: { from: string; to: string; shadow: string };
  accentOrange: { from: string; to: string; shadow: string };
  accentPurple: { from: string; to: string; shadow: string };

  // Background gradient orbs
  orbColors: [string, string, string];

  // Page background gradient (from, via, to)
  pageBg: [string, string, string];

  // Navigation active link colors
  navActive: { bg: string; text: string };

  // Text colors
  textGradient: { from: string; via: string; to: string };
  textMuted: string;
}

/**
 * Map Tailwind color names to actual hex values.
 * Shared between ThemeStyles (CSS variable injection) and ThemeSettings (inline styles).
 */
export const colorMap: Record<string, string> = {
  // Slate shades
  'slate-900': '#0f172a',
  'slate-800': '#1e293b',

  // Purple shades
  'purple-400': '#c084fc',
  'purple-500': '#a855f7',
  'purple-600': '#9333ea',
  'purple-700': '#7e22ce',
  'purple-900': '#581c87',

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
  'blue-900': '#1e3a5f',

  // Cyan shades
  'cyan-400': '#22d3ee',
  'cyan-500': '#06b6d4',
  'cyan-600': '#0891b2',
  'cyan-900': '#164e63',

  // Teal shades
  'teal-400': '#2dd4bf',
  'teal-500': '#14b8a6',
  'teal-600': '#0d9488',
  'teal-900': '#134e4a',

  // Green shades
  'green-400': '#4ade80',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'green-900': '#14532d',

  // Emerald shades
  'emerald-400': '#34d399',
  'emerald-500': '#10b981',
  'emerald-600': '#059669',
  'emerald-900': '#064e3b',

  // Lime shades
  'lime-400': '#a3e635',
  'lime-500': '#84cc16',

  // Yellow shades
  'yellow-400': '#facc15',
  'yellow-500': '#eab308',
  'yellow-900': '#713f12',

  // Orange shades
  'orange-400': '#fb923c',
  'orange-500': '#f97316',
  'orange-600': '#ea580c',
  'orange-900': '#7c2d12',

  // Red shades
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'red-900': '#7f1d1d',

  // Indigo shades
  'indigo-400': '#818cf8',
  'indigo-500': '#6366f1',
  'indigo-600': '#4f46e5',
  'indigo-700': '#4338ca',
  'indigo-900': '#312e81',

  // Violet shades
  'violet-400': '#a78bfa',
  'violet-500': '#8b5cf6',
  'violet-900': '#4c1d95',

  // Fuchsia shades
  'fuchsia-400': '#e879f9',
  'fuchsia-500': '#d946ef',
  'fuchsia-600': '#c026d3',

  // Rose shades
  'rose-500': '#f43f5e',
  'rose-600': '#e11d48',
  'rose-900': '#881337',

  // Sky shades
  'sky-400': '#38bdf8',
};

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

export const themes: Record<string, Theme> = {
  purple: {
    id: 'purple',
    name: 'Purple Dream',
    description: 'Default purple and pink gradient theme',
    colors: {
      primaryFrom: 'purple-500',
      primaryTo: 'pink-600',
      primaryShadow: 'purple-500/50',
      secondaryFrom: 'blue-500',
      secondaryTo: 'purple-600',
      secondaryShadow: 'blue-500/50',
      accentBlue: { from: 'blue-400', to: 'blue-600', shadow: 'blue-500/50' },
      accentGreen: { from: 'green-400', to: 'emerald-600', shadow: 'green-500/50' },
      accentOrange: { from: 'yellow-400', to: 'orange-600', shadow: 'orange-500/50' },
      accentPurple: { from: 'purple-400', to: 'purple-600', shadow: 'purple-500/50' },
      orbColors: ['purple-500', 'blue-500', 'pink-500'],
      pageBg: ['slate-900', 'purple-900', 'slate-900'],
      navActive: { bg: 'purple-500', text: 'purple-600' },
      textGradient: { from: 'purple-200', via: 'pink-200', to: 'blue-200' },
      textMuted: 'blue-200/70',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Breeze',
    description: 'Cool blue and teal gradient theme',
    colors: {
      primaryFrom: 'cyan-500',
      primaryTo: 'blue-600',
      primaryShadow: 'cyan-500/50',
      secondaryFrom: 'teal-500',
      secondaryTo: 'cyan-600',
      secondaryShadow: 'teal-500/50',
      accentBlue: { from: 'cyan-400', to: 'blue-600', shadow: 'cyan-500/50' },
      accentGreen: { from: 'teal-400', to: 'emerald-600', shadow: 'teal-500/50' },
      accentOrange: { from: 'sky-400', to: 'blue-600', shadow: 'sky-500/50' },
      accentPurple: { from: 'indigo-400', to: 'blue-600', shadow: 'indigo-500/50' },
      orbColors: ['cyan-500', 'blue-500', 'teal-500'],
      pageBg: ['slate-900', 'cyan-900', 'slate-900'],
      navActive: { bg: 'cyan-500', text: 'cyan-600' },
      textGradient: { from: 'cyan-200', via: 'blue-200', to: 'teal-200' },
      textMuted: 'cyan-200/70',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Warm orange and red gradient theme',
    colors: {
      primaryFrom: 'orange-500',
      primaryTo: 'red-600',
      primaryShadow: 'orange-500/50',
      secondaryFrom: 'yellow-500',
      secondaryTo: 'orange-600',
      secondaryShadow: 'yellow-500/50',
      accentBlue: { from: 'orange-400', to: 'red-600', shadow: 'orange-500/50' },
      accentGreen: { from: 'lime-400', to: 'green-600', shadow: 'lime-500/50' },
      accentOrange: { from: 'yellow-400', to: 'orange-600', shadow: 'yellow-500/50' },
      accentPurple: { from: 'pink-400', to: 'red-600', shadow: 'pink-500/50' },
      orbColors: ['orange-500', 'red-500', 'yellow-500'],
      pageBg: ['slate-900', 'orange-900', 'slate-900'],
      navActive: { bg: 'orange-500', text: 'orange-600' },
      textGradient: { from: 'orange-200', via: 'red-200', to: 'yellow-200' },
      textMuted: 'orange-200/70',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural green and emerald gradient theme',
    colors: {
      primaryFrom: 'green-500',
      primaryTo: 'emerald-600',
      primaryShadow: 'green-500/50',
      secondaryFrom: 'lime-500',
      secondaryTo: 'green-600',
      secondaryShadow: 'lime-500/50',
      accentBlue: { from: 'teal-400', to: 'cyan-600', shadow: 'teal-500/50' },
      accentGreen: { from: 'green-400', to: 'emerald-600', shadow: 'green-500/50' },
      accentOrange: { from: 'lime-400', to: 'green-600', shadow: 'lime-500/50' },
      accentPurple: { from: 'emerald-400', to: 'teal-600', shadow: 'emerald-500/50' },
      orbColors: ['green-500', 'emerald-500', 'lime-500'],
      pageBg: ['slate-900', 'emerald-900', 'slate-900'],
      navActive: { bg: 'green-500', text: 'green-600' },
      textGradient: { from: 'green-200', via: 'emerald-200', to: 'lime-200' },
      textMuted: 'green-200/70',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blue and indigo gradient theme',
    colors: {
      primaryFrom: 'indigo-500',
      primaryTo: 'blue-700',
      primaryShadow: 'indigo-500/50',
      secondaryFrom: 'blue-600',
      secondaryTo: 'indigo-700',
      secondaryShadow: 'blue-600/50',
      accentBlue: { from: 'blue-400', to: 'indigo-600', shadow: 'blue-500/50' },
      accentGreen: { from: 'cyan-400', to: 'blue-600', shadow: 'cyan-500/50' },
      accentOrange: { from: 'violet-400', to: 'indigo-600', shadow: 'violet-500/50' },
      accentPurple: { from: 'indigo-400', to: 'purple-600', shadow: 'indigo-500/50' },
      orbColors: ['indigo-500', 'blue-600', 'violet-500'],
      pageBg: ['slate-900', 'indigo-900', 'slate-900'],
      navActive: { bg: 'indigo-500', text: 'indigo-600' },
      textGradient: { from: 'indigo-200', via: 'blue-200', to: 'violet-200' },
      textMuted: 'indigo-200/70',
    },
  },
  rose: {
    id: 'rose',
    name: 'Rose Garden',
    description: 'Elegant pink and rose gradient theme',
    colors: {
      primaryFrom: 'pink-500',
      primaryTo: 'rose-600',
      primaryShadow: 'pink-500/50',
      secondaryFrom: 'fuchsia-500',
      secondaryTo: 'pink-600',
      secondaryShadow: 'fuchsia-500/50',
      accentBlue: { from: 'pink-400', to: 'rose-600', shadow: 'pink-500/50' },
      accentGreen: { from: 'emerald-400', to: 'green-600', shadow: 'emerald-500/50' },
      accentOrange: { from: 'orange-400', to: 'pink-600', shadow: 'orange-500/50' },
      accentPurple: { from: 'fuchsia-400', to: 'purple-600', shadow: 'fuchsia-500/50' },
      orbColors: ['pink-500', 'rose-500', 'fuchsia-500'],
      pageBg: ['slate-900', 'rose-900', 'slate-900'],
      navActive: { bg: 'pink-500', text: 'pink-600' },
      textGradient: { from: 'pink-200', via: 'rose-200', to: 'fuchsia-200' },
      textMuted: 'pink-200/70',
    },
  },
};

export const defaultTheme = themes.purple;
