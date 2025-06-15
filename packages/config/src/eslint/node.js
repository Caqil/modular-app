/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./base.js'],
  env: {
    node: true,
    es6: true,
  },
  rules: {
    // Node.js specific
    'no-console': 'off', // Console is fine in Node.js
    'no-process-env': 'off',
    'no-process-exit': 'error',
    'no-sync': 'warn',
    
    // Import/Export for Node.js
    'prefer-destructuring': [
      'error',
      {
        array: true,
        object: true,
      },
      {
        enforceForRenamedProperties: false,
      },
    ],
    
    // TypeScript Node.js specific
    '@typescript-eslint/no-var-requires': 'off', // Sometimes needed in Node.js
  },
  globals: {
    NodeJS: true,
    Buffer: true,
    global: true,
    process: true,
  },
};
