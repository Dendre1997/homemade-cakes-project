"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, isActive: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  autoPlayInterval?: number;
}

export function Carousel<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  autoPlayInterval = 5000,
}: CarouselProps<T>) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to map virtual index to actual item index
  const getActualIndex = useCallback(
    (virtualIndex: number) => {
      return ((virtualIndex % items.length) + items.length) % items.length;
    },
    [items.length]
  );

  const handleNext = useCallback(() => {
    setIndex((prev) => prev + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setIndex((prev) => prev - 1);
  }, []);

  const goToIndex = (targetActualIndex: number) => {
    // Find the closest virtual index that matches the target actual index
    const currentActualIndex = getActualIndex(index);
    let diff = targetActualIndex - currentActualIndex;

    // Optimize direction (e.g., if going from 0 to 4 in a 5-item list, go -1 instead of +4)
    if (diff > items.length / 2) diff -= items.length;
    if (diff < -items.length / 2) diff += items.length;

    setIndex((prev) => prev + diff);
  };

  // Auto-play logic
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isPaused, handleNext, autoPlayInterval]);

  const pauseAutoPlay = useCallback(() => setIsPaused(true), []);
  const resumeAutoPlay = useCallback(() => setIsPaused(false), []);

  const onDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      handleNext();
    } else if (info.offset.x > threshold) {
      handlePrev();
    }
    resumeAutoPlay();
  };

  const windowRange = [-2, -1, 0, 1, 2];

  return (
    <div
      className={cn("relative w-full overflow-hidden py-10", className)}
      onMouseEnter={pauseAutoPlay}
      onMouseLeave={resumeAutoPlay}
      onTouchStart={pauseAutoPlay}
      onTouchEnd={resumeAutoPlay}
      ref={containerRef}
    >
      {/* Track */}
      <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center perspective-1000">
        {windowRange.map((offset) => {
          const virtualIndex = index + offset;
          const actualIndex = getActualIndex(virtualIndex);
          const item = items[actualIndex];
          const isActive = offset === 0;

          return (
            <motion.div
              key={virtualIndex} // Virtual index as key ensures continuity
              className={cn(
                "absolute top-0 w-[70%] md:w-[40%] h-full",
                "flex items-center justify-center",
                isActive ? "z-20" : "z-10"
              )}
              initial={false}
              animate={{
                x: `${offset * 105}%`, // Spacing
                scale: isActive ? 1.1 : 0.85,
                opacity: isActive ? 1 : Math.abs(offset) > 1 ? 0 : 0.5, // Fade out distant items
                zIndex: isActive ? 20 : 10 - Math.abs(offset),
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={onDragEnd}
              onDragStart={pauseAutoPlay}
              style={{
                pointerEvents: isActive ? "auto" : "none", 
              }}
            >
              <div className="w-full h-full  rounded-xl overflow-hidden">
                {renderItem(item, isActive)}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation - Right aligned radio buttons */}
      <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              goToIndex(i);
              pauseAutoPlay();
            }}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300 border border-primary/50",
              getActualIndex(index) === i
                ? "bg-primary scale-125 border-primary"
                : "bg-transparent hover:bg-primary/30"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Mobile Navigation Hints */}
      {/* <div className="md:hidden absolute bottom-2 left-0 right-0 flex justify-center gap-2">
        {items.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              getActualIndex(index) === i ? "bg-primary" : "bg-gray-300"
            )}
          />
        ))}
      </div> */}
    </div>
  );
}
