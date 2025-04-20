/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // blue-500
          light: '#60A5FA', // blue-400
          dark: '#1D4ED8', // blue-700
          text: '#EFF6FF' // blue-50 (for text on dark primary)
        },
        secondary: {
          DEFAULT: '#10B981', // emerald-500
          light: '#34D399', // emerald-400
          dark: '#047857', // emerald-700
          text: '#ECFDF5' // emerald-50
        },
        accent: {
          DEFAULT: '#F59E0B', // amber-500
          light: '#FBBF24', // amber-400
          dark: '#B45309', // amber-700
          text: '#FFFBEB' // amber-50
        },
        neutral: {
          DEFAULT: '#6B7280', // gray-500
          light: '#D1D5DB', // gray-300
          lighter: '#F3F4F6', // gray-100
          dark: '#374151', // gray-700
          darker: '#111827' // gray-900
        },
        danger: {
          DEFAULT: '#EF4444', // red-500
          light: '#F87171', // red-400
          dark: '#B91C1C', // red-700
          text: '#FEF2F2' // red-50
        }
      }
    },
  },
  plugins: [],
} 