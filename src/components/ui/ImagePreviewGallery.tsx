"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

interface ImagePreviewGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}

export default function ImagePreviewGallery({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}: ImagePreviewGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Touch state for swiping
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Sync internal state when opened or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    },
    [isOpen, handleNext, handlePrev, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrev();
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 overflow-hidden bg-background/95 backdrop-blur-md border-0 shadow-none flex flex-col items-center justify-center sm:h-[95vh] sm:max-w-[95vw] sm:rounded-2xl">
        <DialogTitle className="sr-only">Image Gallery</DialogTitle>
        
        {/* Close Button */}
        {/* <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-subtleBackground text-primary hover:bg-primary/10 transition-colors shadow-sm ring-1 ring-border/50"
        >
          <X className="w-6 h-6" />
        </button> */}

        {/* Main Image Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
            
           {/* Previous Button (Hidden on Mobile) */}
           {images.length > 1 && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                }}
                className={cn(
                "hidden md:flex absolute left-4 z-40 p-3 rounded-full",
                "bg-subtleBackground text-primary transition-all",
                "hover:bg-primary hover:text-white hover:scale-110 shadow-sm ring-1 ring-border/50",
                "focus:outline-none focus:ring-2 focus:ring-accent"
                )}
            >
                <ChevronLeft className="w-8 h-8" />
            </button>
           )}

          <div className="relative w-full h-full max-h-[85vh] max-w-7xl mx-auto aspect-square md:aspect-video p-4">
             <Image
                src={images[currentIndex]}
                alt={`Gallery Image ${currentIndex + 1}`}
                fill
                className="object-contain pointer-events-none"
                sizes="100vw"
                priority
              />
          </div>

          {/* Next Button (Hidden on Mobile) */}
          {images.length > 1 && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                }}
                className={cn(
                "hidden md:flex absolute right-4 z-40 p-3 rounded-full",
                "bg-subtleBackground text-primary transition-all",
                "hover:bg-primary hover:text-white hover:scale-110 shadow-sm ring-1 ring-border/50",
                "focus:outline-none focus:ring-2 focus:ring-accent"
                )}
            >
                <ChevronRight className="w-8 h-8" />
            </button>
           )}
        </div>

        {/* Caption / Counter */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-subtleBackground text-primary px-4 py-2 rounded-full text-sm font-medium border border-border/50 shadow-sm">
            {currentIndex + 1} / {images.length}
        </div>

      </DialogContent>
    </Dialog>
  );
}
