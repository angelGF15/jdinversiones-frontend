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
          DEFAULT: 'rgb(var(--primary-500) / <alpha-value>)',
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
          950: 'rgb(var(--primary-900) / <alpha-value>)',
        },
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
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
        slate: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#45454C',
          700: '#2E2E33',
          800: '#1E1E22',
          900: '#121214',
          950: '#0A0A0B',
        },
        gray: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#45454C',
          700: '#2E2E33',
          800: '#1E1E22',
          900: '#121214',
          950: '#0A0A0B',
        }
      }
    },
  },
  plugins: [],
};
