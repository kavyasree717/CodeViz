/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode palette
        dark: {
          bg: '#0D0B1A',
          surface: '#17132B',
          elevated: '#241A3B',
          border: '#2D2447',
        },
        // Light mode palette
        light: {
          bg: '#FFF9F5',
          surface: '#FFFFFF',
          elevated: '#F8F4FF',
          border: '#E8E0F0',
        },
        // Visualization colors (consistent across themes)
        viz: {
          left: '#00D9FF',      // Cyan
          mid: '#FF4D9F',       // Pink
          right: '#FF9F43',     // Orange
          success: '#2ECC71',   // Green
          error: '#FF6B6B',     // Red
          warning: '#FFD93D',   // Yellow
          accent: '#8B5CF6',    // Violet
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'Monaco', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}