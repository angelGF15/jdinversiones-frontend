/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#032EDD',
          50: '#EEF2FF',
          100: '#DDE5FF',
          300: '#8EA5FF',
          500: '#032EDD',
          700: '#021F97',
          900: '#010F48',
        },
        brand: {
          50: '#EEF2FF',
          100: '#DDE5FF',
          300: '#8EA5FF',
          500: '#032EDD',
          700: '#021F97',
          900: '#010F48',
        },
        success: {
          DEFAULT: '#22C55E',
          500: '#22C55E',
        },
        warning: {
          DEFAULT: '#F59E0B',
          500: '#F59E0B',
        },
        danger: {
          DEFAULT: '#EF4444',
          500: '#EF4444',
        },
        info: {
          DEFAULT: '#06B6D4',
          500: '#06B6D4',
        },
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          300: '#CBD5E1',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        }
      }
    },
  },
  plugins: [],
};
