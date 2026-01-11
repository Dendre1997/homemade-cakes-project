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

  if (!images || images.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden bg-transparent border-0 shadow-none flex flex-col items-center justify-center">
        <DialogTitle className="sr-only">Image Gallery</DialogTitle>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-primary hover:text-white transition-colors backdrop-blur-sm shadow-lg ring-1 ring-white/20"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Main Image Container */}
        <div className="relative w-full h-full flex items-center justify-center">
            
           {/* Previous Button */}
           {images.length > 1 && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                }}
                className={cn(
                "absolute left-4 z-40 p-3 rounded-full",
                "bg-black/40 text-white backdrop-blur-sm transition-all",
                "hover:bg-primary hover:scale-110",
                "focus:outline-none focus:ring-2 focus:ring-accent"
                )}
            >
                <ChevronLeft className="w-8 h-8" />
            </button>
           )}

          <div className="relative w-full h-full max-h-[85vh] max-w-7xl mx-auto aspect-square md:aspect-video">
             <Image
                src={images[currentIndex]}
                alt={`Gallery Image ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                }}
                className={cn(
                "absolute right-4 z-40 p-3 rounded-full",
                "bg-black/40 text-white backdrop-blur-sm transition-all",
                "hover:bg-primary hover:scale-110",
                "focus:outline-none focus:ring-2 focus:ring-accent"
                )}
            >
                <ChevronRight className="w-8 h-8" />
            </button>
           )}
        </div>

        {/* Caption / Counter */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium border border-white/10">
            {currentIndex + 1} / {images.length}
        </div>

      </DialogContent>
    </Dialog>
  );
}
