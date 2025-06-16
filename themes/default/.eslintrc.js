module.exports = {
  extends: ['@modular-app/config/eslint/react'],
  rules: {
    // Theme-specific rules
    'react/prop-types': 'off',
    'tailwindcss/no-custom-classname': 'off',
  },
};