/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@modular-app/config/tailwind/preset')],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Default theme specific styles
      colors: {
        'theme-primary': 'hsl(var(--theme-primary))',
        'theme-secondary': 'hsl(var(--theme-secondary))',
      },
    },
  },
};