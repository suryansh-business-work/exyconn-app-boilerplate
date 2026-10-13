import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const testFiles = ['**/*.test.{ts,tsx}', '**/*.cy.tsx', '**/test/**', '**/cypress/**'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/.expo/**',
      'app/mobile-app/android/**',
      'app/mobile-app/ios/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  sonarjs.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'sonarjs/cognitive-complexity': ['error', 15],
      // Browser dialogs are replaced by MUI (web) and Tamagui (native) components.
      'no-restricted-globals': ['error', 'alert', 'confirm', 'prompt'],
      // Diagnostics go through the logger on the server and console.error on clients.
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  {
    files: [
      'packages/common/shell/**/*.tsx',
      'packages/common/error-boundary/src/web/**/*.tsx',
      'portals/**/*.tsx',
    ],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ['app/mobile-app/jest.setup.js'],
    languageOptions: { globals: globals.jest },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Command-line scripts report their results on standard output.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // Cypress assertions are chained with .should(), which this rule does not recognize.
    files: ['**/*.cy.{ts,tsx}'],
    rules: { 'sonarjs/assertions-in-tests': 'off' },
  },
  {
    files: testFiles,
    languageOptions: { globals: globals.jest },
    rules: {
      // Tests use fixed sample credentials and local plain-HTTP URLs by design.
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-clear-text-protocols': 'off',
      // Deeply nested describe/it callbacks are how test suites are structured.
      'sonarjs/no-nested-functions': 'off',
    },
  },
);
