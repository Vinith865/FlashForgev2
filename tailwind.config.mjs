const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './hooks/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Every token resolves through a CSS variable, so switching the
        // theme flips the whole interface without touching a single class.
        canvas: v('canvas'),
        surface: v('surface'),
        hairline: v('hairline'),
        brand: {
          50: v('brand-50'),
          100: v('brand-100'),
          200: v('brand-200'),
          400: v('brand-400'),
          500: v('brand-500'),
          600: v('brand-600'),
          700: v('brand-700'),
          800: v('brand-800'),
        },
        ink: {
          900: v('ink-900'),
          700: v('ink-700'),
          500: v('ink-500'),
          400: v('ink-400'),
        },
        // Semantic tints, so status colours work on both grounds
        ok: { bg: v('ok-bg'), fg: v('ok-fg'), line: v('ok-line') },
        warn: { bg: v('warn-bg'), fg: v('warn-fg'), line: v('warn-line') },
        danger: { bg: v('danger-bg'), fg: v('danger-fg'), line: v('danger-line') },
        muted: v('muted'),
        // The console stays dark on purpose — it is the one high-contrast
        // block in the interface, which is what makes log output readable.
        console: {
          bg: '#0B1220',
          border: '#1E293B',
          text: '#CBD5E1',
          dim: '#64748B',
          ok: '#4ADE80',
          warn: '#FBBF24',
          err: '#F87171',
          info: '#7DD3FC',
        },
      },
      boxShadow: {
        // Layered: a tight contact shadow plus a wide diffuse one. A single
        // shadow reads flat and muddy on a light ground.
        card: '0 1px 1px rgb(var(--shadow-tint) / 0.03), 0 2px 4px rgb(var(--shadow-tint) / 0.03), 0 8px 16px -8px rgb(var(--shadow-tint) / 0.06)',
        lift: '0 1px 2px rgb(var(--shadow-tint) / 0.04), 0 8px 16px -6px rgb(var(--shadow-tint) / 0.08), 0 24px 40px -20px rgb(var(--shadow-tint) / 0.12)',
        pop: '0 2px 4px rgb(var(--shadow-tint) / 0.05), 0 16px 32px -10px rgb(var(--shadow-tint) / 0.14), 0 40px 64px -32px rgb(var(--shadow-tint) / 0.16)',
        focus: '0 0 0 3px rgb(37 99 235 / 0.16)',
        btn: '0 1px 2px rgb(var(--shadow-tint) / 0.10), 0 2px 6px -1px rgb(37 99 235 / 0.32), inset 0 1px 0 rgb(255 255 255 / 0.18)',
        'btn-hover': '0 2px 4px rgb(var(--shadow-tint) / 0.12), 0 6px 14px -2px rgb(37 99 235 / 0.38), inset 0 1px 0 rgb(255 255 255 / 0.2)',
        inset: 'inset 0 1px 0 rgb(255 255 255 / 0.9)',
        ring: '0 0 0 1px rgb(var(--shadow-tint) / 0.05)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        snap: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      keyframes: {
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(220%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        pulseSoft: { '0%,100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        skeleton: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        shimmer: 'shimmer 2.2s infinite',
        floaty: 'floaty 9s ease-in-out infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        slideUp: 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
        fadeIn: 'fadeIn 0.4s ease both',
        skeleton: 'skeleton 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
