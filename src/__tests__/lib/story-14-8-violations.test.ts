/**
 * @file src/__tests__/lib/story-14-8-violations.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-24
 * @version 1.0
 * @brief Per-PR CI gate that scans className strings for banned palette tokens.
 *
 * @description
 * Iterates the 16 components migrated in Story 14.8 and asserts that no
 * banned Tailwind palette utilities and no light-mode surface utilities
 * appear inside `className=` strings. Scoping the scan to className= avoids
 * false positives from comments, JSDoc, or non-className string literals.
 * Failure messages include file path, line number, and the offending match.
 *
 * Story 14.8 AC #17. Runs faster than the full acceptance suite and
 * surfaces regressions immediately. Additive to (not a replacement for)
 * the rg verification captured in Completion Notes.
 */

import fs from 'fs';
import path from 'path';

const STORY_14_8_FILES = [
  'src/components/NotificationSettings.tsx',
  'src/components/BillingSettings.tsx',
  'src/components/IntegrationsSettings.tsx',
  'src/components/MessagingSettings.tsx',
  'src/components/ScoringSettings.tsx',
  'src/components/LogisticsSettings.tsx',
  'src/components/UsageDisplay.tsx',
  'src/components/MeetingModal.tsx',
  'src/components/MeetingRouteCard.tsx',
  'src/components/ResaleContentEditor.tsx',
  'src/components/ApprovalQueue.tsx',
  'src/components/MessageApprovalCard.tsx',
  'src/components/UpgradePrompt.tsx',
  'src/components/posting-queue/CrossPostModal.tsx',
  'src/components/FilterPanel.tsx',
  'src/components/posting-queue/QueueItemCard.tsx',
];

const PALETTE_RE =
  /\b(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|pink|rose|emerald|amber|yellow|red|orange|green)-\d+\b/;
const LIGHT_MODE_RE = /\bbg-(white|gray-\d+)\b/;

interface Violation {
  file: string;
  line: number;
  match: string;
  category: 'palette' | 'light-mode';
}

function extractClassNameStrings(content: string): { text: string; lineOffset: number }[] {
  const out: { text: string; lineOffset: number }[] = [];
  const classNameRe = /className\s*=\s*(?:\{[^}]*\}|"[^"]*"|'[^']*'|`[^`]*`)/g;
  let match: RegExpExecArray | null;
  while ((match = classNameRe.exec(content)) !== null) {
    const lineOffset = content.slice(0, match.index).split('\n').length;
    out.push({ text: match[0], lineOffset });
  }
  return out;
}

function scanFile(relPath: string): Violation[] {
  const fullPath = path.resolve(process.cwd(), relPath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const violations: Violation[] = [];
  const classNameStrings = extractClassNameStrings(content);
  for (const { text, lineOffset } of classNameStrings) {
    const paletteMatch = text.match(PALETTE_RE);
    if (paletteMatch) {
      violations.push({ file: relPath, line: lineOffset, match: paletteMatch[0], category: 'palette' });
    }
    const lightMatch = text.match(LIGHT_MODE_RE);
    if (lightMatch) {
      violations.push({ file: relPath, line: lineOffset, match: lightMatch[0], category: 'light-mode' });
    }
  }
  return violations;
}

describe('Story 14.8 palette + light-mode regression scan (AC #17)', () => {
  it.each(STORY_14_8_FILES)('%s contains no palette or light-mode className tokens', (relPath) => {
    const violations = scanFile(relPath);
    if (violations.length > 0) {
      const lines = violations.map(
        (v) => `  - ${v.file}:${v.line} → [${v.category}] ${v.match}`,
      );
      throw new Error(
        `Found ${violations.length} banned className token(s) in ${relPath}:\n${lines.join('\n')}`,
      );
    }
    expect(violations).toHaveLength(0);
  });
});
