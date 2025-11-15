"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Collection } from "@/types";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const CollectionNav = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

 useEffect(() => {
   const fetchCollections = async () => {
     try {
       setIsLoading(true);
       const res = await fetch("/api/collections");
       if (res.ok) {
         setCollections(await res.json());
       }
     } catch (error) {
       console.error("Failed to fetch collections:", error);
     } finally {
       setIsLoading(false);
     }
   };
   fetchCollections();
 }, []);

  if (isLoading) {
    return (
      <div className="w-full border-b border-border bg-card-background px-lg">
        <div className="mx-auto max-w-7xl h-[108px] animate-pulse" />
      </div>
    );
  }

  if (collections.length === 0) {
    return null;
  }

  const isAllActive = pathname === "/products";

  return (
    <nav className="w-full border-b border-border bg-card-background">
      <div className="mx-auto max-w-7xl px-lg">
        <div className="flex justify-center space-x-lg overflow-x-auto py-md custom-scrollbar">
          <Link
            href="/products"
            className="flex flex-col items-center gap-sm group"
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full p-1 flex-shrink-0 transition-all",
                isAllActive
                  ? "border-2 border-accent"
                  : "border border-border group-hover:border-accent/50"
              )}
            >
              <div
                className={cn(
                  "w-full h-full rounded-full flex items-center justify-center transition-colors",
                  isAllActive
                    ? "bg-accent/10"
                    : "bg-background group-hover:bg-subtleBackground"
                )}
              >
              </div>
            </div>
            <span
              className={cn(
                "font-body text-small font-semibold transition-colors",
                isAllActive
                  ? "text-accent"
                  : "text-primary/80 group-hover:text-primary"
              )}
            >
              All Cakes
            </span>
          </Link>

          {collections.map((collection) => {
            if (!collection.slug) {
              return null;
            }

            const href = `/products/collections/${collection.slug}`;
            const isActive = pathname === href;

            return (
              <Link
                key={collection._id.toString()}
                href={href}
                className="flex flex-col items-center gap-sm group flex-shrink-0"
              >
                <div
                  className={cn(
                    "w-16 h-16 rounded-full overflow-hidden transition-all group-hover:shadow-md",
                    isActive
                      ? "border-2 border-accent"
                      : "border border-border group-hover:border-accent/50"
                  )}
                >
                  <Image
                    src={collection.imageUrl || "/placeholder.png"}
                    alt={collection.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </div>
                <span
                  className={cn(
                    "font-body text-small font-semibold transition-colors",
                    isActive
                      ? "text-accent"
                      : "text-primary/80 group-hover:text-primary"
                  )}
                >
                  {collection.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default CollectionNav;
