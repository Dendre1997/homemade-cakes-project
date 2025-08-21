import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { theme } from "@/styles/theme";

// --- Style Objects for Components & Sections ---

// Card Styles
const cardBaseStyle: React.CSSProperties = {
  backgroundColor: theme.colors.cardBackground,
  borderRadius: theme.borderRadius.large, // Rule 4: large rounded corners
  padding: `${theme.spacing.unit * 3}px`,
  boxShadow: "0 4px 12px rgba(74, 68, 63, 0.08)", // Rule 4: subtle, soft shadow
  textAlign: "center",
};

const placeholderImageStyle: React.CSSProperties = {
  width: "100%",
  height: "192px",
  backgroundColor: "#EAE6DA", // A light version of the cream background
  borderRadius: theme.borderRadius.medium,
  marginBottom: `${theme.spacing.unit * 2}px`,
};

// Button Styles
const primaryButtonStyle: React.CSSProperties = {
  padding: `${theme.spacing.unit * 1.5}px ${theme.spacing.unit * 4}px`,
  backgroundColor: theme.colors.primary, // Rule 1
  color: theme.colors.textOnPrimary, // Rule 1
  fontFamily: theme.typography.bodyFont,
  fontSize: "1rem",
  fontWeight: 600,
  letterSpacing: "0.025em",
  borderRadius: theme.borderRadius.medium, // Rule 4
  border: "none",
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: `${theme.spacing.unit * 1.5}px ${theme.spacing.unit * 4}px`,
  backgroundColor: "transparent",
  border: `2px solid ${theme.colors.accent}`, // Rule 4
  color: theme.colors.accent, // Rule 4
  fontFamily: theme.typography.bodyFont,
  fontSize: "1rem",
  fontWeight: 600,
  letterSpacing: "0.025em",
  borderRadius: theme.borderRadius.medium, // Rule 4
  cursor: "pointer",
  transition: "background-color 0.2s, color 0.2s",
};

// Section Styles
const sectionStyle: React.CSSProperties = {
  width: "100%",
  padding: `${theme.spacing.unit * 12}px 0`,
};

const sectionContainerStyle: React.CSSProperties = {
  maxWidth: "1152px",
  margin: "0 auto",
  padding: `0 ${theme.spacing.unit * 2}px`,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: theme.typography.headingFont,
  fontSize: "2.5rem", // text-4xl
  fontWeight: "bold",
  textAlign: "center",
  color: theme.colors.text,
  marginBottom: `${theme.spacing.unit * 8}px`,
};

const gridContainerStyle: React.CSSProperties = {
  display: "grid",
  gap: `${theme.spacing.unit * 4}px`,
  // A responsive grid that works on all screen sizes
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
};

// --- Helper Components (Refactored) ---

const ProductCardPlaceholder = ({ name }: { name: string }) => (
  <div style={cardBaseStyle}>
    <div style={placeholderImageStyle}></div>
    <h4
      style={{
        fontFamily: theme.typography.headingFont,
        fontSize: "1.25rem",
        fontWeight: 600,
        color: theme.colors.text,
      }}
    >
      {name}
    </h4>
    <p
      style={{
        color: theme.colors.primary,
        fontWeight: "bold",
        marginTop: theme.spacing.unit,
      }}
    >
      $25.00
    </p>
  </div>
);

const TestimonialCardPlaceholder = ({ author }: { author: string }) => (
  <div style={{ ...cardBaseStyle, textAlign: "left" }}>
    <p
      style={{
        fontFamily: theme.typography.bodyFont,
        lineHeight: theme.typography.lineHeight,
        color: theme.colors.text,
        fontStyle: "italic",
      }}
    >
      This was the most delicious cake I have ever had! Truly homemade quality
      and exceptional service. Highly recommended!
    </p>
    <p
      style={{
        fontFamily: theme.typography.bodyFont,
        fontWeight: 600,
        color: theme.colors.text,
        marginTop: theme.spacing.unit * 2,
      }}
    >
      - {author}
    </p>
  </div>
);

// --- Homepage Component (Refactored) ---

const Homepage: NextPage = () => {
  return (
    <div style={{ backgroundColor: theme.colors.background }}>
      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: theme.colors.textOnPrimary,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.25)",
            zIndex: 10,
          }}
        ></div>
        <Image
          src="/placeholderw.jpg"
          alt="Signature homemade cake"
          fill
          style={{ objectFit: "cover" }}
          // quality={85}
          sizes="100vw"
          priority
        />
        <div
          style={{
            position: "relative",
            zIndex: 20,
            padding: `0 ${theme.spacing.unit * 2}px`,
          }}
        >
          <h1
            style={{
              fontFamily: theme.typography.headingFont,
              fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
              fontWeight: "bold",
            }}
          >
            The Taste of Home, Baked Fresh For You
          </h1>
          <h3
            style={{
              fontFamily: theme.typography.bodyFont,
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: 400,
              marginTop: theme.spacing.unit * 2,
            }}
          >
            Discover cakes made with passion and the finest ingredients.
          </h3>
          <button
            style={{ ...primaryButtonStyle, marginTop: theme.spacing.unit * 8 }}
          >
            Explore The Menu
          </button>
        </div>
      </section>

      {/* Featured Products Section */}
      <section
        style={{
          ...sectionStyle,
          backgroundColor: theme.colors.background,
        }}
      >
        <div style={sectionContainerStyle}>
          <h2 style={sectionHeadingStyle}>Our Customer Favorites</h2>
          <div style={gridContainerStyle}>
            <ProductCardPlaceholder name="Classic Chocolate Fudge" />
            <ProductCardPlaceholder name="Red Velvet Dream" />
            <ProductCardPlaceholder name="Lemon Zest Delight" />
            <ProductCardPlaceholder name="Strawberry Shortcake" />
          </div>
        </div>
      </section>

      {/* "Our Mission" Section */}
      <section
        style={{ ...sectionStyle, backgroundColor: theme.colors.background }}
      >
        <div style={sectionContainerStyle}>
          <div
            style={{
              ...gridContainerStyle,
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "384px",
                borderRadius: theme.borderRadius.large,
                overflow: "hidden",
              }}
            >
              <Image
                src="/placeholder.png"
                alt="Baking process"
                fill
                style={{ objectFit: "cover" }}
                sizes="100vw"
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <h3
                style={{
                  fontFamily: theme.typography.headingFont,
                  fontSize: "2rem",
                  fontWeight: 600,
                  color: theme.colors.text,
                }}
              >
                Crafted With Love & The Finest Ingredients
              </h3>
              <p
                style={{
                  fontFamily: theme.typography.bodyFont,
                  lineHeight: theme.typography.lineHeight,
                  color: theme.colors.text,
                  marginTop: theme.spacing.unit * 2,
                }}
              >
                At Homemade Cakes, every creation is a piece of our heart. We
                believe in the magic of traditional baking, using only
                locally-sourced, high-quality ingredients to ensure every bite
                is a moment of pure joy.
              </p>
              <button
                style={{
                  ...secondaryButtonStyle,
                  marginTop: theme.spacing.unit * 4,
                }}
              >
                Learn Our Story
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        style={{
          ...sectionStyle,
          backgroundColor: theme.colors.background,
        }}
      >
        <div style={sectionContainerStyle}>
          <h2 style={sectionHeadingStyle}>Sweet Words From Our Customers</h2>
          <div style={gridContainerStyle}>
            <TestimonialCardPlaceholder author="Jane D." />
            <TestimonialCardPlaceholder author="Mark T." />
            <TestimonialCardPlaceholder author="Sarah L." />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
