"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CarouselProductCardProps {
  image: string;
  name: string;
  price: number;
  orderHref: string;
  className?: string;
}

export function CarouselProductCard({
  image,
  name,
  price,
  orderHref,
  className,
}: CarouselProductCardProps) {
  const [isFocusRevealed, setIsFocusRevealed] = useState(false);

  const handleFocusCapture = useCallback(() => {
    setIsFocusRevealed(true);
  }, []);

  const handleBlurCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const related = event.relatedTarget;
      if (
        related instanceof Node &&
        event.currentTarget.contains(related)
      ) {
        return;
      }
      setIsFocusRevealed(false);
    },
    [],
  );

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden rounded-xl group",
        className,
      )}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div className="relative w-full h-full">
        <Image
          src={image}
          alt={name}
          fill
          quality={90}
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300",
          "[@media(hover:hover)_and_(min-width:768px)]:opacity-0",
          "[@media(hover:hover)_and_(min-width:768px)]:group-hover:opacity-100",
          isFocusRevealed && "!opacity-100",
        )}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-black/80 via-black/50 to-transparent",
          "[@media(hover:hover)_and_(min-width:768px)]:translate-y-full",
          "[@media(hover:hover)_and_(min-width:768px)]:group-hover:translate-y-0",
          isFocusRevealed && "!translate-y-0",
        )}
      >
        <div className="text-white space-y-2">
          <h3 className="text-xl font-bold font-heading">{name}</h3>
          <p className="text-lg font-medium text-primary-foreground">
            ${price.toFixed(2)}
          </p>
          <Link
            href={orderHref}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "w-full mt-2 inline-flex",
            )}
          >
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
}
