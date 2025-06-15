module.exports = {
  extends: ['@modular-app/config/eslint/node'],
  rules: {
    // Core package specific rules
    'no-console': 'off', // Logging is important in core
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};