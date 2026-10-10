/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B2A3F',
          light: '#0E3554',
          dark: '#071D2C',
        },
        ocean: {
          DEFAULT: '#0A6FB8',
          light: '#1A85D4',
          dark: '#085DA0',
        },
        teal: {
          DEFAULT: '#0EA5A4',
          light: '#14C5C4',
          dark: '#0B8C8B',
        },
        good: '#16A34A',
        warning: '#F59E0B',
        critical: '#DC2626',
        offline: '#6B7280',
        'bg-light': '#EEF6FA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.08)',
        'card-dark': '0 4px 20px rgba(0,0,0,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'count-up': 'countUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
