"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarouselProps {
  imageUrls: string[];
  alt: string;
}

const ImageCarousel = ({ imageUrls, alt }: ImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const nextSlide = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevSlide = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  const goToIndex = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  };

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-medium bg-neutral-100 border border-border">
        <Image
          src="/placeholder.png"
          alt="Placeholder"
          fill
          className="object-cover opacity-50"
        />
      </div>
    );
  }

  return (
    <div
      className="group relative w-full aspect-[4/5] overflow-hidden rounded-medium bg-neutral-100 isolate"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Track */}
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {imageUrls.map((url, index) => (
          <div key={index} className="relative h-full min-w-full flex-shrink-0">
            <Image
              src={url}
              alt={`${alt} ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      {imageUrls.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-30",
              "hidden sm:flex h-8 w-8 items-center justify-center rounded-full",
              "bg-white/90 text-primary shadow-md backdrop-blur-sm transition-all",
              "border border-border/50",
              "hover:scale-110 hover:text-accent active:scale-95"
            )}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={nextSlide}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-30",
              "hidden sm:flex h-8 w-8 items-center justify-center rounded-full",
              "bg-white/90 text-primary shadow-md backdrop-blur-sm transition-all",
              "border border-border/50",
              "hover:scale-110 hover:text-accent active:scale-95"
            )}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent z-20 pointer-events-none" />

          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 px-3 py-1.5">
            {imageUrls.map((_, index) => (
              <button
                key={index}
                onClick={(e) => goToIndex(index, e)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-300 shadow-sm",
                  currentIndex === index
                    ? "bg-accent scale-125"
                    : "bg-white/70 hover:bg-white"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;
