"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ProductWithCategory, Discount } from "@/types";
import ProductCard from "@/components/(client)/ProductCard";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DiscountShowcaseProps {
  products: ProductWithCategory[];
  validDiscounts: Discount[];
}

export default function DiscountShowcase({ products, validDiscounts }: DiscountShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const checkOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    
    const currentScrollWidth = el.scrollWidth;
    const currentClientWidth = el.clientWidth;
    const gap = 24; 

    let contentIsLarger = false;

    if (showControls) {
       const approxOriginalWidth = currentScrollWidth / 2; 
       contentIsLarger = approxOriginalWidth > currentClientWidth;
    } else {
       contentIsLarger = currentScrollWidth > currentClientWidth;
    }

    // Only update if changed to prevent loops
    if (contentIsLarger !== showControls) {
      setShowControls(contentIsLarger);
    }
  }, [showControls]);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [products, checkOverflow]);

  const handleInteractionStart = () => {
    setIsPaused(true);
    setIsAutoScrolling(false);
  };

  const handleInteractionEnd = () => {
    setIsPaused(false);
    setIsAutoScrolling(true);
  };

  // Prepare Display List (Duplication Strategy)
  const displayProducts = showControls 
    ? [...products, ...products] 
    : products;

  // Auto-scroll Animation (Stream Effect)
  useEffect(() => {
    if (!showControls || isPaused) return;

    const el = containerRef.current;
    if (!el) return;

    let animationId: number;
    let lastTime = 0;
    const speed = 40; // Pixels per second
    const gap = 24; // gap-6 (1.5rem = 24px)

    const animate = (time: number) => {
      if (!isPaused && el) { 
        if (lastTime > 0) {
          const delta = (time - lastTime) / 1000;
          const move = speed * delta;
          const totalWidth = el.scrollWidth;
          const resetPoint = (totalWidth + gap) / 2;

          if (el.scrollLeft >= resetPoint) {
             el.scrollLeft = el.scrollLeft - resetPoint + move;
          } else {
             el.scrollLeft += move;
          }
        }
        lastTime = time;
        animationId = requestAnimationFrame(animate);
      } else {
        lastTime = 0; 
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [showControls, isPaused]);


  // Navigation Handlers
  const scrollContainer = (direction: "left" | "right") => {
    handleInteractionStart(); // Pause/Snap on click
    const el = containerRef.current;
    if (!el) return;

    const cardWidth = 300; 
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="py-2 md:py-2 relative"> 
      <div 
        className="mx-auto max-w-7xl px-4 sm:px-6 relative group"
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
      >
        <h2 className="mb-8 font-heading text-3xl  text-center text-primary">
          Sweet Deals
        </h2>

        {/* Desktop Nav Controls (Absolute) */}
        {showControls && (
          <>
            <button 
              onClick={() => scrollContainer("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-border text-primary hover:scale-110 transition-transform -ml-5 opacity-0 group-hover:opacity-100 duration-300"
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => scrollContainer("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-border text-primary hover:scale-110 transition-transform -mr-5 opacity-0 group-hover:opacity-100 duration-300"
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Scroll Container */}
        <div 
          ref={containerRef}
          className={cn(
            "flex gap-6 overflow-x-auto pb-6", 
            "scrollbar-hide", 
            "-mx-4 px-4 sm:mx-0 sm:px-0",
            !showControls && "justify-center",
            // Dynamic Snap: Enabled only when NOT auto-scrolling
            !isAutoScrolling ? "snap-x snap-mandatory" : "" 
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {displayProducts.map((product, index) => (
            <div 
              // Key must be unique. index allows duplication matching.
              key={`${product._id}-${index}`} 
              className={cn(
                "flex-none",
                !isAutoScrolling ? "snap-center" : "", 
                "w-[70vw] sm:w-[45%] md:w-[30%] lg:w-[23%]", 
                "h-full"
              )}
            >
              <ProductCard 
                product={product} 
                validDiscounts={validDiscounts} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
