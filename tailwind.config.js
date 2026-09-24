/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#11201d",
          secondary: "#273733",
        },
        paper: {
          DEFAULT: "#f4f6f0",
          subtle: "#e9ede5",
        },
        coral: {
          DEFAULT: "#e2543b",
          hover: "#c9442c",
          light: "#fbeee9",
        },
        emerald: {
          DEFAULT: "#1e5a48",
          light: "#e6f2ee",
        }
      },
    },
  },
  plugins: [],
};
