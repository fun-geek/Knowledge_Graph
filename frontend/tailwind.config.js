/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0B12",
        surface: "#14131D",
        surfaceHover: "#1C1A28",
        borderDark: "#2A2638",
        primaryPurple: "#6F2982",
        aiBlue: "#2B3AF3",
        memberCoral: "#FF7071",
        policyRed: "#E84855",
        projectBronze: "#B56B45",
        textMain: "#F5F3F7",
        textMuted: "#A8A3B2",
        domainPurple: "#8E44AD"
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace', 'ui-monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(111, 41, 130, 0.4), 0 0 10px rgba(43, 58, 243, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(111, 41, 130, 0.8), 0 0 25px rgba(43, 58, 243, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
