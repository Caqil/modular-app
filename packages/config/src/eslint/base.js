/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // General
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    
    // Import/Export
    'import/order': 'off', // Handled by prettier-plugin-organize-imports
    'sort-imports': 'off', // Handled by prettier-plugin-organize-imports
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['tsconfig.json', 'packages/*/tsconfig.json'],
      },
    },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'build/',
    '*.config.js',
    '*.config.mjs',
  ],
};
