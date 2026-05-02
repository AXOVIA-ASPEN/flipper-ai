/**
 * @file src/components/ResaleContentEditor.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.1
 * @brief Editor for AI-generated resale titles and descriptions.
 *
 * @description
 * Renders a Generate button, platform selector (eBay / Mercari / Facebook /
 * OfferUp / Craigslist), AI/algorithmic toggle, and editable title +
 * description fields with live char/word count vs. the platform's limit.
 * Calls POST /api/listings/[id]/generate-resale-content to fetch content
 * and reports the final edited values back via the onSave callback so the
 * parent (typically the listing detail page) can post the result to the
 * posting queue. Story 14.8: migrated to canonical glassmorphism — `.fp-glass`
 * wrapper, `.fp-input` form fields, `.fp-btn-primary` for Generate/Save,
 * `.fp-alert-warn` warnings, `.fp-alert-danger` errors. Generation flow,
 * platform validation, char/word limits preserved verbatim.
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
    <div className="fp-glass p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
          Generate Resale Listing
        </h3>
        {source && (
          <span className="fp-badge fp-badge-purple text-xs">
            Source: {source === 'ai' ? 'AI' : 'Template'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm" style={{ color: '#e2e8f0' }}>
          Platform:
          <select
            value={platform}
            onChange={(e) => {
              const next = e.target.value;
              if (isPlatformKey(next)) setPlatform(next);
            }}
            className="fp-input ml-2 text-sm"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-2 text-sm" style={{ color: '#e2e8f0' }}>
          <input
            type="checkbox"
            checked={useLLM}
            onChange={(e) => setUseLLM(e.target.checked)}
            className="rounded"
            style={{ accentColor: '#7c3aed' }}
          />
          Use AI (uncheck for algorithmic template)
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="fp-btn-primary ml-auto"
        >
          {isGenerating ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {warnings.length > 0 && (
        <ul className="fp-alert-warn text-xs rounded p-2 list-disc list-inside" style={{ color: '#fcd34d' }}>
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {error && (
        <p className="fp-alert-danger text-xs rounded p-2" style={{ color: '#fca5a5' }}>
          {error}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="resale-title" className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
            Title
          </label>
          <span className="text-xs" style={{ color: titleOver ? '#fca5a5' : '#94a3b8' }}>
            {title.length} / {titleLimit} chars
          </span>
        </div>
        <input
          id="resale-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Generated title appears here"
          className="fp-input w-full"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="resale-description"
            className="text-sm font-medium"
            style={{ color: '#e2e8f0' }}
          >
            Description
          </label>
          <span className="text-xs" style={{ color: descriptionOver ? '#fca5a5' : '#94a3b8' }}>
            {countWords(description)} / {descriptionWordLimit} words
          </span>
        </div>
        <textarea
          id="resale-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder="Generated description appears here"
          className="fp-input w-full"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim() || !description.trim()}
          className="fp-btn-primary"
        >
          Save to Queue
        </button>
      </div>
    </div>
  );
}
