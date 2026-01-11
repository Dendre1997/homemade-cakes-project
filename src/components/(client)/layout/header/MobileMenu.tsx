"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, LogOut, UserCircle, Phone, PencilRuler } from "lucide-react";
import { User, Collection } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import SearchInput from "./SearchInput";
import HeaderLogo from "@/components/ui/HeaderLogo";
import { useActiveSeasonal } from "@/hooks/useActiveSeasonal";
import { Sparkles, ArrowRight } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { name: string; href: string }[];
  secondaryLinks: { name: string; href: string; icon: React.ElementType }[];
  user: User | null;
  handleLogout: () => void;
}

const MobileMenu = ({
  isOpen,
  onClose,
  categories,
  secondaryLinks,
  user,
  handleLogout,
}: MobileMenuProps) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { activeEvent } = useActiveSeasonal();
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch("/api/collections");
        if (res.ok) {
          setCollections(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch collections:", error);
      }
    };
    fetchCollections();
  }, []);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "auto";
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed top-0 left-0 h-full w-full max-w-sm bg-background flex flex-col z-50 transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative flex items-center justify-between p-md border-b border-border h-16">
          {/* Left: Search Input */}
          <div className="z-10">
            <SearchInput
              onExpandChange={setIsSearchExpanded}
              className={cn(
                "flex",
                isSearchExpanded ? "w-[70vw] sm:w-80" : "w-10"
              )}
            />
          </div>

          <div
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out",
              isSearchExpanded
                ? "opacity-0 scale-90 pointer-events-none"
                : "opacity-100 scale-100"
            )}
          >
            <HeaderLogo />
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="shrink-0 z-10 p-2 rounded-full hover:bg-subtleBackground transition-colors"
          >
            <X className="h-6 w-6 text-primary" />
          </button>
        </div>
        <nav className="flex-grow overflow-y-auto p-lg">
          <ul className="flex flex-col w-full space-y-md">
            <li className="w-full">
              <Link
                href={`/products`}
                onClick={onClose}
                className="text-md text-primary hover:text-accent hover:bg-subtleBackground text-center rounded p-2 transition-colors truncate font-bold"
              >
                Full Menu
              </Link>
            </li>
            {activeEvent && (
              <li className="w-full">
                <Link
                  href={`/specials/${activeEvent.slug}`}
                  onClick={onClose}
                  className="block w-full rounded-medium p-md bg-gradient-to-r from-accent/20 to-transparent border border-accent/20"
                >
                  <div className="flex items-center gap-sm mb-1 text-accent font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>{activeEvent.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-primary font-heading text-lg">
                    <span>Shop Specials</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </li>
            )}

            <li>
              <p className="text-sm font-bold text-primary/50 uppercase tracking-wider mb-2 px-md">
                Categories
              </p>
              <ul className="flex flex-col w-full">
                {categories.map((link) => (
                  <li key={link.href} className="w-full">
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="block w-full rounded-medium p-md font-heading text-xl text-primary hover:bg-subtleBackground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            {/* Collections */}
            {collections.length > 0 && (
              <li>
                <p className="text-sm font-bold text-primary/50 uppercase tracking-wider mb-2 px-md mt-4">
                  Collections
                </p>
                <ul className="flex flex-col w-full">
                  {collections.map((col) => (
                    <li key={col._id.toString()} className="w-full">
                      <Link
                        href={`/products/collections/${col.slug}`}
                        onClick={onClose}
                        className="block w-full rounded-medium p-md font-heading text-xl text-primary hover:bg-subtleBackground transition-colors"
                      >
                        {col.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
          <hr className="w-full my-lg border-border" />
          <ul className="flex flex-col w-full">
            {secondaryLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href} className="w-full">
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-primary hover:bg-subtleBackground transition-colors"
                  >
                    <Icon className="h-5 w-5 text-primary/80" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              );
            })}
            {user ? (
              <li className="w-full">
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-primary hover:bg-subtleBackground transition-colors"
                >
                  <UserCircle className="h-5 w-5 text-primary/80" />
                  <span>Profile</span>
                </Link>
              </li>
            ) : (
              <li className="w-full">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-primary hover:bg-subtleBackground transition-colors"
                >
                  <UserCircle className="h-5 w-5 text-primary/80" />
                  <span>Login</span>
                </Link>
              </li>
            )}
            {user && (
              <li className="w-full">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-error hover:bg-error/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </li>
            )}
          </ul>
          <div className="mt-xl">
            <Link href="/custom-order" onClick={onClose}>
              <Button variant="secondary" className="w-full">
                <PencilRuler className="h-4 w-4 mr-sm" />
                Create a Custom Cake
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
};

export default MobileMenu;
