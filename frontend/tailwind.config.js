/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#060D1F',
          900: '#0F172A',
          800: '#1E293B',
          700: '#263348',
          600: '#334155',
        },
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.15) 0%, transparent 70%)',
      },
      backgroundSize: { grid: '40px 40px' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
