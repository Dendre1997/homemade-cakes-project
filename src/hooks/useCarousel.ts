import { useState, useRef, useEffect, useCallback } from "react";

interface UseCarouselProps {
  scrollSpeed?: number; 
}

export const useCarousel = ({ scrollSpeed = 3 }: UseCarouselProps = {}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  const throttledCheckScroll = useCallback(() => {
    requestAnimationFrame(checkScroll);
  }, [checkScroll]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", throttledCheckScroll);
    return () => window.removeEventListener("resize", throttledCheckScroll);
  }, [checkScroll, throttledCheckScroll]);

  const scroll = useCallback(
    (direction: "left" | "right") => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const width = window.innerWidth;
        let itemsVisible = 1;
        if (width >= 1024) {
          itemsVisible = 5;
        } else if (width >= 768) {
          itemsVisible = 3;
        }

        const scrollAmount = (container.clientWidth / itemsVisible) * scrollSpeed;

        container.scrollBy({
          left: direction === "right" ? scrollAmount : -scrollAmount,
          behavior: "smooth",
        });
      }
    },
    [scrollSpeed]
  );

  return {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    scroll,
    checkScroll: throttledCheckScroll,
  };
};
