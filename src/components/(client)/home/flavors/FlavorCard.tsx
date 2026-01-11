import React from "react";
import Image from "next/image";
import { Flavor } from "@/types";
import { cn } from "@/lib/utils";

interface FlavorCardProps {
  flavor: Flavor;
  className?: string;
}

export const FlavorCard = ({ flavor, className }: FlavorCardProps) => {
  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden rounded-xl border border-border bg-card-background shadow-sm transition-all hover:border-primary/50",
        className
      )}
    >
      {/* Left Content */}
      <div className="flex w-2/3 flex-col justify-center p-md">
        <h3 className="font-heading text-h4 font-bold text-primary mb-xs">
          {flavor.name}
        </h3>
        {flavor.description && (
          <p className="font-body text-small text-muted-foreground line-clamp-3">
            {flavor.description}
          </p>
        )}
      </div>

      {/* Right Image */}
      <div className="relative w-1/3 bg-muted/20">
        <Image
          src={flavor.imageUrl || "/placeholder-flavor.png"}
          alt={flavor.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100px, 150px"
        />
      </div>
    </div>
  );
};
