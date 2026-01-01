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
          50: '#e6f7f6',
          100: '#b3e8e5',
          200: '#80d9d4',
          300: '#4dcac3',
          400: '#1abbb2',
          500: '#00A19A', // Main teal color
          600: '#008B85',
          700: '#007570',
          800: '#005f5b',
          900: '#004946',
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

