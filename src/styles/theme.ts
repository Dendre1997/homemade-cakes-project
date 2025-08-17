export const theme = {
  colors: {
    // Primary & Backgrounds
    primary: "#231416", // Used for links and buttons.
    background: "#f6dcda", // The main background color for all pages.
    subtleBackground: "#cea3a6", // Used for the header, footer, and sidebar. // Accents & Text

    accent: "#2f1b23", // Used for icons, sale tags, and secondary buttons.
    text: "#764a4d", // The default color for all text (headings, paragraphs, etc.).
    textOnPrimary: "#faded2", // Used exclusively for text on a 'primary' color background. // UI Elements

    border: "#A39E9A", // Used for input fields, cards, and dividers.
    cardBackground: "#eebbbb", // The background for all types of cards.
  },
  typography: {
    headingFont: "'Playfair Display', serif", // Rule 2: Elegant Serif for headings.
    bodyFont: "'Montserrat', sans-serif", // Rule 2: Clean Sans-Serif for body/UI text.
    lineHeight: 1.6, // Rule 2: Ample line spacing.
  },
  spacing: {
    unit: 8, // Rule 3: Base unit for all spacing is 8px.
  },
  borderRadius: {
    medium: "8px", // Rule 4: For buttons and input fields.
    large: "16px", // Rule 4: For larger components like product cards.
  },
};
