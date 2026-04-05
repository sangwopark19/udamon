/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1B2A4A',
        'navy-light': '#2A3F6A',
        'navy-dark': '#111B33',
      },
    },
  },
  plugins: [],
};
