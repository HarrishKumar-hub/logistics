import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pearl: "#FDFCF0",       // The vast white background
        steel: "#2C3539",       // Deep gray for primary text and sidebars
        gold: {
          DEFAULT: "#D4AF37",   // Industrial Gold for primary buttons
          hover: "#B5952F",     // Slightly darker gold for hover states
        },
        surface: "#FFFFFF",     // Pure white for data cards
        border: "#E5E7EB",      // Light gray for clean table lines
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Clean, banking-style typography
      }
    },
  },
  plugins: [],
};
export default config;
