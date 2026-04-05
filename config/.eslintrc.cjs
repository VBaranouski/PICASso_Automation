const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const playwrightPlugin = require('eslint-plugin-playwright');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'allure-results/**'],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      playwright: playwrightPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      ...playwrightPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      'no-undef': 'off',
      'playwright/expect-expect': ['warn', {
        assertFunctionPatterns: ['^expect[A-Z].*'],
      }],
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'warn',
      'playwright/prefer-web-first-assertions': 'error',
    },
  },
];