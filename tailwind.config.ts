import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        salvia: { 50: "#f3f6f1", 100: "#e4ebe0", 200: "#c9d7c2", 300: "#a9bea0", 400: "#8ba57f", 500: "#718c66", 600: "#5a7151", 700: "#475a41", 800: "#3a4836", 900: "#2f3b2c" },
        oliva: { 50: "#f5f6ec", 100: "#e8eacf", 200: "#d2d6a2", 300: "#b5bb6e", 400: "#979e48", 500: "#7a8135", 600: "#5f6529", 700: "#4a4f22", 800: "#3d411f", 900: "#33361c" },
        bege: { 50: "#fbf8f2", 100: "#f5eee1", 200: "#ebdcc2", 300: "#dec59c", 400: "#cfab77", 500: "#c4965c" },
        offwhite: "#fbfaf6",
        terra: { 400: "#a07a5a", 500: "#8a6446", 600: "#6f4f37", 700: "#5a402e" },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ["Nunito", "system-ui", "sans-serif"],
      },
      boxShadow: { suave: "0 2px 18px -6px rgba(71, 90, 65, 0.18)" },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
