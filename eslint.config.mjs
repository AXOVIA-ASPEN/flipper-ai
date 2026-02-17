import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  // Relax rules for test files and config files
  {
    files: [
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'features/**',
      'e2e/**',
      '*.config.js',
      '*.config.mjs',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // Relax rules for JSX files
  {
    files: ['**/*.tsx'],
    rules: {
      'react/no-unescaped-entities': 'warn',
      // Downgrade set-state-in-effect to warning — calling setLoading(true)
      // at the top of a data-fetch effect is a well-established pattern.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);

export default eslintConfig;
