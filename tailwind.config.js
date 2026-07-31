/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F2F4F7",
        surface: "#FFFFFF",
        ink: "#1B2430",
        muted: "#667085",
        accent: "#2563EB"
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Noto Sans SC", "Microsoft YaHei", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};
