"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import Link from "next/link";
import { ChevronDown, Sparkles, Layers, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {  Collection } from "@/types";
import { useActiveSeasonal } from "@/hooks/useActiveSeasonal";

interface CatalogDropdownProps {
  categories: { name: string; href: string }[];
}

export const CatalogDropdown = ({ categories }: CatalogDropdownProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { activeEvent } = useActiveSeasonal();
  const [collections, setCollections] = React.useState<Collection[]>([]);

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

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        className={cn(
          "flex items-center gap-1 font-body text-body text-primary hover:text-accent focus:outline-none transition-colors",
          isOpen && "text-accent"
        )}
      >
        <span>Catalog</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 min-w-[320px] max-h-[80vh] overflow-y-auto rounded-md border border-border bg-white p-4 shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2"
          sideOffset={5}
          align="end"
        >
          <div className="flex flex-col gap-6">
            <Link
              href={`/products`}
              onClick={() => setIsOpen(false)}
              className="text-md text-primary hover:text-accent hover:bg-subtleBackground text-center rounded p-2 transition-colors truncate font-bold"
            >
              Full Menu
            </Link>
            {/* Seasonal Event Section */}
            {activeEvent && (
              <div className="border-b border-border pb-4">
                <Link
                  href={`/specials/${activeEvent.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="group block rounded-md bg-gradient-to-r from-accent/10 to-transparent p-3 hover:from-accent/20 transition-all"
                >
                  <div className="flex items-center gap-2 text-accent font-bold mb-1">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>{activeEvent.name}</span>
                  </div>
                  <p className="text-sm text-primary/80 group-hover:text-primary">
                    Shop our limited time specials!
                  </p>
                </Link>
              </div>
            )}

            {/* Collections Section */}
            {collections.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 font-heading text-sm text-primary/50 uppercase tracking-wider mb-2">
                  <Layers className="h-4 w-4" />
                  Collections
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {collections.map((col) => (
                    <Link
                      key={col._id.toString()}
                      href={`/products/collections/${col.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="text-sm text-primary hover:text-accent hover:bg-subtleBackground rounded p-2 transition-colors truncate"
                    >
                      {col.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Section */}
            <div>
              <h3 className="flex items-center gap-2 font-heading text-sm text-primary/50 uppercase tracking-wider mb-2">
                <Tag className="h-4 w-4" />
                Categories
              </h3>
              <div className="flex flex-col gap-1">
                {categories.map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm text-primary hover:text-accent hover:bg-subtleBackground rounded px-2 py-1.5 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <PopoverPrimitive.Arrow className="fill-white" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
