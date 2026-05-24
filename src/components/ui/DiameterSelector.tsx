"use client";

import { cn } from "@/lib/utils";
import React from "react";
import Image from "next/image";

export interface DiameterOption {
  id: string;
  name: string;
  servings: string;
  illustration: React.FC<React.SVGProps<SVGSVGElement>>;
  imageUrl?: string;
  sizeValue?: number;
}

interface DiameterSelectorProps {
  diameters: DiameterOption[];
  selectedDiameterId: string | null;
  onSelectDiameter: (id: string) => void;
  className?: string;
}

const DiameterSelector = ({
  diameters,
  selectedDiameterId,
  onSelectDiameter,
  className,
}: DiameterSelectorProps) => {
  const sortedDiameters = [...diameters].sort((a, b) => (a.sizeValue || 0) - (b.sizeValue || 0));

  return (
    <div className={cn(className)}>
      <h3 className="font-body text-body font-bold text-primary mb-sm">
        Choose a size:
      </h3>
      <div className="flex gap-md overflow-x-auto pb-sm custom-scrollbar">
        {diameters.map((diameter, index) => {
          const isSelected = selectedDiameterId === diameter.id;
          const Illustration = diameter.illustration;
          const scaleMultiplier = 1 + index * 0.1;

          return (
            <button
              key={diameter.id}
              type="button"
              onClick={() => onSelectDiameter(diameter.id)}
              className={cn(
                "flex w-40 shrink-0 flex-col items-center gap-sm rounded-medium border  p-md text-center transition-all duration-200",
                isSelected
                  ? "border-2 border-accent bg-background shadow-md"
                  : "border-border hover:border-accent-secondary hover:shadow-md"
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center">
                {diameter.imageUrl ? (
                  <div 
                    className="relative w-full h-full transition-transform duration-300"
                    style={{ transform: `scale(${scaleMultiplier})` }}
                  >
                    <Image
                      src={diameter.imageUrl}
                      alt={diameter.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <Illustration className="h-full w-full text-primary" />
                )}
              </div>
              <div>
                <p className="font-body text-body font-bold text-primary">
                  {diameter.name}
                </p>
                <p className="font-body text-small text-primary/80">
                  {diameter.servings}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DiameterSelector;
