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
        bg:           '#1a1625',
        surface:      '#231d33',
        'surface-alt':'#2d2640',
        border:       '#3d3454',
        'border-soft':'#2d2640',
        text:         '#e8e0f0',
        muted:        '#9d91b5',
        subtle:       '#6b5f85',
        primary:      '#a78bfa',
        'primary-soft':'#7c3aed',
        'primary-glow':'#c4b5fd',
        front:        '#f9a8d4',
        'front-soft': '#831843',
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
        card:       '0 2px 12px rgba(0,0,0,0.3)',
        glow:       '0 0 20px rgba(167,139,250,0.2)',
        'front-glow':'0 0 24px rgba(249,168,212,0.25)',
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
