import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          navy: "#1E3A5F",
          gold: "#C9A84C",
        },
        surface: "#FFFFFF",
        danger: "#DC2626",
        success: "#16A34A",
      },
    },
  },
  plugins: [],
};
export default config;
