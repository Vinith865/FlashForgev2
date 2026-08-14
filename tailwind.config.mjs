/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './hooks/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          900: '#05060A',
          800: '#0A0C12',
          700: '#101320',
          600: '#171B2B',
          500: '#1F2438',
        },
        neon: {
          cyan: '#22D3EE',
          violet: '#A78BFA',
          lime: '#A3E635',
          amber: '#FBBF24',
          rose: '#FB7185',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px rgba(34,211,238,0.35)',
        'glow-violet': '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px rgba(167,139,250,0.4)',
        card: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 20px 50px -25px rgba(0,0,0,0.9)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)',
      },
      keyframes: {
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseGlow: {
          '0%,100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        shimmer: 'shimmer 2.2s infinite',
        floaty: 'floaty 7s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        slideUp: 'slideUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
        fadeIn: 'fadeIn 0.5s ease both',
        spinSlow: 'spinSlow 9s linear infinite',
      },
    },
  },
  plugins: [],
};
