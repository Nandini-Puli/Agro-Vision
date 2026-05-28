/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#050c08',
        cardBg: 'rgba(10, 25, 17, 0.65)',
        plantGreen: '#0f766e',
        neonGreen: '#10b981',
        neonGreenGlow: '#34d399',
      },
      boxShadow: {
        neon: '0 0 15px rgba(16, 185, 129, 0.35)',
        neonStrong: '0 0 25px rgba(16, 185, 129, 0.55)',
        neonBlue: '0 0 15px rgba(14, 165, 233, 0.35)',
        neonRed: '0 0 15px rgba(239, 68, 68, 0.35)',
      },
      backgroundImage: {
        'hero-pattern': "url('https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?q=80&w=2070&auto=format&fit=crop')",
      }
    },
  },
  plugins: [],
}
