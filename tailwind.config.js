/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4A2E2C",
        background: "#F5F2ED",
        subtleBackground: "#D1B4A9",
        accent: "#C58C5F",
        "text-main": "#4A2E2C",
        "text-on-primary": "#FFFFFF",
        border: "#EAE2D8",
        "card-background": "#FFFFFF",

        success: "#6A8B6E",
        error: "#C95B5B",
      },

      fontFamily: {
        heading: ["Appleberry", "serif"],
        body: ["Existence Light", "sans-serif"],
      },

      borderRadius: {
        medium: "8px",
        large: "16px",
        small: "4px",
      },

      fontSize: {
        h1: ["2.75rem", { lineHeight: "1.2" }], // 44px
        h2: ["2rem", { lineHeight: "1.2" }], // 32px
        h3: ["1.5rem", { lineHeight: "1.3" }], // 24px
        body: ["1rem", { lineHeight: "1.6" }], // 16px
        small: ["0.875rem", { lineHeight: "1.5" }], // 14px
      },

      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },

      boxShadow: {
        md: "0px 4px 12px rgba(74, 46, 44, 0.08)",
        lg: "0px 8px 16px rgba(74, 46, 44, 0.12)",
      },
      animation: {
        marquee: "marquee 25s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};
