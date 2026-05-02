/**
 * @file src/__tests__/app/story-14-9-headers.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Verifies the canonical JSDoc file header is present on every Story 14.9 migrated page (AC #10).
 *
 * @description
 * Per the global File Header Standard (~/.claude/CLAUDE.md), every TSX/TS source file must
 * begin with a JSDoc block containing @file, @author "Stephen Boyett", @company, @date,
 * @version, @brief, @description. This test reads the first 30 lines of each Story 14.9
 * target file and asserts those tags are present. The privacy/terms files previously used a
 * non-canonical "ASPEN (Axovia AI)" header — the test verifies the rewrite landed.
 */

import * as fs from 'fs';
import * as path from 'path';

const FILES_TO_CHECK = [
  'app/analytics/page.tsx',
  'app/scraper/page.tsx',
  'app/health/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
];

const REQUIRED_TAGS = ['@file', '@author', '@company', '@date', '@version', '@brief', '@description'];

describe('Story 14.9 — canonical JSDoc file headers (AC #10)', () => {
  test.each(FILES_TO_CHECK)('%s has all required @-tags in the first 30 lines', (relPath) => {
    const abs = path.resolve(__dirname, '../../../', relPath);
    const head = fs.readFileSync(abs, 'utf-8').split('\n').slice(0, 30).join('\n');

    REQUIRED_TAGS.forEach((tag) => {
      expect(head).toContain(tag);
    });

    // Author is canonical
    expect(head).toMatch(/@author\s+Stephen Boyett/);
    // Company is canonical
    expect(head).toMatch(/@company\s+Axovia AI/);
    // Non-canonical "ASPEN" attribution is gone
    expect(head).not.toContain('ASPEN');
  });
});
