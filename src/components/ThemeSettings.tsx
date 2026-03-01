'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { colorMap } from '@/lib/theme-config';

export default function ThemeSettings() {
  const { theme, setTheme, availableThemes } = useTheme();

  const getHex = (name: string): string => {
    const base = name.split('/')[0];
    return colorMap[base] || '#a855f7';
  };

  return (
    <div className="min-h-screen bg-theme-page p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Theme Settings</h1>
        <p className="text-theme-muted mb-8">Choose a color theme for your dashboard</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableThemes.map((themeOption) => {
            const isActive = theme.id === themeOption.id;

            return (
              <button
                key={themeOption.id}
                onClick={() => setTheme(themeOption.id)}
                className={`relative group p-6 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-white/20 ring-2 ring-white shadow-2xl scale-105'
                    : 'bg-white/5 hover:bg-white/10 hover:scale-102'
                }`}
                data-testid={`theme-option-${themeOption.id}`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                )}

                {/* Theme preview circles */}
                <div className="flex gap-2 mb-4">
                  {themeOption.colors.orbColors.map((color, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full shadow-lg"
                      style={{
                        background: `linear-gradient(to bottom right, ${getHex(color)}, ${getHex(themeOption.colors.orbColors[(i + 1) % 3])})`,
                      }}
                      data-testid={`theme-${themeOption.id}-orb-${i}`}
                    />
                  ))}
                </div>

                {/* Theme name and description */}
                <h3 className="text-xl font-bold text-white mb-2">
                  {themeOption.name}
                </h3>
                <p className="text-sm text-theme-muted mb-4">
                  {themeOption.description}
                </p>

                {/* Gradient preview bars */}
                <div className="space-y-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${getHex(themeOption.colors.primaryFrom)}, ${getHex(themeOption.colors.primaryTo)})`,
                    }}
                  />
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${getHex(themeOption.colors.secondaryFrom)}, ${getHex(themeOption.colors.secondaryTo)})`,
                    }}
                  />
                </div>

                {/* Active label */}
                {isActive && (
                  <div className="mt-4 text-xs font-semibold text-green-400 uppercase tracking-wide">
                    Active Theme
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Current theme info */}
        <div className="mt-12 p-6 bg-white/10 rounded-xl backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-4">Current Theme: {theme.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-theme-muted mb-2">Primary Gradient</p>
              <div
                className="h-12 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${getHex(theme.colors.primaryFrom)}, ${getHex(theme.colors.primaryTo)})`,
                }}
              />
            </div>
            <div>
              <p className="text-sm text-theme-muted mb-2">Secondary Gradient</p>
              <div
                className="h-12 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${getHex(theme.colors.secondaryFrom)}, ${getHex(theme.colors.secondaryTo)})`,
                }}
              />
            </div>
            <div>
              <p className="text-sm text-theme-muted mb-2">Accent Blue</p>
              <div
                className="h-12 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${getHex(theme.colors.accentBlue.from)}, ${getHex(theme.colors.accentBlue.to)})`,
                }}
              />
            </div>
            <div>
              <p className="text-sm text-theme-muted mb-2">Accent Green</p>
              <div
                className="h-12 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${getHex(theme.colors.accentGreen.from)}, ${getHex(theme.colors.accentGreen.to)})`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
