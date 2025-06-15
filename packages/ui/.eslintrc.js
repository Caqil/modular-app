module.exports = {
  extends: ['@modular-app/config/eslint/react'],
  rules: {
    // UI package specific rules
    'react/prop-types': 'off', // We use TypeScript
    'tailwindcss/no-custom-classname': 'off', // Allow custom classes for components
  },
};