"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Flavor } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface FlavorCardProps {
  flavor: Flavor;
  className?: string;
  isFlipped?: boolean;
  onToggle?: () => void;
  onPointerEnter?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
}

export const FlavorCard = ({ 
  flavor, 
  className,
  isFlipped: controlledIsFlipped,
  onToggle,
  onPointerEnter,
  onPointerLeave
}: FlavorCardProps) => {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);

  const isControlled = controlledIsFlipped !== undefined;
  const isFlipped = isControlled ? controlledIsFlipped : internalIsFlipped;

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (onPointerEnter) {
      onPointerEnter(e);
    } else if (e.pointerType === "mouse") {
      setInternalIsFlipped(true);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (onPointerLeave) {
      onPointerLeave(e);
    } else if (e.pointerType === "mouse") {
      setInternalIsFlipped(false);
    }
  };

  const handleClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsFlipped((prev) => !prev);
    }
  };

  return (
    <div
      className={cn(
        "group w-full aspect-[3/4] [perspective:1500px] bg-transparent cursor-pointer",
        className
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <div 
        className={cn(
          "relative h-full w-full rounded-[32px] transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] shadow-[0_20px_50px_-15px_rgba(230,224,212,0.6)] hover:shadow-[0_30px_60px_-15px_rgba(230,224,212,0.8)]",
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        )}
      >
        
        {/* Front Side: Image */}
        <div className="absolute inset-0 h-full w-full rounded-[32px] overflow-hidden bg-[#faf8f5] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
          <Image
            src={flavor.imageUrl || "/placeholder-flavor.png"}
            alt={flavor.name}
            fill
            className={cn(
              "object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
              isFlipped ? "scale-110" : "scale-100"
            )}
            sizes="(max-width: 768px) 100vw, 400px"
          />
          {/* Subtle gradient overlay to simulate the organic soft shadow lighting */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#f5f2eb]/40 to-transparent mix-blend-multiply" />
        </div>

        {/* Back Side: Glassmorphism Details */}
        <div className="absolute inset-0 h-full w-full rounded-[32px] p-6 sm:p-8 flex flex-col justify-center items-center text-center [transform:rotateY(180deg)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] bg-white/40 backdrop-blur-xl border border-white/60 shadow-inner overflow-hidden">
          {/* Subtle beige noise/tint overlay behind the glass */}
          <div className="absolute inset-0 bg-[#fbf9f6]/40 -z-10" />
          
          <h3 className="font-heading text-2xl sm:text-3xl font-bold text-primary mb-4 tracking-wide leading-tight drop-shadow-sm">
            {flavor.name}
          </h3>
          
          {flavor.description && (
            <p className="font-body text-sm sm:text-base text-primary/80 leading-relaxed font-medium">
              {flavor.description}
            </p>
          )}

          <div className="mt-8 w-16 h-[2px] bg-primary/20 rounded-full mb-6" />

          {/* Example action button with stopPropagation */}
          {/* <Button
            onClick={(e) => {
              e.stopPropagation();
              // Action logic goes here
            }}
            className="px-6 py-2  text-primary-foreground font-body text-sm font-semibold shadow-md hover:bg-primary/90 transition-colors"
          >
            Order Now
          </Button> */}
        </div>

      </div>
    </div>
  );
};
