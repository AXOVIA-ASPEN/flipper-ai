/**
 * Theme Configuration Tests
 * @jest-environment node
 */
import { describe, test, expect } from '@jest/globals';
import { themes, defaultTheme, Theme, ThemeColors } from '@/lib/theme-config';

describe('Theme Configuration', () => {
  describe('themes object', () => {
    test('should have all required themes', () => {
      expect(themes).toHaveProperty('purple');
      expect(themes).toHaveProperty('ocean');
      expect(themes).toHaveProperty('sunset');
      expect(themes).toHaveProperty('forest');
      expect(themes).toHaveProperty('midnight');
      expect(themes).toHaveProperty('rose');
    });

    test('should have exactly 6 themes', () => {
      expect(Object.keys(themes)).toHaveLength(6);
    });

    test('all themes should have unique IDs', () => {
      const ids = Object.values(themes).map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('all theme IDs should match their object keys', () => {
      Object.entries(themes).forEach(([key, theme]) => {
        expect(theme.id).toBe(key);
      });
    });
  });

  describe('defaultTheme', () => {
    test('should be set to purple theme', () => {
      expect(defaultTheme).toBe(themes.purple);
      expect(defaultTheme.id).toBe('purple');
    });

    test('should have all required properties', () => {
      expect(defaultTheme).toHaveProperty('id');
      expect(defaultTheme).toHaveProperty('name');
      expect(defaultTheme).toHaveProperty('description');
      expect(defaultTheme).toHaveProperty('colors');
    });
  });

  describe('theme structure validation', () => {
    test.each(Object.entries(themes))('%s theme should have valid structure', (_, theme: Theme) => {
      // Theme metadata
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.description).toBeTruthy();

      // Colors object exists
      expect(theme.colors).toBeDefined();
      expect(typeof theme.colors).toBe('object');
    });

    test.each(Object.entries(themes))(
      '%s theme should have all required color properties',
      (_, theme: Theme) => {
        const colors = theme.colors;

        // Primary colors
        expect(colors.primaryFrom).toBeTruthy();
        expect(colors.primaryTo).toBeTruthy();
        expect(colors.primaryShadow).toBeTruthy();

        // Secondary colors
        expect(colors.secondaryFrom).toBeTruthy();
        expect(colors.secondaryTo).toBeTruthy();
        expect(colors.secondaryShadow).toBeTruthy();

        // Accent colors
        expect(colors.accentBlue).toBeDefined();
        expect(colors.accentGreen).toBeDefined();
        expect(colors.accentOrange).toBeDefined();
        expect(colors.accentPurple).toBeDefined();

        // Orb colors
        expect(colors.orbColors).toBeDefined();
        expect(Array.isArray(colors.orbColors)).toBe(true);
        expect(colors.orbColors).toHaveLength(3);

        // Text colors
        expect(colors.textGradient).toBeDefined();
        expect(colors.textMuted).toBeTruthy();
      }
    );

    test.each(Object.entries(themes))(
      '%s theme accent colors should have from/to/shadow',
      (_, theme: Theme) => {
        const { accentBlue, accentGreen, accentOrange, accentPurple } = theme.colors;

        [accentBlue, accentGreen, accentOrange, accentPurple].forEach((accent) => {
          expect(accent.from).toBeTruthy();
          expect(accent.to).toBeTruthy();
          expect(accent.shadow).toBeTruthy();
        });
      }
    );

    test.each(Object.entries(themes))(
      '%s theme textGradient should have from/via/to',
      (_, theme: Theme) => {
        const { textGradient } = theme.colors;
        expect(textGradient.from).toBeTruthy();
        expect(textGradient.via).toBeTruthy();
        expect(textGradient.to).toBeTruthy();
      }
    );
  });

  describe('color format validation', () => {
    const tailwindColorRegex = /^[a-z]+-\d{2,3}(?:\/\d{1,3})?$/;

    test.each(Object.entries(themes))(
      '%s theme primary colors should be valid Tailwind classes',
      (_, theme: Theme) => {
        expect(theme.colors.primaryFrom).toMatch(tailwindColorRegex);
        expect(theme.colors.primaryTo).toMatch(tailwindColorRegex);
        expect(theme.colors.primaryShadow).toMatch(tailwindColorRegex);
      }
    );

    test.each(Object.entries(themes))(
      '%s theme secondary colors should be valid Tailwind classes',
      (_, theme: Theme) => {
        expect(theme.colors.secondaryFrom).toMatch(tailwindColorRegex);
        expect(theme.colors.secondaryTo).toMatch(tailwindColorRegex);
        expect(theme.colors.secondaryShadow).toMatch(tailwindColorRegex);
      }
    );

    test.each(Object.entries(themes))(
      '%s theme orb colors should be valid Tailwind classes',
      (_, theme: Theme) => {
        theme.colors.orbColors.forEach((color) => {
          expect(color).toMatch(tailwindColorRegex);
        });
      }
    );

    test.each(Object.entries(themes))(
      '%s theme text colors should be valid Tailwind classes',
      (_, theme: Theme) => {
        expect(theme.colors.textGradient.from).toMatch(tailwindColorRegex);
        expect(theme.colors.textGradient.via).toMatch(tailwindColorRegex);
        expect(theme.colors.textGradient.to).toMatch(tailwindColorRegex);
        expect(theme.colors.textMuted).toMatch(tailwindColorRegex);
      }
    );
  });

  describe('specific theme validations', () => {
    test('purple theme should have purple/pink colors', () => {
      const { colors } = themes.purple;
      expect(colors.primaryFrom).toContain('purple');
      expect(colors.primaryTo).toContain('pink');
      expect(colors.orbColors.some((c) => c.includes('purple'))).toBe(true);
    });

    test('ocean theme should have blue/cyan/teal colors', () => {
      const { colors } = themes.ocean;
      expect(['cyan', 'blue', 'teal'].some((c) => colors.primaryFrom.includes(c))).toBe(true);
      expect(['cyan', 'blue', 'teal'].some((c) => colors.primaryTo.includes(c))).toBe(true);
    });

    test('sunset theme should have warm colors', () => {
      const { colors } = themes.sunset;
      expect(['orange', 'red', 'yellow'].some((c) => colors.primaryFrom.includes(c))).toBe(true);
      expect(['orange', 'red', 'yellow'].some((c) => colors.primaryTo.includes(c))).toBe(true);
    });

    test('forest theme should have green colors', () => {
      const { colors } = themes.forest;
      expect(['green', 'emerald', 'lime'].some((c) => colors.primaryFrom.includes(c))).toBe(true);
      expect(['green', 'emerald', 'lime'].some((c) => colors.primaryTo.includes(c))).toBe(true);
    });

    test('midnight theme should have deep blue colors', () => {
      const { colors } = themes.midnight;
      expect(['indigo', 'blue', 'violet'].some((c) => colors.primaryFrom.includes(c))).toBe(true);
      expect(colors.primaryTo).toContain('blue');
    });

    test('rose theme should have pink/rose colors', () => {
      const { colors } = themes.rose;
      expect(['pink', 'rose', 'fuchsia'].some((c) => colors.primaryFrom.includes(c))).toBe(true);
      expect(['pink', 'rose', 'fuchsia'].some((c) => colors.primaryTo.includes(c))).toBe(true);
    });
  });

  describe('theme accessibility', () => {
    test('all themes should have consistent accent color structure', () => {
      Object.values(themes).forEach((theme) => {
        const accentKeys = Object.keys(theme.colors).filter((k) => k.startsWith('accent'));
        expect(accentKeys).toHaveLength(4);
        expect(accentKeys).toContain('accentBlue');
        expect(accentKeys).toContain('accentGreen');
        expect(accentKeys).toContain('accentOrange');
        expect(accentKeys).toContain('accentPurple');
      });
    });

    test('all themes should have shadow colors for depth', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.colors.primaryShadow).toContain('/');
        expect(theme.colors.secondaryShadow).toContain('/');
        expect(theme.colors.accentBlue.shadow).toContain('/');
        expect(theme.colors.accentGreen.shadow).toContain('/');
        expect(theme.colors.accentOrange.shadow).toContain('/');
        expect(theme.colors.accentPurple.shadow).toContain('/');
      });
    });

    test('all themes should have muted text for hierarchy', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.colors.textMuted).toContain('/');
      });
    });
  });

  describe('theme names and descriptions', () => {
    test('all themes should have descriptive names', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.name.length).toBeGreaterThan(5);
        expect(theme.name).not.toBe(theme.id);
      });
    });

    test('all themes should have helpful descriptions', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.description.length).toBeGreaterThan(10);
        expect(theme.description.toLowerCase()).toContain('theme');
      });
    });

    test('theme descriptions should mention primary colors', () => {
      expect(themes.purple.description.toLowerCase()).toContain('purple');
      expect(themes.ocean.description.toLowerCase()).toContain('blue');
      expect(themes.sunset.description.toLowerCase()).toContain('orange');
      expect(themes.forest.description.toLowerCase()).toContain('green');
      expect(themes.midnight.description.toLowerCase()).toContain('blue');
      expect(themes.rose.description.toLowerCase()).toContain('pink');
    });
  });

  describe('theme consistency', () => {
    test('all themes should have exactly 3 orb colors', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.colors.orbColors).toHaveLength(3);
      });
    });

    test('all themes should use -500 or -600 scale for primary colors', () => {
      Object.values(themes).forEach((theme) => {
        const hasPrimaryScale =
          theme.colors.primaryFrom.includes('-500') || theme.colors.primaryFrom.includes('-600');
        const hasSecondaryScale =
          theme.colors.primaryTo.includes('-500') ||
          theme.colors.primaryTo.includes('-600') ||
          theme.colors.primaryTo.includes('-700');

        expect(hasPrimaryScale).toBe(true);
        expect(hasSecondaryScale).toBe(true);
      });
    });

    test('all themes should use -200 scale for text gradients', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.colors.textGradient.from).toContain('-200');
        expect(theme.colors.textGradient.via).toContain('-200');
        expect(theme.colors.textGradient.to).toContain('-200');
      });
    });

    test('all themes should use -200/70 for muted text', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme.colors.textMuted).toContain('-200/70');
      });
    });
  });

  describe('TypeScript interface compliance', () => {
    test('Theme interface should match actual structure', () => {
      const sampleTheme: Theme = themes.purple;

      // If this compiles, the structure is correct
      expect(sampleTheme.id).toBeDefined();
      expect(sampleTheme.name).toBeDefined();
      expect(sampleTheme.description).toBeDefined();
      expect(sampleTheme.colors).toBeDefined();
    });

    test('ThemeColors interface should match actual structure', () => {
      const sampleColors: ThemeColors = themes.purple.colors;

      // If this compiles, the structure is correct
      expect(sampleColors.primaryFrom).toBeDefined();
      expect(sampleColors.accentBlue.from).toBeDefined();
      expect(sampleColors.orbColors[0]).toBeDefined();
      expect(sampleColors.textGradient.from).toBeDefined();
    });
  });
});
