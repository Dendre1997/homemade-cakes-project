"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authStore";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import dynamic from "next/dynamic";
import {
  ShoppingBasket,
  User,
  LogOut,
  Menu,
  Phone,
  ChevronDown,
  ChevronUp,
  Newspaper,
  PencilRuler,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCategory } from "@/types";
import HeaderLogo from '@/components/ui/HeaderLogo'
import SeasonalHeaderBar from "./SeasonalHeaderBar";
import OfferBar from "./OfferBar";
import CategoryNav from "./CategoryNav";
import CollectionNav from "./CollectionNav";
import SearchInput from "./SearchInput";
import { CatalogDropdown } from "./CatalogDropdown";

// Lazy-load off-screen components — never visible on initial paint.
// This removes ~15KB from the critical JS bundle, reducing main thread work.
const MobileMenu = dynamic(() => import("./MobileMenu"), { ssr: false });
const MiniCart = dynamic(
  () => import("./MiniCart").then((m) => ({ default: m.MiniCart })),
  { ssr: false }
);


interface HeaderProps {
  categories: ProductCategory[];
}
import { Button } from "@/components/ui/Button";


const Header = ({ categories }: HeaderProps) => {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { items, isMiniCartOpen, closeMiniCart } = useCartStore();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  
  const pathname = usePathname();


  const [isAtTop, setIsAtTop] = useState(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const atTop = currentScrollY < 10;
      
      setIsAtTop(atTop);
      

      if (atTop) {
        setIsOverlayOpen(false);
      }
    };


    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navCategories = categories.map((cat) => ({
    name: cat.name,
    href: `/products/category/${cat.slug}`,
    imageUrl: cat.imageUrl
  }));

  const shouldShowCollectionsNav =
    pathname === "/products" ||
    pathname.startsWith("/products/category/") ||
    pathname.startsWith("/products/collections/");

  const secondaryLinks = [
    { name: "Contact", href: "/contact", icon: MessageSquare },
    { name: "Blog", href: "/blog", icon: BookOpen },
  ];

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-opacity duration-300",
          !isAtTop ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          onClick={() => setIsOverlayOpen(!isOverlayOpen)}
          className="pointer-events-auto mt-2 flex h-8 w-12 items-center justify-center rounded-b-lg bg-white/90 shadow-md backdrop-blur-sm hover:bg-white transition-colors"
          aria-label={isOverlayOpen ? "Hide Header" : "Show Header"}
        >
          {isOverlayOpen ? (
            <ChevronUp className="h-5 w-5 text-primary animate-bounce" />
          ) : (
            <ChevronDown className="h-5 w-5 text-primary animate-bounce" />
          )}
        </button>
      </div>
      <header
        className={cn(
          "transition-all duration-500 ease-in-out z-40 w-full",
          isAtTop && "relative translate-y-0 opacity-100",
          !isAtTop && "fixed top-0 left-0 right-0 shadow-md",
          !isAtTop && !isOverlayOpen && "-translate-y-full opacity-0",
          !isAtTop && isOverlayOpen && "translate-y-0 opacity-100",
        )}
      >
        <div className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
          <SeasonalHeaderBar />

          {/* Custom Orders Only Notice Banner */}
          {pathname !== "/custom-order" && (
  <div className="bg-accent/10 border-b border-accent/20 px-4 py-2.5 animate-in fade-in duration-500">
    <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1.5">
      
      {/* Status badge + message */}
      <div className="flex items-center text-center gap-2.5">
        <p className="text-lg font-medium text-accent/90 leading-snug">
         We’re currently accepting{" "}
          <span className="font-semibold text-accent">custom requests only</span>{" "}
          while we improve our production process.
        </p>
      </div>

      {/* Divider (desktop) */}
      <span className="hidden sm:block w-px h-4 bg-accent/30 shrink-0" />

      {/* CTA */}
      <Link
        href="/custom-order"
        className="group inline-flex items-center gap-1.5 text-lg font-semibold text-accent hover:text-accent/75 transition-colors shrink-0"
      >
        Make a Custom Request
        <ArrowRight className="w-3.5 h-3.5 animate-arrow-wiggle shrink-0" />
        <style>{`
          @keyframes arrow-wiggle {
            0%, 100% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(4px);
            }
          }
          .animate-arrow-wiggle {
            animation: arrow-wiggle 1.2s ease-in-out infinite !important;
          }
        `}</style>
      </Link>

    </div>
  </div>
)}

          <OfferBar />
          <MiniCart isOpen={isMiniCartOpen} onClose={closeMiniCart} />

          <div className="mx-auto max-w-7xl px-lg">
            <div className="relative flex h-20 items-center justify-between">
              <div className="flex items-center gap-md">
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6 text-primary" />
                </button>
                <div className="hidden md:block">
                  <Link
                    href="/"
                    className="font-heading text-h3 text-primary"
                  ></Link>
                </div>
                <div className="flex items-center gap-md justify-end">
                  <SearchInput
                    onExpandChange={setIsSearchExpanded}
                    className="hidden md:flex"
                  />
                  <div
                    className={cn(
                      "hidden md:flex items-center gap-md transition-all duration-300 ease-in-out overflow-hidden",
                      isSearchExpanded
                        ? "w-0 opacity-0 translate-x-4"
                        : "w-auto opacity-100 translate-x-0",
                    )}
                  >
                    <Link
                      href="/contact"
                      className="flex items-center gap-sm font-body text-body text-primary hover:text-accent whitespace-nowrap"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Contact</span>
                    </Link>
                  </div>
                  <div
                    className={cn(
                      "hidden md:flex items-center gap-md transition-all duration-300 ease-in-out overflow-hidden",
                      isSearchExpanded
                        ? "w-0 opacity-0 translate-x-4"
                        : "w-auto opacity-100 translate-x-0",
                    )}
                  >
                    <Link
                      href="/blog"
                      className="flex items-center gap-sm font-body text-body text-primary hover:text-accent whitespace-nowrap"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Blog</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex-none flex justify-center items-center">
                <div className="w-40  lg:w-48">
                  <HeaderLogo size="70%" />
                </div>
              </div>
              <div className="flex items-center gap-md justify-end">
                <div className="hidden md:block">
                  <CatalogDropdown categories={navCategories} />
                </div>

                <div className="hidden md:flex items-center gap-md">
                  {isLoading ? (
                    <div className="h-6 w-16 rounded-medium bg-border animate-pulse"></div>
                  ) : user ? (
                    <>
                      <Link href="/profile" aria-label="Profile">
                        <User className="h-6 w-6 text-primary hover:text-accent" />
                      </Link>
                      <button onClick={handleLogout} aria-label="Logout">
                        <LogOut className="h-6 w-6 text-primary hover:text-accent" />
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="font-body text-body text-primary hover:text-accent"
                    >
                      Login
                    </Link>
                  )}
                </div>

                <Link
                  href="/cart"
                  className="relative"
                  aria-label={`Cart with ${itemCount} items`}
                >
                  <ShoppingBasket className="h-6 w-6 text-primary" />
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-small font-bold text-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
          {shouldShowCollectionsNav && (
            <>
              <CategoryNav categories={navCategories} />
              <CollectionNav />
            </>
          )}
        </div>
      </header>

      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={navCategories}
        secondaryLinks={secondaryLinks}
        user={user}
        handleLogout={handleLogout}
      />
    </>
  );
};

export default Header;
