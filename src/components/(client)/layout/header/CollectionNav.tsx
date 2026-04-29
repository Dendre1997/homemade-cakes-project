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
    <nav className="flex w-full justify-center border-t border-border">
      <div className="w-full mx-auto max-w-7xl px-4 md:px-lg">
        <div className="flex w-full space-x-6 md:space-x-lg overflow-x-auto py-5 custom-scrollbar">
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
                    "w-40 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden transition-all group-hover:shadow-md shrink-0",
                    isActive
                      ? "border-2 border-accent"
                      : "border border-border group-hover:border-accent/50"
                  )}
                >
                  <Image
                    src={collection.imageUrl || "/placeholder.png"}
                    alt={collection.name}
                    width={96}
                    height={96}
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
