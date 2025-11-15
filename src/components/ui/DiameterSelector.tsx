"use client";

import { cn } from "@/lib/utils";
import React from "react";

export interface DiameterOption {
  id: string;
  name: string;
  servings: string;
  illustration: React.FC<React.SVGProps<SVGSVGElement>>;
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
  return (
    <div className={cn(className)}>
      <h3 className="font-body text-body font-bold text-primary mb-sm">
        Choose a size:
      </h3>
      <div className="flex gap-md overflow-x-auto pb-sm custom-scrollbar">
        {diameters.map((diameter) => {
          const isSelected = selectedDiameterId === diameter.id;
          const Illustration = diameter.illustration;

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
                <Illustration className="h-full w-full text-primary" />
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
