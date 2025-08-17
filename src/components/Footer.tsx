import React from "react";
import Link from "next/link"; // Import the Next.js Link component
import { theme } from "@/styles/theme";

// --- Style Objects for the Footer Component ---

const footerContainerStyle: React.CSSProperties = {
  backgroundColor: theme.colors.subtleBackground,
  color: theme.colors.text,
  fontFamily: theme.typography.bodyFont,
  padding: `${theme.spacing.unit * 6}px ${theme.spacing.unit * 4}px ${
    theme.spacing.unit * 3
  }px`,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: `${theme.spacing.unit * 4}px`,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${theme.spacing.unit * 2}px`,
};

const headingStyle: React.CSSProperties = {
  fontFamily: theme.typography.headingFont,
  fontWeight: "bold",
  fontSize: "1.25rem",
  margin: `0 0 ${theme.spacing.unit}px 0`,
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: `${theme.spacing.unit}px`,
};

const linkStyle: React.CSSProperties = {
  color: theme.colors.accent,
  textDecoration: "none",
  fontFamily: theme.typography.bodyFont,
};

const paragraphStyle: React.CSSProperties = {
  margin: 0,
  lineHeight: theme.typography.lineHeight,
};

const inputStyle: React.CSSProperties = {
  padding: `${theme.spacing.unit}px ${theme.spacing.unit * 2}px`,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.medium,
  // Use cardBackground for inputs so they stand out from the page background
  backgroundColor: theme.colors.cardBackground,
  fontFamily: theme.typography.bodyFont,
  color: theme.colors.text,
  width: "100%",
  boxSizing: "border-box",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: `${theme.spacing.unit}px ${theme.spacing.unit * 2}px`,
  backgroundColor: "transparent",
  border: `2px solid ${theme.colors.accent}`,
  borderRadius: theme.borderRadius.medium,
  color: theme.colors.accent,
  fontFamily: theme.typography.bodyFont,
  fontWeight: "bold",
  cursor: "pointer",
  textAlign: "center",
};

const copyrightStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  textAlign: "center",
  marginTop: `${theme.spacing.unit * 4}px`,
  fontSize: "0.875rem",
  opacity: 0.8,
};

// --- The React Component ---

const Footer: React.FC = () => {
  return (
    <footer style={footerContainerStyle}>
      {/* Column 1: Quick Links */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Quick Links</h3>
        <ul style={listStyle}>
          <li>
            <Link href="/" style={linkStyle}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/cakes" style={linkStyle}>
              Our Cakes
            </Link>
          </li>
          <li>
            <Link href="/about" style={linkStyle}>
              About Us
            </Link>
          </li>
          <li>
            <Link href="/contact" style={linkStyle}>
              Contact
            </Link>
          </li>
        </ul>
      </div>

      {/* Column 2: Contact Info */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Visit Us</h3>
        <p style={paragraphStyle}>
          123 Sweet Street
          <br />
          Calgary, AB T2T 2T2
          <br />
          (403) 555-CAKE
        </p>
      </div>

      {/* Column 3: Newsletter Signup */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Join Our Newsletter</h3>
        <p style={paragraphStyle}>
          Get the latest recipes and offers delivered.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${theme.spacing.unit}px`,
          }}
        >
          <input
            type="email"
            placeholder="your.email@example.com"
            style={inputStyle}
          />
          <button style={secondaryButtonStyle}>Subscribe</button>
        </div>
      </div>

      {/* Full-width bottom row: Copyright */}
      <div style={copyrightStyle}>
        &copy; {new Date().getFullYear()} Homemade Cakes. All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;
