"use client";

import { cn } from "@/lib/utils";
import { IShape } from "@/types";
import { Shapes } from "lucide-react";
import Image from "next/image";

interface ShapeSelectorProps {
  shapes: IShape[];
  selectedShapeId: string;
  onChange: (id: string) => void;
  className?: string;
}

const ShapeSelector = ({
  shapes,
  selectedShapeId,
  onChange,
  className,
}: ShapeSelectorProps) => {
  return (
    <div className={cn(className)}>
      <h3 className="font-body text-body font-bold text-primary mb-sm">
        Choose a shape:
      </h3>
      <div className="flex gap-md overflow-x-auto pb-sm custom-scrollbar">
        {shapes.map((shape) => {
          const isSelected = selectedShapeId === shape._id;

          return (
            <button
              key={shape._id}
              type="button"
              onClick={() => onChange(shape._id)}
              className={cn(
                "flex w-40 shrink-0 flex-col items-center gap-sm rounded-medium border p-md text-center transition-all duration-200",
                isSelected
                  ? "border-2 border-accent bg-background shadow-md"
                  : "border-border hover:border-accent-secondary hover:shadow-md"
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center">
                {shape.imageUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={shape.imageUrl}
                      alt={shape.name}
                      fill
                      quality={90}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <Shapes className="h-10 w-10 text-primary/50" />
                )}
              </div>
              <div>
                <p className="font-body text-body font-bold text-primary">
                  {shape.name}
                </p>
                {shape.priceSurcharge > 0 && (
                  <p className="font-body text-small text-accent font-semibold">
                    +${shape.priceSurcharge.toFixed(2)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ShapeSelector;
