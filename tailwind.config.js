/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sand: '#f6efe3',
        ink: '#020617',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 24px 80px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
}
