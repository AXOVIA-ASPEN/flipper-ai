/**
 * @file src/__tests__/lib/story-14-10-globals-css.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Static-text test — globals.css contains the canonical Story 14.10 a11y rules (AC #1, #2, #5).
 *
 * @description
 * Reads `app/globals.css` from disk and asserts the four rule additions
 * Story 14.10 contributes to the canonical design system: `.fp-skip-link`
 * (skip-link pattern), `.fp-nav-link:focus-visible` (keyboard focus
 * indicator), `.fp-nav-link` `min-height: 44px` (WCAG 2.5.5), and
 * `.fp-icon-btn` (44x44 icon-only button class). Each assertion fails with
 * a descriptive error so the next maintainer knows exactly which rule
 * regressed if globals.css is later edited.
 */

import * as fs from 'fs';
import * as path from 'path';

const GLOBALS_CSS = path.resolve(__dirname, '..', '..', '..', 'app', 'globals.css');

describe('Story 14.10 — globals.css canonical a11y rules (AC #1, #2, #5)', () => {
  let css = '';

  beforeAll(() => {
    css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
  });

  test('.fp-skip-link rule is present with off-screen positioning', () => {
    expect(css).toMatch(/\.fp-skip-link\s*\{/);
    // The off-screen positioning is the WAI-ARIA skip-link pattern.
    const skipBlock = css.match(/\.fp-skip-link\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(skipBlock).toMatch(/position:\s*absolute/);
    expect(skipBlock).toMatch(/left:\s*-9999px/);
  });

  test('.fp-skip-link:focus-visible reveals the link at top-left', () => {
    expect(css).toMatch(/\.fp-skip-link:focus(?:-visible)?[,\s]/);
    const focusBlock = css.match(/\.fp-skip-link:focus(?:-visible)?[\s\S]*?\}/)?.[0] ?? '';
    expect(focusBlock).toMatch(/left:\s*12px/);
    expect(focusBlock).toMatch(/top:\s*12px/);
  });

  test('.fp-nav-link:focus-visible has the canonical purple outline', () => {
    expect(css).toMatch(/\.fp-nav-link:focus-visible\s*\{/);
    const block = css.match(/\.fp-nav-link:focus-visible\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(block).toMatch(/outline:\s*2px\s+solid\s+rgba\(139,\s*92,\s*246/);
  });

  test('.fp-nav-link rule includes min-height: 44px (WCAG 2.5.5)', () => {
    const block = css.match(/\.fp-nav-link\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(block).toMatch(/min-height:\s*44px/);
  });

  test('.fp-icon-btn enforces 44x44 minimum + focus-visible outline', () => {
    expect(css).toMatch(/\.fp-icon-btn\s*\{/);
    const block = css.match(/\.fp-icon-btn\s*\{[\s\S]*?\}/)?.[0] ?? '';
    expect(block).toMatch(/min-width:\s*44px/);
    expect(block).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/\.fp-icon-btn:focus-visible\s*\{[\s\S]*?outline:\s*2px\s+solid/);
  });
});
