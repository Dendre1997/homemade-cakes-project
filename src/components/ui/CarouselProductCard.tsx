"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CarouselProductCardProps {
  image: string;
  name: string;
  price: number;
  onOrder?: () => void;
  className?: string;
}

export function CarouselProductCard({
  image,
  name,
  price,
  onOrder,
  className,
}: CarouselProductCardProps) {
  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden rounded-xl group cursor-pointer",
        className
      )}
    >
      {/* Image */}
      <div className="relative w-full h-full">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Overlay - Hidden by default, slides up on hover */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-black/80 via-black/50 to-transparent">
        <div className="text-white space-y-2">
          <h3 className="text-xl font-bold font-heading">{name}</h3>
          <p className="text-lg font-medium text-primary-foreground">
            ${price.toFixed(2)}
          </p>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onOrder?.();
            }}
            className="w-full mt-2"
            variant="primary"
          >
            Order Now
          </Button>
        </div>
      </div>
    </div>
  );
}
