/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        primary: {
          teal: '#00A19A',
          green: '#2FAC66',
          'teal-dark': '#008B85',
          'teal-light': '#00B8B0',
          'green-dark': '#259A55',
          'green-light': '#3BC077',
        },
        kiotviet: {
          blue: '#00A19A',
          'blue-dark': '#008B85',
          'blue-light': '#00B8B0',
          green: '#2FAC66',
        },
      },
    },
  },
  plugins: [],
}

