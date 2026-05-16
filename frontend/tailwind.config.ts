import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        },
      },
      boxShadow: {
        glass: "0 10px 40px rgba(15, 23, 42, 0.12)",
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.15) 1px, transparent 0)",
      },
      fontFamily: {
        sans: ["'Segoe UI Variable'", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
} satisfies Config;

