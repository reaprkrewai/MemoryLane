/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Chronicle design system tokens (direct CSS variables) */
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        accent: 'var(--color-accent)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        destructive: 'var(--color-destructive)',
        /* shadcn/ui semantic tokens */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      fontSize: {
        label: ['12px', { lineHeight: '1.4' }],
        body: ['14px', { lineHeight: '1.5' }],
        heading: ['20px', { lineHeight: '1.2', fontWeight: '600' }],
        display: ['28px', { lineHeight: '1.15', fontWeight: '600' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        med:  'var(--motion-med)',
        slow: 'var(--motion-slow)',
      },
      transitionTimingFunction: {
        'out-smooth': 'var(--ease-out-smooth)',
        spring:       'var(--ease-spring)',
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '60%':  { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'tag-pop-in': {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to:   { opacity: '1', transform: 'scale(1.0)' },
        },
        'tag-pop-out': {
          from: { opacity: '1', transform: 'scale(1.0)' },
          to:   { opacity: '0', transform: 'scale(0.8)' },
        },
        'mood-spring': {
          '0%':   { transform: 'scale(1.0)' },
          '50%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1.0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1.0)' },
        },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
      },
      animation: {
        'fade-in':  'fade-in var(--motion-med) var(--ease-out-smooth) both',
        'slide-up': 'slide-up var(--motion-med) var(--ease-out-smooth) both',
        'pop-in':   'pop-in var(--motion-med) var(--ease-spring) both',
        'tag-pop-in':  'tag-pop-in 150ms ease-out both',
        'tag-pop-out': 'tag-pop-out 120ms ease-in both',
        'mood-spring': 'mood-spring 120ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'scale-in':    'scale-in 150ms var(--ease-out-smooth) both',
        'fade-out':    'fade-out var(--motion-fast) var(--ease-out-smooth) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
