module.exports = {
  extends: ['@modular-app/config/eslint/react'],
  rules: {
    // Web app specific rules
    'no-console': 'warn', // Console statements should be cleaned up
    '@next/next/no-html-link-for-pages': 'off', // We use Next.js Link appropriately
  },
};
