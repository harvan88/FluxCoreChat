/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'typing-pulse': 'typingPulse 1.5s infinite',
        'recording-pulse': 'recordingPulse 2s infinite'
      },
      keyframes: {
        typingPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' }
        },
        recordingPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        }
      }
    }
  },
  plugins: [],
};
