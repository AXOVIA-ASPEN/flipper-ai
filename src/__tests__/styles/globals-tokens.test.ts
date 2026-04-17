/**
 * @file src/__tests__/styles/globals-tokens.test.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-04-17
 * @version 1.0
 * @brief Regression guard for the canonical dark-first design tokens in app/globals.css.
 *
 * @description
 * Story 14.1 flips `:root` to the canonical dark-first palette and adds the
 * missing canonical animations and utility classes (fp-slide-up, fp-toast-in,
 * fp-shimmer, fp-metric-num, fp-btn-hot, fp-hot-card, purple range slider).
 * This test reads `app/globals.css` as a string and asserts that every
 * required token, keyframe, and utility class exists — and that the legacy
 * light-mode defaults do NOT reappear. It is the service-level gate for
 * acceptance criteria #1–#5 and #8.
 */

import fs from 'fs';
import path from 'path';

const GLOBALS_CSS_PATH = path.resolve(__dirname, '../../../app/globals.css');

describe('Story 14.1 — canonical design tokens in app/globals.css', () => {
  let css: string;

  beforeAll(() => {
    css = fs.readFileSync(GLOBALS_CSS_PATH, 'utf-8');
  });

  describe('AC #1 — dark-first :root tokens', () => {
    const requiredTokens: Array<[string, string]> = [
      ['--color-background', '#080b14'],
      ['--color-surface', '#0f1524'],
      ['--color-primary', '#7c3aed'],
      ['--color-secondary', '#8b5cf6'],
      ['--color-accent', '#fbbf24'],
      ['--color-text', '#e2e8f0'],
      ['--color-text-secondary', '#94a3b8'],
      ['--color-border', 'rgba(255, 255, 255, 0.09)'],
      ['--color-success', '#34d399'],
      ['--color-warning', '#fbbf24'],
      ['--color-error', '#f87171'],
    ];

    it.each(requiredTokens)('declares %s with canonical value %s', (token, value) => {
      expect(css).toContain(`${token}: ${value}`);
    });

    it('does NOT contain the legacy light-mode --color-primary (#3b82f6)', () => {
      expect(css).not.toContain('--color-primary: #3b82f6');
    });

    it('does NOT contain the legacy light-mode --color-background (#ffffff)', () => {
      expect(css).not.toContain('--color-background: #ffffff');
    });

    it('does NOT contain the legacy light-mode --color-text (#111827)', () => {
      expect(css).not.toContain('--color-text: #111827');
    });

    it('does NOT contain the legacy light-mode --color-surface (#f9fafb)', () => {
      expect(css).not.toContain('--color-surface: #f9fafb');
    });

    it('does NOT contain the legacy light-mode --color-text-secondary (#6b7280)', () => {
      expect(css).not.toContain('--color-text-secondary: #6b7280');
    });

    it('does NOT contain the legacy light-mode --color-border (#e5e7eb)', () => {
      expect(css).not.toContain('--color-border: #e5e7eb');
    });
  });

  describe('AC #2 — canonical animations with fp- prefix', () => {
    const requiredKeyframes = [
      'fp-slide-up',
      'fp-toast-in',
      'fp-shimmer',
      'fp-border-spin',
    ];

    it.each(requiredKeyframes)('declares @keyframes %s', (name) => {
      expect(css).toMatch(new RegExp(`@keyframes\\s+${name}\\b`));
    });

    const requiredUtilityClasses = [
      '.fp-slide-up',
      '.fp-toast-in',
      '.fp-shimmer',
      '.fp-metric-num',
    ];

    it.each(requiredUtilityClasses)('declares utility class %s', (cls) => {
      const escaped = cls.replace('.', '\\.');
      expect(css).toMatch(new RegExp(`${escaped}\\s*{`));
    });
  });

  describe('AC #3 — .fp-btn-hot deep-purple CTA with ambient glow', () => {
    it('declares .fp-btn-hot with the canonical gradient and glow', () => {
      expect(css).toMatch(/\.fp-btn-hot\s*{[^}]*linear-gradient\(135deg,\s*#7c3aed,\s*#5b21b6\)/s);
      expect(css).toMatch(/\.fp-btn-hot\s*{[^}]*box-shadow:\s*0 0 20px rgba\(109,40,217,0\.4\)/s);
    });
  });

  describe('AC #4 — .fp-hot-card cycling purple border', () => {
    it('declares .fp-hot-card and its ::before with fp-border-spin animation', () => {
      expect(css).toMatch(/\.fp-hot-card\s*{/);
      expect(css).toMatch(/\.fp-hot-card::before\s*{[\s\S]*?animation:\s*fp-border-spin\b/);
      expect(css).toMatch(/background:\s*linear-gradient\(135deg,\s*#7c3aed,\s*#8b5cf6,\s*#5b21b6,\s*#7c3aed\)/);
      expect(css).toMatch(/background-size:\s*200% 200%/);
    });
  });

  describe('AC #5 — purple range slider thumb scoped under .fp-content', () => {
    it('scopes range slider styling under .fp-content (not global)', () => {
      expect(css).toMatch(/\.fp-content input\[type=range\]\s*{/);
    });

    it('declares webkit slider thumb with purple gradient', () => {
      expect(css).toMatch(
        /\.fp-content input\[type=range\]::-webkit-slider-thumb\s*{[\s\S]*?linear-gradient\(135deg,\s*#8b5cf6,\s*#7c3aed\)/
      );
    });

    it('declares Firefox slider thumb with purple gradient (cross-browser parity)', () => {
      expect(css).toMatch(
        /\.fp-content input\[type=range\]::-moz-range-thumb\s*{[\s\S]*?linear-gradient\(135deg,\s*#8b5cf6,\s*#7c3aed\)/
      );
    });
  });

  describe('AC #6 — body receives min-height: 100vh from CSS (not inline)', () => {
    it('declares min-height: 100vh inside the body { } rule', () => {
      expect(css).toMatch(/body\s*{[\s\S]*?min-height:\s*100vh/);
    });
  });
});
