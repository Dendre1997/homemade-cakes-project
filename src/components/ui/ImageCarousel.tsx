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
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPrevious = () => {
    setActiveIndex((prevIndex) =>
      prevIndex === 0 ? imageUrls.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setActiveIndex((prevIndex) =>
      prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToIndex = (index: number) => {
    setActiveIndex(index);
  };

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-medium bg-border">
        <Image
          src="/placeholder.png"
          alt="Placeholder image"
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-medium">
      {/* Main Image */}
      <Image
        key={activeIndex}
        src={imageUrls[activeIndex]}
        alt={alt}
        fill
        className="object-cover transition-opacity duration-300"
        priority={activeIndex === 0}
      />

      <button
        onClick={goToPrevious}
        className="absolute left-md top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/50 text-primary transition hover:bg-background/80"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-md top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/50 text-primary transition hover:bg-background/80"
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-md left-1/2 -translate-x-1/2 z-10 flex gap-sm">
        {imageUrls.map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={cn(
              "h-3 w-3 rounded-full transition-colors",
              activeIndex === index
                ? "bg-accent"
                : "bg-background/50 hover:bg-background/80"
            )}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
