"use client";

import { Flavor } from "@/types";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import FlavorSelector from "@/components/ui/FlavorSelector";

interface AdminTierFlavorEditorProps {
  tiersCount: number;
  tierSizes: string[];
  tierFlavors: Record<number, string>;
  flavors: Flavor[];
  onTierFlavorChange: (tierIndex: number, flavorId: string) => void;
  /** Use visual FlavorSelector cards (custom order UI) vs compact Select dropdowns */
  variant?: "select" | "cards";
  disabled?: boolean;
  className?: string;
}

export function AdminTierFlavorEditor({
  tiersCount,
  tierSizes,
  tierFlavors,
  flavors,
  onTierFlavorChange,
  variant = "select",
  disabled = false,
  className,
}: AdminTierFlavorEditorProps) {
  if (tiersCount <= 1) return null;

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      {Array.from({ length: tiersCount }, (_, index) => {
        const sizeLabel = tierSizes[index] ?? `Tier ${index + 1}`;
        const selectedFlavorId = tierFlavors[index]
          ? String(tierFlavors[index])
          : undefined;

        return (
          <div key={index} className="flex w-full min-w-0 flex-col space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {sizeLabel}
            </Label>
            {variant === "cards" ? (
              <FlavorSelector
                mode="single"
                flavors={flavors}
                selectedId={selectedFlavorId ?? null}
                onSelectId={(id) => onTierFlavorChange(index, id)}
                hideHeading
                hidePrice
                autoScrollToSelected
                className="w-full"
              />
            ) : (
              <Select
                value={selectedFlavorId}
                onValueChange={(val) => onTierFlavorChange(index, val)}
                disabled={disabled || flavors.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select flavor" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-full min-w-[var(--radix-select-trigger-width)]">
                  {flavors.map((f) => (
                    <SelectItem key={String(f._id)} value={String(f._id)}>
                      {f.name}
                      {f.price > 0 ? ` (+$${f.price})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      })}
    </div>
  );
}
