/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {

      colors: {
        primary: "#231416",
        background: "#f6dcda",
        subtleBackground: "#cea3a6",
        accent: "#2f1b23",
        "text-main": "#764a4d",
        "text-on-primary": "#faded2",
        border: "#A39E9A",
        "card-background": "#eebbbb",
      },

      fontFamily: {
        heading: ["var(--font-playfair)", "serif"],
        body: ["var(--font-montserrat)", "sans-serif"],
      },

      borderRadius: {
        medium: "8px",
        large: "16px",
      },
    },
  },
  plugins: [],
};
