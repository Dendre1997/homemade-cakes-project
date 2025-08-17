"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store/cartStore";
import { ShoppingBasket, ShoppingBasketIcon } from "lucide-react";
import { theme } from "../styles/theme"; // Adjust this import path as needed

// --- Style Objects for the Header Component ---
// Each object uses the imported `theme` to apply the design rules.

const headerStyle: React.CSSProperties = {
  backgroundColor: theme.colors.subtleBackground, // Rule 1
  position: "sticky",
  top: 0,
  zIndex: 50,
  boxShadow: "0 2px 4px 0 rgba(74, 68, 63, 0.05)", // Subtle shadow
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1152px",
  margin: "0 auto",
  padding: `0 ${theme.spacing.unit * 2}px`, // Rule 3: Spacing
};

const flexContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: `${theme.spacing.unit * 10}px`, // 80px, Rule 3
};

const logoStyle: React.CSSProperties = {
  fontFamily: theme.typography.headingFont, // Rule 2: Serif for logo
  fontSize: "1.5rem",
  fontWeight: "bold",
  color: theme.colors.primary, // Rule 1
  textDecoration: "none",
};

const navListStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: `${theme.spacing.unit * 4}px`, // 32px, Rule 3
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const navLinkBaseStyle: React.CSSProperties = {
  fontFamily: theme.typography.bodyFont, // Rule 2: Sans-Serif for UI text
  fontSize: "1rem",
  fontWeight: 600, // semibold
  letterSpacing: "0.025em",
  textDecoration: "none",
  transition: "color 0.2s ease-in-out",
};

const navLinkDefaultStyle: React.CSSProperties = {
  ...navLinkBaseStyle,
  color: theme.colors.text, // Rule 1: Main text color
};

const navLinkActiveStyle: React.CSSProperties = {
  ...navLinkBaseStyle,
  color: theme.colors.accent, // Rule 1: Muted Blue for active/important links
};

const cartIconStyle: React.CSSProperties = {
  height: "24px",
  width: "24px",
  color: theme.colors.text,
};

const cartBadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: "-8px",
  right: "-8px",
  display: "flex",
  height: "20px",
  width: "20px",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "9999px",
  backgroundColor: theme.colors.subtleBackground, // Rule 1
  fontSize: "0.75rem",
  fontWeight: "bold",
  color: theme.colors.text, // Using main text for high contrast on pink
};

// --- The React Component ---

const Header = () => {
  const items = useCartStore((state) => state.items);
  const itemCount = items.length;

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <div style={flexContainerStyle}>
          {/* Left: Logo */}
          <div>
            <Link href="/" style={logoStyle}>
              Homemade Cakes
            </Link>
          </div>

          {/* Center: Navigation */}
          {/* Note: The 'hidden md:flex' is best handled with CSS media queries. */}
          {/* This is a simplified representation. */}
          <nav className="hidden md:flex">
            <ul style={navListStyle}>
              <li>
                <Link href="/" style={navLinkDefaultStyle}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" style={navLinkActiveStyle}>
                  Catalog
                </Link>
              </li>
              <li>
                <Link href="/about" style={navLinkDefaultStyle}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/testimonials" style={navLinkDefaultStyle}>
                  Testimonials
                </Link>
              </li>
              <li>
                <Link href="/contact" style={navLinkDefaultStyle}>
                  Contact
                </Link>
              </li>
            </ul>
          </nav>

          {/* Right: Cart Icon */}
          <div style={{ position: "relative" }}>
            <Link
              href="/cart"
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative", // make parent relative
                padding: `${theme.spacing.unit}px`,
                color: theme.colors.text,
              }}
            >
              <ShoppingBasketIcon style={cartIconStyle} aria-hidden="true" />

              {itemCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px", // move a bit above
                    right: "-5px", // align to right of icon
                    backgroundColor: "red",
                    color: "white",
                    borderRadius: "50%",
                    padding: "2px 6px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    lineHeight: "1",
                  }}
                >
                  {itemCount}
                </span>
              )}

              <span className="sr-only">items in cart, view bag</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;