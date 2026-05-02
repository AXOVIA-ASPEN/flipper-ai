/**
 * @file src/__tests__/components/theme-removal.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-24
 * @version 1.0
 * @brief Verifies the legacy multi-theme system files are absent post Story 14.2.
 *
 * @description
 * Story 14.8 AC #16 inherits the verification gate from Story 14.2 (which
 * deleted the competing multi-theme system). This test asserts that
 * ThemeSettings.tsx, ThemeContext.tsx, theme-config.ts, and ThemeStyles.tsx
 * do NOT exist on disk. Uses fs.existsSync (deterministic, platform-agnostic)
 * rather than require.resolve which can throw different error codes across
 * Node/tsconfig path-alias configurations (per the story's red-team finding R8).
 */

import fs from 'fs';
import path from 'path';

const SHOULD_NOT_EXIST = [
  'src/components/ThemeSettings.tsx',
  'src/contexts/ThemeContext.tsx',
  'src/lib/theme-config.ts',
  'src/components/ThemeStyles.tsx',
];

describe('Story 14.2 → 14.8: legacy multi-theme system removal', () => {
  it.each(SHOULD_NOT_EXIST)('%s does not exist on disk', (relativePath) => {
    const fullPath = path.resolve(process.cwd(), relativePath);
    expect(fs.existsSync(fullPath)).toBe(false);
  });
});
