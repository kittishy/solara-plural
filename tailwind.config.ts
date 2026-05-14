import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--theme-bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--theme-surface-rgb) / <alpha-value>)',
        'surface-alt': 'rgb(var(--theme-surface-alt-rgb) / <alpha-value>)',
        'surface-raised': 'rgb(var(--theme-surface-raised-rgb) / <alpha-value>)',
        border: 'rgb(var(--theme-border-rgb) / <alpha-value>)',
        'border-soft': 'rgb(var(--theme-border-soft-rgb) / <alpha-value>)',
        'border-strong': 'rgb(var(--theme-border-strong-rgb) / <alpha-value>)',
        text: 'rgb(var(--theme-text-rgb) / <alpha-value>)',
        muted: 'rgb(var(--theme-muted-rgb) / <alpha-value>)',
        subtle: 'rgb(var(--theme-subtle-rgb) / <alpha-value>)',
        primary: 'rgb(var(--theme-primary-rgb) / <alpha-value>)',
        'primary-soft': 'rgb(var(--theme-primary-soft-rgb) / <alpha-value>)',
        'primary-glow': 'rgb(var(--theme-primary-glow-rgb) / <alpha-value>)',
        front: 'rgb(var(--theme-front-rgb) / <alpha-value>)',
        'front-soft': 'rgb(var(--theme-front-soft-rgb) / <alpha-value>)',
        gold: 'rgb(var(--theme-gold-rgb) / <alpha-value>)',
        success:      '#4ade80',
        warning:      '#fbbf24',
        error:        '#ff5a6a',
        accent:       '#D8FA00',
        // Member swatches
        'm-violet':   '#a78bfa',
        'm-pink':     '#f9a8d4',
        'm-blue':     '#93c5fd',
        'm-green':    '#86efac',
        'm-amber':    '#fcd34d',
        'm-orange':   '#fb923c',
        'm-red':      '#f87171',
        'm-cyan':     '#67e8f9',
        'm-purple':   '#d8b4fe',
        'm-indigo':   '#a5b4fc',
        'm-warm':     '#fdba74',
        'm-emerald':  '#6ee7b7',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-nunito)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '8px',
        xl: '20px',
        '2xl': '35px',
        full: '9999px',
      },
      boxShadow: {
        card:        '0 4px 24px rgba(0,0,0,0.08)',
        'card-float':'0 8px 40px rgba(0,0,0,0.15)',
        glow:        '0 0 16px rgba(216,250,0,0.35)',
        'front-glow':'0 0 16px rgba(216,250,0,0.35)',
        'gold-glow': '0 0 16px rgba(216,250,0,0.25)',
      },
      animation: {
        'pulse-soft': 'pulse 2s ease-in-out infinite',
        'fade-in':    'fadeIn 200ms ease',
      },
      transitionDuration: {
        '0':   '0ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
