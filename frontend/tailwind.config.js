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
        dark: {
          950: '#07090E',
          900: '#0B0F17',
          850: '#101726',
          800: '#172033',
          700: '#1E293B',
          600: '#334155'
        },
        brand: {
          primary: '#6366F1',
          accent: '#06B6D4',
          viral: '#10B981',
          gold: '#F59E0B',
          danger: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif']
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.6))' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.2))' },
        },
        bounceSubtle: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-4px)' }
        }
      }
    },
  },
  plugins: [],
}
