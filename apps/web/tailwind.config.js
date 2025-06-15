/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@modular-app/config/tailwind/preset')],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/plugins/**/src/**/*.{js,ts,jsx,tsx}",
    "../../themes/**/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Web app specific extensions
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
};
