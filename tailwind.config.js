/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#334155',
        'primary-dark': '#1e293b',
        accent: '#0891B2',
        background: '#FFFFFF',
        foreground: '#0F172A',
        muted: '#F1F5F9',
        'muted-foreground': '#64748B',
        border: '#E2E8F0',
        secondary: '#475569',
        success: '#16A34A',
        destructive: '#DC2626',
        warning: '#D97706',
      },
      fontFamily: {
        sans: ['AlibabaSansTC', 'PingFang SC', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 6px -1px rgba(0,0,0,0.07)',
      },
      maxWidth: {
        mobile: '520px',
      },
    },
  },
  plugins: [],
}
