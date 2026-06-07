/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ritual: {
          black: '#000000',
          elevated: '#111827',
          surface: '#1F2937',
          green: '#19D184',
          lime: '#BFFF00',
          pink: '#FF1DCE',
          gold: '#FACC15',
          gray: {
            700: '#374151',
            600: '#4B5563',
            500: '#6B7280',
            400: '#9CA3AF',
            300: '#D1D5DB',
            100: '#F3F4F6',
          },
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 30px -5px rgba(25, 209, 132, 0.35)',
        'glow-pink': '0 0 30px -5px rgba(255, 29, 206, 0.25)',
        'glow-white': '0 0 20px -5px rgba(255,255,255,0.15)',
        card: '0 4px 40px -12px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'float-fast': 'floatFast 4s ease-in-out infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'flicker': 'flicker 3s linear infinite',
        'ritual-glow': 'ritualGlow 4s ease-in-out infinite',
        'ember-rise': 'emberRise 3s ease-out infinite',
        'smoke-rise': 'smokeRise 5s ease-out infinite',
        'pendulum': 'pendulum 2s ease-in-out infinite',
        'bob': 'bob 3s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(25,209,132,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(25,209,132,0.7)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '48%': { opacity: '0.9' },
          '50%': { opacity: '0.6' },
          '52%': { opacity: '0.9' },
          '75%': { opacity: '0.8' },
        },
        ritualGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(25,209,132,0.4))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(25,209,132,0.8))' },
        },
        emberRise: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.9' },
          '100%': { transform: 'translateY(-120px) scale(0)', opacity: '0' },
        },
        smokeRise: {
          '0%': { transform: 'translateY(0) scale(0.5)', opacity: '0.3' },
          '100%': { transform: 'translateY(-200px) scale(3)', opacity: '0' },
        },
        pendulum: {
          '0%, 100%': { transform: 'rotate(-15deg)' },
          '50%': { transform: 'rotate(15deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
