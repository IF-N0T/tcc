import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const ramp = (prefix: string, keys: number[]) => Object.fromEntries(keys.map((k) => [k, v(`${prefix}-${k}`)]));

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Cor de destaque configurável pelo usuário (variáveis CSS em globals.css).
        brand: ramp("brand", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        ink: { 900: v("ink-900"), 800: v("ink-800"), 700: v("ink-700") },
        app: { page: v("page"), surface: v("surface"), muted: v("surface-muted"), border: v("border"), text: v("text"), soft: v("text-muted") }
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', "system-ui", "-apple-system", "Roboto", "Arial", "sans-serif"],
        display: ['"Iowan Old Style"', '"Palatino Linotype"', "Palatino", '"Book Antiqua"', "Georgia", "serif"],
        mono: ['"Cascadia Mono"', "ui-monospace", "SFMono-Regular", "Consolas", "monospace"]
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "none" } },
        pulseRing: { "0%": { boxShadow: "0 0 0 0 rgb(34 197 94 / .55)" }, "70%": { boxShadow: "0 0 0 7px rgb(34 197 94 / 0)" }, "100%": { boxShadow: "0 0 0 0 rgb(34 197 94 / 0)" } }
      },
      animation: { rise: "rise .35s ease both", pulseRing: "pulseRing 2s infinite" }
    }
  },
  plugins: []
};
export default config;
