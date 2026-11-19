/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--c-base)', surface: 'var(--c-surface)', ink: 'var(--c-text)', muted: 'var(--c-muted)',
        accent: 'var(--c-accent)', s1: 'var(--s-red)', s2: 'var(--s-orange)', s3: 'var(--s-yellow)',
        s4: 'var(--s-green)', s5: 'var(--s-blue)', s6: 'var(--s-violet)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { page: '1240px' },
    },
  },
  plugins: [],
};
