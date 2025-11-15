"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authStore";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import {
  ShoppingBasket,
  UserCircle,
  User,
  LogOut,
  Menu,
  Phone,
  X,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCategory } from "@/types";

// Import your sub-components
import OfferBar from "./OfferBar";
import CategoryNav from "./CategoryNav";
import MobileMenu from "./MobileMenu";
import { MiniCart } from "./MiniCart";
import CollectionNav from "./CollectionNav";
interface HeaderProps {
  categories: ProductCategory[];
}

const Header = ({ categories }: HeaderProps) => {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { items, isMiniCartOpen, closeMiniCart } = useCartStore();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const navCategories = categories.map((cat) => ({
    name: cat.name,
    href: `/products/category/${cat.slug}`,
  }));

  const secondaryLinks = [
    { name: "About Me", href: "/about", icon: UserCircle },
    { name: "Contact", href: "/contact", icon: Phone },
  ];

  return (
    <header className="relative sticky top-0 z-50 bg-background shadow-sm">
      <OfferBar />

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
                className="group relative block shrink-0 transition-transform duration-200 hover:scale-110"
              >
                <Image
                  alt="logo-main"
                  src="/MainLogoDescktop.png"
                  width={200}
                  height={112}
                  quality={100}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="inline-flex items-center justify-center w-[65px] h-[65px] rounded-full font-heading text-lg bg-subtleBackground text-center  translate-x-1 translate-y-[52px]">
                    Home <br />
                    Page
                  </span>
                </div>
              </Link>
            </div>
            <div className="hidden md:block">
              <Link
                href="/"
                className="font-heading text-h3 text-primary"
              ></Link>
            </div>

            <div className="hidden md:flex items-center gap-md">
              <Link
                href="/contact"
                className="flex items-center gap-sm font-body text-body text-primary hover:text-accent"
              >
                <Phone className="h-4 w-4" />
                <span>Contact</span>
              </Link>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
            <Link href="/" className="shrink-0">
              <span className="font-heading text-h3 text-primary">
                {" "}
                HomeMadeCakes
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-md justify-end">
            <Link
              href="/about"
              className="hidden lg:block font-body text-body text-primary hover:text-accent"
            >
              About Me
            </Link>

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

      <CategoryNav categories={navCategories} />
      <CollectionNav />
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={navCategories}
        secondaryLinks={secondaryLinks}
        user={user}
        handleLogout={handleLogout}
      />
      <MiniCart isOpen={isMiniCartOpen} onClose={closeMiniCart} />
    </header>
  );
};

export default Header;
