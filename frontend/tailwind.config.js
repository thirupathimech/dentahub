/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#183b42',
        muted: '#70858a',
        teal: {
          50: '#eefafa',
          100: '#d8f3f3',
          500: '#149ca5',
          600: '#087f8c',
          700: '#06656e',
        },
        coral: '#f17868',
        cream: '#f6fbfb',
      },
      boxShadow: {
        soft: '0 12px 30px rgba(24, 59, 66, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
