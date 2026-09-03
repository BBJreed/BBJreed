import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12141c",
        paper: "#f7f7f5",
        accent: "#4f46e5",
      },
    },
  },
  plugins: [],
};

export default config;
