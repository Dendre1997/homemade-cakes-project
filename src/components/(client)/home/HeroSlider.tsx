"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HeroSlide } from "@/types";
import { cn } from "@/lib/utils";
import { MoveRight } from "lucide-react";

interface HeroSliderProps {
  slides: HeroSlide[];
}

const HeroSlider = ({ slides }: HeroSliderProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((current) => (current + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning, slides.length]);

  // const handlePrev = useCallback(() => { 
  //   if (isTransitioning) return;
  //   setIsTransitioning(true);
  //   setActiveIndex((current) =>
  //     current === 0 ? slides.length - 1 : current - 1
  //   );
  //   setTimeout(() => setIsTransitioning(false), 500);
  // }, [isTransitioning, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [activeIndex, slides.length]);

  const getCardStyle = (index: number) => {
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
          className="object-cover"
          priority
          unoptimized
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
          <Link href={slide.link || "/products"}>
            <Button size="lg" variant="primary">
              {slide.buttonText || "Order Now"}
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden  py-5 md:py-5">
      <div className="mx-auto max-w-7xl px-lg flex flex-col items-center">
        <div className="relative w-full h-[400px] md:h-[500px] perspective-1000">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={slide._id}
                className={cn(
                  "absolute top-0 left-0 right-0 mx-auto",
                  "w-[90%] md:w-[100%] h-full",
                  "transition-all duration-700 ease-in-out",
                  "rounded-large overflow-hidden",
                  getCardStyle(index)
                )}
              >
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  priority={isActive}
                  unoptimized
                />
                <div className="absolute inset-0  transition-opacity duration-700" />

                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center text-center text-white p-lg transition-all duration-700 delay-300",
                    isActive
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  )}
                >
                  <h2 className="font-heading text-3xl md:text-5xl mb-sm md:mb-md absolute left-2  top-3">
                    {slide.title}
                  </h2>

                  {slide.subtitle && (
                    <p className="font-body text-lg md:text-xl max-w-xl  absolute left-2  bottom-1/2">
                      {slide.subtitle}
                    </p>
                  )}

                  <Link
                    href={slide.link || "/products"}
                    className="absolute right-2/1  bottom-3"
                  >
                    <Button
                      size="lg"
                      variant="secondary"
                      className="min-w-[280px] text-white font-black"
                    >
                      {slide.buttonText || "Order Now"}
                    </Button>
                  </Link>
                  <button
                    onClick={handleNext}
                    className="absolute right-2  bottom-3 p-3 rounded-full border hover:bg-background transition-all z-30 hidden md:flex items-center justify-center hover:scale-105 active:scale-95"
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
