'use client';

import React, { useState } from 'react';
import { useTheme, PRESET_THEMES, Theme } from '@/contexts/ThemeContext';

export default function ThemeSettings() {
  const { theme, applyPreset, customizeColor, resetToDefault, exportTheme, importTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const handleImport = () => {
    try {
      importTheme(importText);
      setImportText('');
      setImportError('');
    } catch (e) {
      setImportError('Invalid theme JSON');
    }
  };

  const handleExport = () => {
    const json = exportTheme();
    navigator.clipboard.writeText(json);
    alert('Theme JSON copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Theme Settings</h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('presets')}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === 'presets'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Preset Themes
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === 'custom'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Custom Colors
        </button>
      </div>

      {/* Preset Themes */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(PRESET_THEMES).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key as keyof typeof PRESET_THEMES)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  theme.name === preset.name
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: preset.secondary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
                <p className="font-medium text-left">{preset.name}</p>
              </button>
            ))}
          </div>

          <button
            onClick={resetToDefault}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Reset to Default
          </button>
        </div>
      )}

      {/* Custom Colors */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(theme) as Array<keyof Theme>)
              .filter((key) => key !== 'name')
              .map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-32 text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </label>
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => customizeColor(key, e.target.value)}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme[key]}
                    onChange={(e) => customizeColor(key, e.target.value)}
                    className="flex-1 px-3 py-2 border rounded font-mono text-sm"
                    placeholder="#000000"
                  />
                </div>
              ))}
          </div>

          {/* Import/Export */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold mb-3">Import/Export Theme</h3>
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Export Theme
              </button>
            </div>
            <div className="space-y-2">
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError('');
                }}
                placeholder="Paste theme JSON here to import..."
                className="w-full px-3 py-2 border rounded font-mono text-sm h-32"
              />
              {importError && (
                <p className="text-red-500 text-sm">{importError}</p>
              )}
              <button
                onClick={handleImport}
                disabled={!importText}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="mt-8 p-6 rounded-lg border-2" style={{ 
        backgroundColor: theme.surface,
        borderColor: theme.border,
        color: theme.text 
      }}>
        <h3 className="text-lg font-bold mb-2">Theme Preview</h3>
        <p className="mb-4" style={{ color: theme.textSecondary }}>
          This is how your theme looks in action.
        </p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded font-medium"
            style={{ backgroundColor: theme.primary, color: '#fff' }}
          >
            Primary Button
          </button>
          <button
            className="px-4 py-2 rounded font-medium"
            style={{ backgroundColor: theme.secondary, color: '#fff' }}
          >
            Secondary Button
          </button>
          <button
            className="px-4 py-2 rounded font-medium"
            style={{ backgroundColor: theme.accent, color: '#fff' }}
          >
            Accent Button
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <span
            className="px-3 py-1 rounded text-sm font-medium"
            style={{ backgroundColor: theme.success, color: '#fff' }}
          >
            Success
          </span>
          <span
            className="px-3 py-1 rounded text-sm font-medium"
            style={{ backgroundColor: theme.warning, color: '#fff' }}
          >
            Warning
          </span>
          <span
            className="px-3 py-1 rounded text-sm font-medium"
            style={{ backgroundColor: theme.error, color: '#fff' }}
          >
            Error
          </span>
        </div>
      </div>
    </div>
  );
}
