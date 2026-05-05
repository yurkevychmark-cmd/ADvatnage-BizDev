/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#070909',
        card: '#0d1117',
        'card-2': '#121820',
        accent: '#e11d48',
        'accent-dark': '#9f1239',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        border: '#1a2235',
      },
    },
  },
  plugins: [],
};
