"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

interface ImagePreviewGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}

interface Point {
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const WHEEL_LISTENER_OPTIONS: AddEventListenerOptions = { passive: false };
const MIN_SWIPE_DISTANCE = 50;

function touchDistance(
  t1: { clientX: number; clientY: number },
  t2: { clientX: number; clientY: number }
): number {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.hypot(dx, dy);
}

export default function ImagePreviewGallery({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
}: ImagePreviewGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(MIN_SCALE);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const scaleRef = useRef(MIN_SCALE);
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 });
  const pinchStartRef = useRef({ distance: 0, scale: MIN_SCALE });
  const swipeRef = useRef({ startX: 0, endX: 0 });

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const clampPosition = useCallback((x: number, y: number, s: number): Point => {
    const el = imageContainerRef.current;
    if (!el || s <= MIN_SCALE) return { x: 0, y: 0 };

    const { width, height } = el.getBoundingClientRect();
    // translate is applied before scale in `scale(s) translate(x,y)` — bounds in translate units
    const maxX = (width * (s - 1)) / (2 * s);
    const maxY = (height * (s - 1)) / (2 * s);

    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  const setDragging = useCallback((value: boolean) => {
    isDraggingRef.current = value;
    setIsDragging(value);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
    setDragging(false);
  }, [setDragging]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    resetZoom();
  }, [currentIndex, resetZoom]);

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

  const applyScale = useCallback(
    (nextScale: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      setScale(clamped);
      if (clamped <= MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      } else {
        setPosition((pos) => clampPosition(pos.x, pos.y, clamped));
      }
    },
    [clampPosition]
  );

  const applyScaleRef = useRef(applyScale);
  useEffect(() => {
    applyScaleRef.current = applyScale;
  }, [applyScale]);

  // Native wheel listener — passive: false is required for preventDefault()
  useLayoutEffect(() => {
    if (!isOpen) return;

    let cleanup: (() => void) | undefined;
    let rafId = 0;

    const attachWheelListener = (): boolean => {
      const el = imageContainerRef.current;
      if (!el) return false;

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        applyScaleRef.current(scaleRef.current * factor);
      };

      el.addEventListener("wheel", onWheel, WHEEL_LISTENER_OPTIONS);
      cleanup = () =>
        el.removeEventListener("wheel", onWheel, WHEEL_LISTENER_OPTIONS);
      return true;
    };

    if (!attachWheelListener()) {
      rafId = requestAnimationFrame(() => attachWheelListener());
    }

    return () => {
      cancelAnimationFrame(rafId);
      cleanup?.();
    };
  }, [isOpen, currentIndex]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scaleRef.current <= MIN_SCALE) return;
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
  };

  const panByPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current || scaleRef.current <= MIN_SCALE) return;

      const s = scaleRef.current;
      const dx = clientX - dragStartRef.current.pointerX;
      const dy = clientY - dragStartRef.current.pointerY;

      setPosition(
        clampPosition(
          dragStartRef.current.posX + dx / s,
          dragStartRef.current.posY + dy / s,
          s
        )
      );
    },
    [clampPosition]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      panByPointer(e.clientX, e.clientY);
    };
    const onWindowMouseUp = () => setDragging(false);

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [isDragging, panByPointer, setDragging]);

  const endDrag = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = touchDistance(e.touches[0], e.touches[1]);
      pinchStartRef.current = { distance: dist, scale: scaleRef.current };
      setDragging(false);
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (scaleRef.current > MIN_SCALE) {
        setDragging(true);
        dragStartRef.current = {
          pointerX: t.clientX,
          pointerY: t.clientY,
          posX: positionRef.current.x,
          posY: positionRef.current.y,
        };
      } else {
        swipeRef.current = { startX: t.clientX, endX: t.clientX };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const { distance, scale: startScale } = pinchStartRef.current;
      if (distance <= 0) return;
      applyScale(startScale * (dist / distance));
      return;
    }

    if (e.touches.length === 1 && isDraggingRef.current && scaleRef.current > MIN_SCALE) {
      e.preventDefault();
      panByPointer(e.touches[0].clientX, e.touches[0].clientY);
      return;
    }

    if (e.touches.length === 1 && scaleRef.current <= MIN_SCALE) {
      swipeRef.current.endX = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    setDragging(false);

    if (scaleRef.current <= MIN_SCALE && e.touches.length === 0) {
      const { startX, endX } = swipeRef.current;
      const distanceX = startX - endX;
      if (Math.abs(distanceX) > MIN_SWIPE_DISTANCE) {
        if (distanceX > 0) handleNext();
        else handlePrev();
      }
    }

    if (e.touches.length === 1) {
      pinchStartRef.current = { distance: 0, scale: scaleRef.current };
    }
  };

  if (!images || images.length === 0) return null;

  const isZoomed = scale > MIN_SCALE;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 overflow-hidden bg-background/95 backdrop-blur-md border-0 shadow-none flex flex-col items-center justify-center sm:h-[95vh] sm:max-w-[95vw] sm:rounded-2xl">
        <DialogTitle className="sr-only">Image Gallery</DialogTitle>

        <div className="relative w-full h-full flex items-center justify-center">
          {images.length > 1 && (
            <button
              type="button"
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

          <div
            className="relative w-full h-full max-h-[85vh] max-w-7xl mx-auto aspect-square md:aspect-video p-4 overflow-hidden select-none"
          >
            <div
              className="relative w-full h-full will-change-transform"
              style={{
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
              }}
            >
              <Image
                src={images[currentIndex]}
                alt={`Gallery Image ${currentIndex + 1}`}
                fill
                className="object-contain select-none"
                sizes="100vw"
                priority
                draggable={false}
              />
            </div>

            {/* Captures wheel, mouse, and touch — sits above the image */}
            <div
              ref={imageContainerRef}
              className={cn(
                "absolute inset-0 z-10",
                isZoomed && !isDragging && "cursor-grab",
                isDragging && "cursor-grabbing"
              )}
              style={{ touchAction: "none" }}
              aria-hidden
              onMouseDown={handleMouseDown}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />

            {isZoomed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoom();
                }}
                className="absolute top-3 right-3 z-50 flex items-center gap-1.5 rounded-full bg-subtleBackground/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-border/50 hover:bg-primary hover:text-white transition-colors"
                aria-label="Reset zoom"
              >
                <ZoomOut className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>

          {images.length > 1 && (
            <button
              type="button"
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

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-subtleBackground text-primary px-4 py-2 rounded-full text-sm font-medium border border-border/50 shadow-sm">
          {currentIndex + 1} / {images.length}
          {isZoomed && (
            <span className="text-primary/50 ml-2 text-xs">
              · {Math.round(scale * 100)}%
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
