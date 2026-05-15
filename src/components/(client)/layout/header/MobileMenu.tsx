"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  X,
  LogOut,
  UserCircle,
  Phone,
  MessageSquare,
  ShieldCheck,
  Menu,
  WandSparkles,
  GalleryHorizontalEnd,
  Crown,
} from "lucide-react";
import { User, Collection } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import SearchInput from "./SearchInput";
import HeaderLogo from "@/components/ui/HeaderLogo";
import { useActiveSeasonal } from "@/hooks/useActiveSeasonal";
import { Sparkles } from "lucide-react";
import { MenuItem } from "./MenuItem";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { name: string; href: string; imageUrl: string }[];
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
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed top-0 left-0 h-full w-full max-w-sm bg-background flex flex-col z-50 transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative flex items-center justify-between p-md border-b border-border h-16">
          {/* Left: Search Input */}
          <div className="z-10">
            <SearchInput
              onExpandChange={setIsSearchExpanded}
              onSelect={onClose}
              className={cn(
                "flex",
                isSearchExpanded
                  ? "w-[70vw] sm:w-80"
                  : "w-10 rounded-full bg-accent/10 p-2",
              )}
            />
          </div>

          <div
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "transition-all duration-300 ease-in-out",
              "w-32 md:w-40",
              isSearchExpanded
                ? "opacity-0 scale-90 pointer-events-none"
                : "opacity-100 scale-100",
            )}
            onClick={onClose}
          >
            <div className="flex flex-col items-center">
              <HeaderLogo size="80%" />
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="shrink-0 z-10 p-2 rounded-full bg-subtleBackground transition-colors"
          >
            <X className="h-6 w-6 text-primary" />
          </button>
        </div>
        <nav className="flex-grow overflow-y-auto px-3 pb-6 pt-2">
          <div className="flex flex-col gap-2">
            {/* Main Functional Groups */}
            <div className="flex flex-col gap-1">
              <MenuItem
                href="/products"
                icon={Menu}
                label="Full Menu"
                onClick={onClose}
                badge="All products"
              />
              <MenuItem
                href="/custom-order"
                icon={WandSparkles}
                label="Start Your Custom Order"
                onClick={onClose}
                badge="Custom Form"
              />
              <MenuItem
                href="/gallery"
                icon={GalleryHorizontalEnd}
                label="See Designs"
                onClick={onClose}
                badge="References"
              />

              {activeEvent && (
                <MenuItem
                  href={`/specials/${activeEvent.slug}`}
                  icon={Sparkles}
                  label={activeEvent.name}
                  onClick={onClose}
                  badge="Limited"
                  highlight={true}
                />
              )}
            </div>

            <div className="h-px w-full bg-border/50 my-2" />

            {/* Secondary Actions (Categories & Collections) */}
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-1 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary/40">
                  Categories
                </span>
              </div>
              {categories.map((cat) => (
                <MenuItem
                  key={cat.href}
                  href={cat.href}
                  imageUrl={cat.imageUrl}
                  label={cat.name}
                  onClick={onClose}
                />
              ))}

              {/* Collections */}
              {collections.length > 0 && (
                <>
                  <div className="px-3 pb-1 pt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary/40">
                      Collections
                    </span>
                  </div>
                  {collections.map((col) => (
                    <MenuItem
                      key={col._id.toString()}
                      href={`/products/collections/${col.slug}`}
                      icon={Crown}
                      imageUrl={col.imageUrl}
                      label={col.name}
                      onClick={onClose}
                    />
                  ))}
                </>
              )}
            </div>

            <div className="h-px w-full bg-border/50 my-2" />

            <div className="flex flex-col gap-1">
              {secondaryLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <MenuItem
                    key={link.href}
                    href={link.href}
                    icon={Icon}
                    label={link.name}
                    onClick={onClose}
                  />
                );
              })}
              
              {user ? (
                <>
                  <MenuItem
                    href="/profile"
                    icon={UserCircle}
                    label="Profile"
                    onClick={onClose}
                  />
                  <button 
                    onClick={() => {
                      handleLogout();
                      onClose();
                    }}
                    className="w-full group flex items-center justify-between p-2.5 rounded-[16px] transition-all duration-300 hover:bg-error/5 cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 bg-error/10 text-error group-hover:bg-error group-hover:text-white group-hover:shadow-sm">
                        <LogOut className="h-5 w-5 stroke-[1.5]" />
                      </div>
                      <span className="font-body text-[15px] font-medium transition-colors text-error group-hover:text-error">
                        Logout
                      </span>
                    </div>
                  </button>
                </>
              ) : (
                <MenuItem
                  href="/login"
                  icon={UserCircle}
                  label="Login"
                  onClick={onClose}
                />
              )}

              {user?.role === 'admin' && (
                <>
                  <div className="h-px w-full bg-border/50 my-2" />
                  <MenuItem
                    href="/bakery-manufacturing-orders"
                    icon={ShieldCheck}
                    label="Dashboard"
                    onClick={onClose}
                    badge="Admin"
                    highlight={true}
                  />
                </>
              )}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default MobileMenu;
