module.exports = {
  extends: ['@modular-app/config/eslint/react'],
  rules: {
    // Blog plugin specific rules
    'no-console': 'off', // Logging is useful in plugins
  },
};
