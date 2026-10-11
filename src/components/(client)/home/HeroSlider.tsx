"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { HeroSlide } from "@/types";
import { cn, focusWithVisibleIndicator } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { MoveRight } from "lucide-react";

interface HeroSliderProps {
  slides: HeroSlide[];
}

const SLIDE_TRANSITION_MS = 500;

const HeroSlider = ({ slides }: HeroSliderProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleTrackFocusIn = useCallback(() => {
    setIsAutoplayPaused(true);
  }, []);

  const handleTrackFocusOut = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const related = event.relatedTarget;
      if (
        related instanceof Node &&
        trackRef.current?.contains(related)
      ) {
        return;
      }
      setIsAutoplayPaused(false);
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((current) => (current + 1) % slides.length);
    const unlockMs = prefersReducedMotion ? 0 : SLIDE_TRANSITION_MS;
    setTimeout(() => setIsTransitioning(false), unlockMs);
  }, [isTransitioning, prefersReducedMotion, slides.length]);

  // const handlePrev = useCallback(() => { 
  //   if (isTransitioning) return;
  //   setIsTransitioning(true);
  //   setActiveIndex((current) =>
  //     current === 0 ? slides.length - 1 : current - 1
  //   );
  //   setTimeout(() => setIsTransitioning(false), 500);
  // }, [isTransitioning, slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || prefersReducedMotion || isAutoplayPaused) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeIndex, isAutoplayPaused, prefersReducedMotion, slides.length]);

  useEffect(() => {
    const track = trackRef.current;
    const activeSlide = slideRefs.current[activeIndex];
    if (!track || !activeSlide) return;

    const focused = document.activeElement;
    if (
      !(focused instanceof HTMLElement) ||
      !track.contains(focused) ||
      activeSlide.contains(focused)
    ) {
      return;
    }

    const nextFocusTarget =
      activeSlide.querySelector<HTMLElement>(
        'button[aria-label="Next Slide"], a[href]',
      ) ?? activeSlide;
    focusWithVisibleIndicator(nextFocusTarget);
  }, [activeIndex]);

  const getCardStyle = (index: number) => {
    if (prefersReducedMotion) {
      return index === activeIndex
        ? "z-20 opacity-100 scale-100 translate-x-0"
        : "z-0 opacity-0 scale-100 translate-x-0 pointer-events-none";
    }

    if (index === activeIndex) {
      return "z-20 opacity-100 scale-100 translate-x-0 ";
    }

    const nextIndex = (activeIndex + 1) % slides.length;
    const prevIndex = (activeIndex - 1 + slides.length) % slides.length;

    if (index === nextIndex) {
      return "z-10 opacity-60 scale-[0.9] translate-x-[70%]";
    }

    if (index === prevIndex) {
      return "z-10 opacity-60 scale-[0.9] -translate-x-[70%]";
    }

    return "z-0 opacity-0 scale-[0.9] translate-x-0";
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  if (slides.length === 1) {
    const slide = slides[0];
    return (
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden bg-neutral-100 rounded-large">
        <Image
          src={slide.imageUrl}
          alt={slide.title}
          fill
          quality={90}
          sizes="(max-width: 768px) 100vw, 80vw"
          className="object-cover"
          priority
          fetchPriority="high"
        />
        <div className="absolute inset-0 " />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-lg">
          <h1 className="font-heading text-5xl md:text-7xl  mb-md">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="text-xl md:text-2xl max-w-2xl mb-lg font-body">
              {slide.subtitle}
            </p>
          )}
          <Link
            href={slide.link || "/products"}
            className={buttonVariants({ size: "lg", variant: "primary" })}
          >
            {slide.buttonText || "Order Now"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden  py-5 md:py-5">
      <div className="mx-auto max-w-7xl px-lg flex flex-col items-center">
        <div
          ref={trackRef}
          className="relative w-full h-[400px] md:h-[500px] perspective-1000"
          onFocusCapture={handleTrackFocusIn}
          onBlurCapture={handleTrackFocusOut}
        >
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={slide._id}
                ref={(element) => {
                  slideRefs.current[index] = element;
                }}
                inert={isActive ? undefined : true}
                aria-hidden={!isActive}
                className={cn(
                  "absolute top-0 left-0 right-0 mx-auto",
                  "w-[90%] md:w-[100%] h-full",
                  !prefersReducedMotion &&
                    "transition-all duration-700 ease-in-out",
                  "rounded-large overflow-hidden",
                  getCardStyle(index),
                )}
              >
                <Image
                  src={slide.imageUrl}
                  alt={isActive ? slide.title : ""}
                  aria-hidden={!isActive}
                  fill
                  quality={90}
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-cover"
                  priority={isActive}
                  fetchPriority={isActive ? "high" : "low"}
                />
                <div
                  className={cn(
                    "absolute inset-0",
                    !prefersReducedMotion &&
                      "transition-opacity duration-700",
                  )}
                />

                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center text-center text-white p-lg",
                    !prefersReducedMotion &&
                      "transition-all duration-700 delay-300",
                    isActive
                      ? "opacity-100 translate-y-0"
                      : prefersReducedMotion
                        ? "opacity-0 translate-y-0"
                        : "opacity-0 translate-y-8",
                  )}
                >
                  {/* <h2 className="font-heading text-3xl md:text-5xl mb-sm md:mb-md absolute left-2  top-3" text-start>
                    {slide.title}
                  </h2> */}

                  {/* {slide.subtitle && (
                    <p className="font-body text-lg md:text-xl max-w-xl  absolute left-2  bottom-1/2">
                      {slide.subtitle}
                    </p>
                  )} */}

                  <Link
                    href={slide.link || "/products"}
                    prefetch={index === 0 ? undefined : false}
                    className={cn(
                      buttonVariants({ size: "lg", variant: "secondary" }),
                      "absolute right-2/1 bottom-3 min-w-[280px] bg-primary text-white px-4 py-2 rounded-lg backdrop-blur-md bg-opacity-80",
                    )}
                  >
                    {slide.buttonText || "Order Now"}
                  </Link>
                  <button
                    onClick={handleNext}
                    className={cn(
                      "absolute right-2 bottom-3 p-3 rounded-full border hover:bg-background z-30 hidden md:flex items-center justify-center",
                      !prefersReducedMotion &&
                        "transition-all hover:scale-105 active:scale-95",
                    )}
                    aria-label="Next Slide"
                  >
                    <MoveRight className="w-6 h-6 text-white hover:text-primary" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style jsx global>{`
        @keyframes progress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style> 
    </section>
  );
};

export default HeroSlider;
