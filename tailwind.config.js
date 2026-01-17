/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        boon: {
          blue: '#466FF6',
          darkBlue: '#3558D4',
          lightBlue: '#E8EDFE',
          coral: '#FF6B6B',
          lightCoral: '#FFE8E8',
          darkCoral: '#E55555',
          bg: '#F8F9FC',
          text: '#1A1F36',
          amber: '#F59E0B',
          amberLight: '#FEF3C7',
          amberDark: '#D97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
