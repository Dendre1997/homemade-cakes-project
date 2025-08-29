"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/store/cartStore";
import { ShoppingBasket, ShoppingBasketIcon, User, LogOut } from "lucide-react";
import { theme } from "@/styles/theme";
import { useAuthStore } from "@/lib/store/authStore";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import  SidebarToggleButton from '@/components/SidebarToggleButton'

const headerStyle: React.CSSProperties = {
  backgroundColor: theme.colors.accent, // Rule 1
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

interface HeaderProps {
  onToggleSidebar: () => void;
}
// --- The React Component ---

const HeaderAdmin = ({ onToggleSidebar }: HeaderProps) => {
  const items = useCartStore((state) => state.items);
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const itemCount = items.length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // alert("You have been logged out.");
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to log out.");
    }
  };

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <div style={flexContainerStyle}>
          <SidebarToggleButton onClick={onToggleSidebar} />
          {/* Left: Logo */}
          <div>
            <Link href="/" className="text-3xl font-bold mb-6 font-heading">
              BACKER PLACE
            </Link>
          </div>

          <nav className="hidden md:flex">
            <ul style={navListStyle}>
              <li>
                <Link href="/" style={navLinkDefaultStyle}>
                  To Client Page
                </Link>
              </li>
              <li>
                <Link href="/admin/orders" style={navLinkDefaultStyle}>
                  Orders
                </Link>
              </li>
              <li>
                <Link href="/admin/products/create" style={navLinkDefaultStyle}>
                  Create
                </Link>
              </li>
            </ul>
          </nav>

          {/* User */}

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-6 w-24 bg-gray-200 animate-pulse rounded-md"></div>
            ) : user ? (
              <>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <User style={navLinkDefaultStyle} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <LogOut style={navLinkDefaultStyle} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" style={navLinkDefaultStyle}>
                  Login
                </Link>
                {/* <Link
                  href="/register"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign Up
                </Link> */}
              </>
            )}
          </div>

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

export default HeaderAdmin;
