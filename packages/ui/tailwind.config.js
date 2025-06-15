/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@modular-app/config/tailwind/preset')],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // UI package specific extensions
    },
  },
};
