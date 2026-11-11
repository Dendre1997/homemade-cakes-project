"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { SetBoxIcon } from "@/components/ui/SetBoxIcon";
import type { CatalogSet } from "@/types";

export interface SetOption {
  set: Pick<CatalogSet, "_id" | "name" | "pieceCount" | "maxFlavors" | "imageUrl">;
  /** Price of this product in this set. */
  price: number;
}

interface SetSelectorProps {
  options: SetOption[];
  selectedId: string | null;
  onSelect: (setId: string) => void;
  className?: string;
}

const SetSelector = ({ options, selectedId, onSelect, className }: SetSelectorProps) => (
  <div className={cn(className)}>
    <h3 className="font-body text-body font-bold text-primary mb-sm">Choose a set:</h3>
    <div className="flex gap-md overflow-x-auto pb-sm custom-scrollbar">
      {options.map(({ set, price }) => {
        const setId = String(set._id);
        const isSelected = selectedId === setId;
        return (
          <button
            key={setId}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(setId)}
            className={cn(
              "flex w-40 shrink-0 flex-col items-center gap-sm rounded-medium border text-center transition-all duration-200",
              isSelected
                ? "border-2 border-accent bg-background shadow-md"
                : "border-border hover:border-accent-secondary hover:shadow-md"
            )}
          >
            <div className="relative flex h-24 w-24 items-center justify-center">
              {set.imageUrl ? (
                <Image src={set.imageUrl} alt="" fill sizes="96px" className="object-contain" />
              ) : (
                <SetBoxIcon pieceCount={set.pieceCount} className="h-full w-full text-primary" />
              )}
            </div>
            <div>
              <p className="font-body text-body font-bold text-primary">{set.name}</p>
              <p className="font-body text-small text-primary/80">
                {set.pieceCount} pieces · up to {set.maxFlavors}{" "}
                {set.maxFlavors === 1 ? "flavor" : "flavors"}
              </p>
              <p className="font-body text-body font-bold text-accent mt-1">
                ${price.toFixed(2)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default SetSelector;
