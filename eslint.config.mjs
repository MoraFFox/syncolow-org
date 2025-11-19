import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

// ESLint flat config with TypeScript support
/** @type {import('eslint').FlatConfig[]} */
export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        sourceType: 'module',
        ecmaVersion: 2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Use the recommended TypeScript rules as a base
      ...tsPlugin.configs.recommended.rules,
    },
  },
];
