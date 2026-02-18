'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeSettings() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Theme Settings</h1>
        <p className="text-blue-200/70 mb-8">Choose a color theme for your dashboard</p>

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
                      className={`w-10 h-10 rounded-full bg-gradient-to-br from-${color} to-${themeOption.colors.orbColors[(i + 1) % 3]} shadow-lg`}
                      data-testid={`theme-${themeOption.id}-orb-${i}`}
                    />
                  ))}
                </div>

                {/* Theme name and description */}
                <h3 className="text-xl font-bold text-white mb-2">
                  {themeOption.name}
                </h3>
                <p className="text-sm text-blue-200/70 mb-4">
                  {themeOption.description}
                </p>

                {/* Gradient preview bars */}
                <div className="space-y-2">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r from-${themeOption.colors.primaryFrom} to-${themeOption.colors.primaryTo}`}
                  />
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r from-${themeOption.colors.secondaryFrom} to-${themeOption.colors.secondaryTo}`}
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
              <p className="text-sm text-blue-200/70 mb-2">Primary Gradient</p>
              <div className={`h-12 rounded-lg bg-gradient-to-r from-${theme.colors.primaryFrom} to-${theme.colors.primaryTo}`} />
            </div>
            <div>
              <p className="text-sm text-blue-200/70 mb-2">Secondary Gradient</p>
              <div className={`h-12 rounded-lg bg-gradient-to-r from-${theme.colors.secondaryFrom} to-${theme.colors.secondaryTo}`} />
            </div>
            <div>
              <p className="text-sm text-blue-200/70 mb-2">Accent Blue</p>
              <div className={`h-12 rounded-lg bg-gradient-to-r from-${theme.colors.accentBlue.from} to-${theme.colors.accentBlue.to}`} />
            </div>
            <div>
              <p className="text-sm text-blue-200/70 mb-2">Accent Green</p>
              <div className={`h-12 rounded-lg bg-gradient-to-r from-${theme.colors.accentGreen.from} to-${theme.colors.accentGreen.to}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
