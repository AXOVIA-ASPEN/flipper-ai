/**
 * @file src/__tests__/epic-14-final-violation-audit.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Final-gate epic-wide rg palette + light-mode audits, in-process (Story 14.10 AC #8).
 *
 * @description
 * Walks every *.{tsx,ts} file under `app/**` and `src/components/**` (with
 * the canonical exclusions for tests, .next, node_modules), reads each line,
 * scopes the regex to className= substrings per Story 14.8/14.9 precedent,
 * and asserts that the palette regex (`(bg|text|border|from|to|via|ring)-
 * (blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|
 * yellow|red|orange)-[0-9]+`) matches zero times AND the light-mode regex
 * (`bg-(white|gray-[0-9])`) matches zero times. Implemented in-process
 * (NOT shelling out to `rg`) so Windows CI runners pass without ripgrep on
 * PATH. Per-file failures reported with line numbers.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AUDIT_GLOB_PATTERNS = ['app/**/*.{tsx,ts}', 'src/components/**/*.{tsx,ts}'];
const EXCLUDED_GLOBS = [
  'src/__tests__/**',
  '**/*.test.tsx',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/.next/**',
  '**/node_modules/**',
];

// Story 14.10 review remediation: expanded to include `accent-` (slider tint
// utility) so raw Tailwind palette is fully banned per FR-UI-DESIGN-02 spirit,
// not just structural background/border/text utilities.
const PALETTE_REGEX =
  /(bg|text|border|from|to|via|ring|accent)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|yellow|red|orange)-[0-9]+/g;

const LIGHT_MODE_REGEX = /bg-(white|gray-[0-9])/g;

interface AuditMatch {
  file: string;
  line: number;
  text: string;
}

async function gatherFiles(): Promise<string[]> {
  const groups = await Promise.all(
    AUDIT_GLOB_PATTERNS.map((p) =>
      glob(p, { cwd: REPO_ROOT, ignore: EXCLUDED_GLOBS, absolute: false })
    )
  );
  return groups.flat().sort();
}

function runAudit(files: string[], regex: RegExp): AuditMatch[] {
  const matches: AuditMatch[] = [];
  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    const lines = fs.readFileSync(abs, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      if (!line.includes('className=')) return;
      const localRegex = new RegExp(regex.source, 'g');
      const found = line.match(localRegex);
      if (found && found.length > 0) {
        matches.push({ file: rel, line: idx + 1, text: line.trim().slice(0, 200) });
      }
    });
  }
  return matches;
}

describe('Epic 14 final-gate violation audit (Story 14.10 AC #8)', () => {
  // The file walk + regex scan is bounded but can run several seconds on a
  // cold filesystem. Per the story, allow up to 30s for the cold case.
  jest.setTimeout(30000);

  let files: string[] = [];

  beforeAll(async () => {
    files = await gatherFiles();
    expect(files.length).toBeGreaterThan(0);
  });

  test('palette violations: rg-equivalent in-process audit returns zero', () => {
    const matches = runAudit(files, PALETTE_REGEX);
    if (matches.length > 0) {
      throw new Error(
        `${matches.length} palette violation(s) found:\n${matches
          .map((m) => `  ${m.file}:${m.line} → ${m.text}`)
          .join('\n')}`
      );
    }
  });

  test('light-mode violations: rg-equivalent in-process audit returns zero', () => {
    const matches = runAudit(files, LIGHT_MODE_REGEX);
    if (matches.length > 0) {
      throw new Error(
        `${matches.length} light-mode violation(s) found:\n${matches
          .map((m) => `  ${m.file}:${m.line} → ${m.text}`)
          .join('\n')}`
      );
    }
  });
});
