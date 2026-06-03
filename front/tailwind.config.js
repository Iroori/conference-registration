/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0D1B3E',
          hover: '#162856',
        },
        gold: {
          DEFAULT: '#C9A84C',
          hover: '#B89339',
          soft: '#C9A84C22',
          tint: '#C9A84C0F',
        },
        cream: '#FAFAF8',
        ink: {
          DEFAULT: '#0D1B3E',
          muted: '#6B6B7A',
          faint: '#A0A0AD',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Noto Sans KR',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
