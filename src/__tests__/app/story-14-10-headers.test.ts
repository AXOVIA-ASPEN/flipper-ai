/**
 * @file src/__tests__/app/story-14-10-headers.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Final-gate test — every TSX file under app/ + src/components/ has a canonical JSDoc header (Story 14.10 AC #7).
 *
 * @description
 * In-process audit (uses `glob` + `fs.readFileSync` — does NOT shell out to
 * `rg`, so this passes on Windows CI runners). Walks every *.tsx file under
 * `app/**` and `src/components/**` (with the canonical exclusions for tests
 * and `.next` build output declared as a top-of-file constant per AC #7(f)),
 * reads the first 30 lines, and asserts the seven required JSDoc tags are
 * present. Reports per-file failures with the offending file path and the
 * list of missing tags so the next maintainer can fix without spelunking.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const HEADER_GLOB_PATTERNS = ['app/**/*.tsx', 'src/components/**/*.tsx'];
const EXCLUDED_GLOBS = [
  'src/__tests__/**',
  '**/*.test.tsx',
  '**/*.spec.tsx',
  '**/.next/**',
  '**/node_modules/**',
];
const REQUIRED_TAGS = ['@file', '@author', '@company', '@date', '@version', '@brief', '@description'];

describe('Story 14.10 — canonical JSDoc file headers (AC #7, final gate)', () => {
  test('every TSX file under app/ and src/components/ has all 7 canonical @-tags in the first 30 lines', async () => {
    const files = (
      await Promise.all(
        HEADER_GLOB_PATTERNS.map((p) =>
          glob(p, { cwd: REPO_ROOT, ignore: EXCLUDED_GLOBS, absolute: false })
        )
      )
    )
      .flat()
      .sort();

    expect(files.length).toBeGreaterThan(0);

    const offenders: Array<{ file: string; missing: string[] }> = [];
    for (const rel of files) {
      const abs = path.join(REPO_ROOT, rel);
      const head = fs.readFileSync(abs, 'utf-8').split('\n').slice(0, 30).join('\n');
      const missing = REQUIRED_TAGS.filter((tag) => !head.includes(tag));
      if (missing.length > 0) {
        offenders.push({ file: rel, missing });
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `${offenders.length} TSX file(s) missing canonical JSDoc header tags:\n${offenders
          .map((o) => `  ${o.file} → missing ${o.missing.join(', ')}`)
          .join('\n')}`
      );
    }
  });

  test('every TSX file under app/ and src/components/ has @author Stephen Boyett and @company Axovia AI', async () => {
    const files = (
      await Promise.all(
        HEADER_GLOB_PATTERNS.map((p) =>
          glob(p, { cwd: REPO_ROOT, ignore: EXCLUDED_GLOBS, absolute: false })
        )
      )
    )
      .flat()
      .sort();

    const offenders: string[] = [];
    for (const rel of files) {
      const abs = path.join(REPO_ROOT, rel);
      const head = fs.readFileSync(abs, 'utf-8').split('\n').slice(0, 30).join('\n');
      if (!/@author\s+Stephen Boyett/.test(head) || !/@company\s+Axovia AI/.test(head)) {
        offenders.push(rel);
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `${offenders.length} TSX file(s) with non-canonical @author or @company:\n  ${offenders.join('\n  ')}`
      );
    }
  });
});
