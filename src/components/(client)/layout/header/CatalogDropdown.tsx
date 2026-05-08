"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import Link from "next/link";
import {
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Menu,
  Palette, 
  CakeSlice,
  BookImage,
  Crown,
  GalleryHorizontalEnd,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {  Collection } from "@/types";
import { useActiveSeasonal } from "@/hooks/useActiveSeasonal";
import { useAuthStore } from "@/lib/store/authStore";

interface CatalogDropdownProps {
  categories: { name: string; href: string }[];
}

const MenuItem = ({ href, icon: Icon, label, badge, onClick, highlight = false }: any) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn(
      "group flex items-center justify-between p-2.5 rounded-[16px] transition-all duration-300",
      highlight ? "hover:bg-accent/5" : "hover:bg-primary/5"
    )}
  >
    <div className="flex items-center gap-3.5">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
        highlight 
          ? "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white group-hover:shadow-sm" 
          : "bg-subtleBackground text-primary/70 group-hover:bg-white group-hover:shadow-sm group-hover:text-primary"
      )}>
        <Icon className="h-5 w-5 stroke-[1.5]" />
      </div>
      <span className={cn(
        "font-body text-[15px] font-medium transition-colors",
        highlight ? "text-accent" : "text-primary group-hover:text-primary"
      )}>
        {label}
      </span>
    </div>
    {badge && (
      <span className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        highlight ? "bg-accent/20 text-accent" : "bg-primary/10 text-primary/70"
      )}>
        {badge}
      </span>
    )}
  </Link>
);

export const CatalogDropdown = ({ categories }: CatalogDropdownProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const { activeEvent } = useActiveSeasonal();
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      setIsOpen(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  if (!mounted) {
    return (
      <span className="flex items-center gap-1 font-body text-body text-primary opacity-0 pointer-events-none select-none">
        Catalog
      </span>
    );
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        className={cn(
          "flex items-center gap-1 font-body text-body text-primary hover:text-accent focus:outline-none transition-colors",
          isOpen && "text-accent",
        )}
      >
        <span>Catalog</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 min-w-[340px] max-h-[85vh] overflow-y-auto rounded-[28px] border border-border/60 bg-white/95 backdrop-blur-xl p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1),0_10px_30px_-10px_rgba(0,0,0,0.05)] origin-top-right animate-in fade-in-0 zoom-in-[0.95] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.95] data-[side=bottom]:slide-in-from-top-2"
          sideOffset={8}
          align="end"
        >
          <div className="flex flex-col gap-2">
            {/* Main Functional Groups */}
            <div className="flex flex-col gap-1">
              <MenuItem
                href="/products"
                icon={Menu}
                label="Full Menu"
                onClick={() => setIsOpen(false)}
                badge="All products"
              />
              <MenuItem
                href="/gallery"
                icon={GalleryHorizontalEnd}
                label="Design Gallery"
                onClick={() => setIsOpen(false)}
                badge="Refereces"
              />

              {activeEvent && (
                <MenuItem
                  href={`/specials/${activeEvent.slug}`}
                  icon={Sparkles}
                  label={activeEvent.name}
                  onClick={() => setIsOpen(false)}
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
                  icon={LayoutGrid}
                  label={cat.name}
                  onClick={() => setIsOpen(false)}
                />
              ))}

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
                      label={col.name}
                      onClick={() => setIsOpen(false)}
                    />
                  ))}
                </>
              )}
            </div>

            {isAdmin && (
              <>
                <div className="h-px w-full bg-border/50 my-2" />
                <div className="flex flex-col gap-1">
                  <MenuItem
                    href="/bakery-manufacturing-orders/"
                    icon={ShieldCheck}
                    label="Dashboard"
                    onClick={() => setIsOpen(false)}
                    badge="Admin"
                    highlight={true}
                  />
                </div>
              </>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
