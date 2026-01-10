/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jake: {
          blue: '#29B6F6',
          dark: '#0a0a0a',
        }
      }
    },
  },
  plugins: [],
}