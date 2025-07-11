/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // <== IMPORTANT for manual dark theme
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // adjust if your file structure differs
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
