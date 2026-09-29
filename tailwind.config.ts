import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fbf5e8",
          100: "#f4e7c9",
          200: "#e8d19c",
          300: "#d8b96e",
          400: "#c9a24e",
          500: "#b98d36",
          600: "#9b702b",
          700: "#795526",
          800: "#604322",
          900: "#4f391f",
          950: "#2d2116"
        },
        ink: {
          900: "#171512",
          800: "#211d19",
          700: "#302923"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Inter", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};
export default config;
