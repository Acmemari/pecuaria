/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./agents/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        // Google AI Studio Light Theme approximation
        ai: {
          bg: '#FFFFFF',       // Main background
          surface: '#F8F9FA',  // Secondary background
          surface2: '#F1F3F4', // Hover states
          border: '#E0E3E7',   // Borders
          text: '#1F1F1F',     // Primary text
          subtext: '#5F6368',  // Secondary text
          accent: '#1A73E8',   // Google Blue
          accentHover: '#1558B0',
        }
      }
    },
  },
  plugins: [],
}

