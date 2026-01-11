"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Loader2, ChevronRight } from "lucide-react";
import { ProductWithCategory } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";

const ProductThumbnail = ({ src, alt }: { src: string; alt: string }) => {
  const [error, setError] = useState(false);

  return (
    <div className="relative h-16 w-16 rounded-medium overflow-hidden bg-neutral-100 shrink-0 border border-border group-hover:border-accent/50 transition-colors shadow-sm">
      <Image
        src={error || !src ? "/placeholder.png" : src}
        alt={alt}
        fill
        className="object-cover"
        sizes="64px"
        quality={90}
        unoptimized={true}
        onError={() => setError(true)}
      />
    </div>
  );
};


interface SearchInputProps {
  onExpandChange?: (isExpanded: boolean) => void;
  className?: string;
}

export default function SearchInput({
  onExpandChange,
  className,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        setShowResults(false);
        setQuery("")
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(query)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      if (query) {
        fetchResults();
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSelect = () => {
    setIsExpanded(false);
    setShowResults(false);
    setQuery("");
  };
  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative flex h-10 items-center justify-end transition-all duration-300 ease-in-out",
        isExpanded ? "w-64 md:w-56 lg:w-80 xl:w-96" : "w-10",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-full border transition-all duration-300 flex items-center bg-white/80 backdrop-blur-sm overflow-hidden",
          isExpanded
            ? "border-primary/20 shadow-sm w-full"
            : "border-transparent bg-transparent w-10 justify-center cursor-pointer hover:bg-accent"
        )}
      >
        <button
          type="button"
          onClick={handleExpand}
          className={cn(
            "flex items-center justify-center h-10 w-10 text-primary/50 transition-colors z-10 flex-shrink-0",
            !isExpanded && "hover:text-primary"
          )}
        >
          <Search className="h-5 w-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className={cn(
            "w-full h-full bg-transparent text-primary placeholder:text-primary/50 text-sm focus:outline-none transition-opacity duration-200",
            isExpanded ? "opacity-100 pr-10" : "opacity-0 pointer-events-none"
          )}
          tabIndex={isExpanded ? 0 : -1}
        />
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
            inputRef.current?.focus();
          }}
          className={cn(
            "absolute right-0 h-10 w-10 flex items-center justify-center text-primary/50 hover:text-primary transition-all",
            isExpanded && query
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 pointer-events-none"
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Results Dropdown */}
      {isExpanded && showResults && (query || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-card-background rounded-large shadow-xl border border-border overflow-hidden z-50 max-h-[400px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center text-primary/50 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <span className="text-xs font-medium">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((product) => (
                <Link
                  key={product._id}
                  href={`/products/${product._id}`}
                  onClick={handleSelect}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-subtleBackground transition-colors group border-b border-border/40 last:border-0"
                >
                  <div className="relative h-16 w-16 rounded-medium overflow-hidden bg-neutral-100 shrink-0 border border-border group-hover:border-accent/50 transition-colors shadow-sm">
                    {product.imageUrls?.[0] ? (
                      <Image
                        src={product.imageUrls[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                        quality={90}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                        No Img
                      </div>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-heading text-primary truncate group-hover:text-accent transition-colors mb-0.5">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-primary/60 truncate bg-primary/5 px-2 py-0.5 rounded-full inline-block">
                        {product.category?.name}
                      </p>
                      {/* Optional: Show Price */}
                      <p className="text-sm font-bold text-primary">
                        ${product.structureBasePrice.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <ChevronRight className="h-4 w-4 text-primary/30 group-hover:text-accent transition-colors" />
                </Link>
              ))}

              {/* "View All" Link at bottom */}
              <Link
                href="/products"
                className="block text-center py-3 text-sm font-medium text-accent hover:text-accent/80 hover:bg-subtleBackground transition-colors border-t border-border"
              >
                View all results
              </Link>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="font-heading text-primary text-lg mb-1">
                No matches found
              </p>
              <p className="text-sm text-primary/60">
                Try checking your spelling or use a different keyword.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
