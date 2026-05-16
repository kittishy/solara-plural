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
        success:      '#86efac',
        warning:      '#fcd34d',
        error:        '#fca5a5',
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
        sans: ['var(--font-nunito)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        full: '9999px',
      },
      boxShadow: {
        card:        '0 0 0 1px rgb(var(--theme-border-rgb) / 0.8), 0 4px 16px rgba(0,0,0,0.4)',
        'card-float':'0 0 0 1px rgb(var(--theme-border-strong-rgb) / 0.8), 0 12px 40px rgba(0,0,0,0.6)',
        glow:        '0 0 20px rgba(244,114,182,0.40)',
        'front-glow':'0 0 24px rgba(192,132,252,0.40)',
        'gold-glow': '0 0 20px rgba(251,191,36,0.25)',
      },
      animation: {
        'pulse-soft': 'pulse 2s ease-in-out infinite',
        'fade-in':    'fadeIn 200ms ease',
        'privacy-panel': 'privacyPanel 160ms var(--ease-snap)',
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
        privacyPanel: {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
