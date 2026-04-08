/**
 * @file src/components/ResaleContentEditor.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Editor for AI-generated resale titles and descriptions.
 *
 * @description
 * Renders a Generate button, platform selector (eBay / Mercari / Facebook /
 * OfferUp / Craigslist), AI/algorithmic toggle, and editable title +
 * description fields with live char/word count vs. the platform's limit.
 * Calls POST /api/listings/[id]/generate-resale-content to fetch content
 * and reports the final edited values back via the onSave callback so the
 * parent (typically the listing detail page) can post the result to the
 * posting queue.
 */

'use client';

import { useState } from 'react';

interface ResaleContentEditorProps {
  listingId: string;
  initialPlatform?: string;
  initialTitle?: string;
  initialDescription?: string;
  onSave?: (title: string, description: string, platform: string) => void;
}

interface GenerateResponse {
  success: boolean;
  data?: {
    primary: { title: string; description: string; platform: string };
    titles: Array<{ title: string; platform: string; charCount: number }>;
    descriptions: Array<{ description: string; platform: string; wordCount: number }>;
    source: 'ai' | 'template';
    warnings: string[];
  };
  error?: { detail?: string; code?: string };
}

const PLATFORMS = ['ebay', 'mercari', 'facebook', 'offerup', 'craigslist'] as const;
type PlatformKey = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  ebay: 'eBay',
  mercari: 'Mercari',
  facebook: 'Facebook Marketplace',
  offerup: 'OfferUp',
  craigslist: 'Craigslist',
};

const TITLE_CHAR_LIMITS: Record<PlatformKey, number> = {
  ebay: 80,
  mercari: 40,
  facebook: 99,
  offerup: 70,
  craigslist: 80,
};

const DESCRIPTION_WORD_LIMITS: Record<PlatformKey, number> = {
  ebay: 500,
  mercari: 200,
  facebook: 250,
  offerup: 200,
  craigslist: 300,
};

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function isPlatformKey(value: string): value is PlatformKey {
  return (PLATFORMS as readonly string[]).includes(value);
}

export default function ResaleContentEditor({
  listingId,
  initialPlatform = 'ebay',
  initialTitle = '',
  initialDescription = '',
  onSave,
}: ResaleContentEditorProps) {
  const initialPlatformKey: PlatformKey = isPlatformKey(initialPlatform)
    ? initialPlatform
    : 'ebay';

  const [platform, setPlatform] = useState<PlatformKey>(initialPlatformKey);
  const [useLLM, setUseLLM] = useState(true);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [source, setSource] = useState<'ai' | 'template' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleLimit = TITLE_CHAR_LIMITS[platform];
  const descriptionWordLimit = DESCRIPTION_WORD_LIMITS[platform];
  const titleOver = title.length > titleLimit;
  const descriptionOver = countWords(description) > descriptionWordLimit;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/listings/${listingId}/generate-resale-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, useLLM }),
      });
      const json: GenerateResponse = await response.json();
      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error?.detail || 'Failed to generate resale content');
      }
      // For platform="all" we'd get many; we asked for a specific platform so
      // pick the matching entry (or fall back to primary).
      const matchingTitle =
        json.data.titles.find((t) => t.platform === platform) ??
        json.data.titles[0];
      const matchingDescription =
        json.data.descriptions.find((d) => d.platform === platform) ??
        json.data.descriptions[0];

      setTitle(matchingTitle?.title ?? json.data.primary.title);
      setDescription(matchingDescription?.description ?? json.data.primary.description);
      setWarnings(json.data.warnings ?? []);
      setSource(json.data.source);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate resale content';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSave() {
    if (onSave) {
      onSave(title, description, platform);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Generate Resale Listing
        </h3>
        {source && (
          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
            Source: {source === 'ai' ? 'AI' : 'Template'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-700 dark:text-gray-200">
          Platform:
          <select
            value={platform}
            onChange={(e) => {
              const next = e.target.value;
              if (isPlatformKey(next)) setPlatform(next);
            }}
            className="ml-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={useLLM}
            onChange={(e) => setUseLLM(e.target.checked)}
            className="rounded border-gray-300"
          />
          Use AI (uncheck for algorithmic template)
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="ml-auto rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {isGenerating ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {warnings.length > 0 && (
        <ul className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded p-2 list-disc list-inside">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
          {error}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="resale-title" className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Title
          </label>
          <span
            className={`text-xs ${titleOver ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {title.length} / {titleLimit} chars
          </span>
        </div>
        <input
          id="resale-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Generated title appears here"
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="resale-description"
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Description
          </label>
          <span
            className={`text-xs ${descriptionOver ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {countWords(description)} / {descriptionWordLimit} words
          </span>
        </div>
        <textarea
          id="resale-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder="Generated description appears here"
          className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim() || !description.trim()}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Save to Queue
        </button>
      </div>
    </div>
  );
}
