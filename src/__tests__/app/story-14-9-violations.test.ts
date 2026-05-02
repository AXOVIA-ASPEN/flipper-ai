/**
 * @file src/__tests__/app/story-14-9-violations.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Per-file palette+light-mode regex regression scan for Story 14.9 (AC #2(h), #3(a-b), #6(f), #8(h-i)).
 *
 * @description
 * Reads each Story 14.9 target file, restricts the scan to className= attribute scopes per
 * Story 14.8's precedent (avoids false positives on test fixtures, comments, and string
 * literals that aren't classNames), and asserts:
 *   - palette regex `/(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|
 *       pink|rose|emerald|amber|yellow|red|orange|green)-\d+/` matches **zero** times
 *   - light-mode regex `/bg-(white|gray-\d+)/` matches **zero** times
 *
 * Pre-mortem P-4 guard: ALSO asserts the scraper file contains the literal canonical inline-
 * gradient strings — protects against a Tailwind arbitrary-value fallback that JIT might miss.
 */

import * as fs from 'fs';
import * as path from 'path';

const FILES = [
  'app/analytics/page.tsx',
  'app/scraper/page.tsx',
  'app/health/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
];

const PALETTE_RE = /(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|pink|rose|emerald|amber|yellow|red|orange|green)-\d+/;
const LIGHTMODE_RE = /bg-(white|gray-\d+)/;
const CLASSNAME_RE = /className=(?:\{`[^`]*`\}|\{["'][^"']*["']\}|"[^"]*"|'[^']*')/g;

function scanClassNamesOf(source: string): string[] {
  const matches = source.match(CLASSNAME_RE) || [];
  return matches;
}

describe('Story 14.9 — file-level palette+light-mode regression scan (AC #2/3/6/8/11)', () => {
  test.each(FILES)('%s has zero palette violations within className= scopes', (rel) => {
    const abs = path.resolve(__dirname, '../../../', rel);
    const src = fs.readFileSync(abs, 'utf-8');
    const classes = scanClassNamesOf(src).join('\n');
    const offending = classes.match(new RegExp(PALETTE_RE.source, 'g'));
    if (offending) {
      // Surface the offending strings to make debugging trivial
      throw new Error(`${rel}: palette violations found: ${offending.join(', ')}`);
    }
    expect(offending).toBeNull();
  });

  test.each(FILES)('%s has zero light-mode violations within className= scopes', (rel) => {
    const abs = path.resolve(__dirname, '../../../', rel);
    const src = fs.readFileSync(abs, 'utf-8');
    const classes = scanClassNamesOf(src).join('\n');
    const offending = classes.match(new RegExp(LIGHTMODE_RE.source, 'g'));
    if (offending) {
      throw new Error(`${rel}: light-mode violations found: ${offending.join(', ')}`);
    }
    expect(offending).toBeNull();
  });

  it('scraper page contains canonical inline purple progress-bar gradient (pre-mortem P-4)', () => {
    const abs = path.resolve(__dirname, '../../../', 'app/scraper/page.tsx');
    const src = fs.readFileSync(abs, 'utf-8');
    expect(src).toContain('linear-gradient(90deg, #7c3aed, #a78bfa)');
  });

  it('scraper page contains canonical inline red progress-bar gradient (failed state)', () => {
    const abs = path.resolve(__dirname, '../../../', 'app/scraper/page.tsx');
    const src = fs.readFileSync(abs, 'utf-8');
    expect(src).toContain('linear-gradient(90deg, #f87171, #fca5a5)');
  });

  it('scraper page preserves all 6 data-testid="scrape-progress-*" attributes (ADR-14.9-E)', () => {
    const abs = path.resolve(__dirname, '../../../', 'app/scraper/page.tsx');
    const src = fs.readFileSync(abs, 'utf-8');
    const required = [
      'data-testid="scrape-progress-indicator"',
      'data-testid="scrape-progress-bar"',
      'data-testid="scrape-progress-percentage"',
      'data-testid="scrape-progress-platform"',
      'data-testid="scrape-progress-error"',
      'data-testid="scrape-progress-listings"',
    ];
    required.forEach((attr) => {
      expect(src).toContain(attr);
    });
  });

  it('privacy and terms pages have one fewer <hr.fp-divider> than <section> blocks (ADR-14.9-B / pre-mortem P-5)', () => {
    (['app/privacy/page.tsx', 'app/terms/page.tsx'] as const).forEach((rel) => {
      const abs = path.resolve(__dirname, '../../../', rel);
      const src = fs.readFileSync(abs, 'utf-8');
      // Count opening <section> tags anywhere in the file (handles indented and inline JSX
      // alike). Excludes <section …/> self-closing variants since the legal pages don't use
      // them; if a future migration introduces a self-close, update this assertion.
      const sectionMatches = src.match(/<section[\s>]/g) || [];
      const hrMatches = src.match(/<hr\s+className="fp-divider"\s*\/>/g) || [];
      expect(sectionMatches.length).toBeGreaterThan(0);
      expect(hrMatches.length).toBe(sectionMatches.length - 1);
    });
  });
});
