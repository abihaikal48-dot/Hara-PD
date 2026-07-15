/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hara: {
          red: '#C0392B',
          redDark: '#8E2A1F',
          yellow: '#F4B400',
          bg: '#F6F5F3',
          card: '#FFFFFF',
          ink: '#1E1E1E',
          border: '#E7E3DE',
          muted: '#8A8580',
          ok: '#2E7D32',
          warn: '#C77700',
          bad: '#C0392B'
        }
      },
      borderRadius: {
        'large': '14px',
        'xlarge': '20px'
      }
    },
  },
  plugins: [],
}
