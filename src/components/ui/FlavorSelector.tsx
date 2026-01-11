"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Flavor } from "@/types";

type MultiSelectProps = {
  mode: "multiple";
  selectedIds: string[];
  onToggleId: (id: string) => void;
  maxSelection?: number;
};

type SingleSelectProps = {
  mode: "single";
  selectedId: string | null;
  onSelectId: (id: string) => void;
};

type FlavorSelectorProps = {
  flavors: Flavor[];
  className?: string;
  hidePrice?: boolean;
} & (MultiSelectProps | SingleSelectProps);

const FlavorSelector = (props: FlavorSelectorProps) => {
  const { flavors, className } = props;

  return (
    <div className={cn("space-y-sm", className)}>
      <div className="flex items-center justify-between px-md pb-sm">
        <h3 className="font-heading text-h3 text-primary">
          {props.mode === "multiple"
            ? "Available Flavors"
            : "Choose your Flavor"}
        </h3>
        {props.mode === "multiple" && props.maxSelection && (
             <span className="text-sm font-medium text-primary/70">
                 Selected: {props.selectedIds.length} / {props.maxSelection}
             </span>
        )}
      </div>

      <div className="space-y-xs max-h-96 overflow-y-auto rounded-medium border border-border p-sm custom-scrollbar">
        {flavors.map((flavor) => {
          const isSelected =
            props.mode === "multiple"
              ? props.selectedIds.includes(flavor._id)
              : props.selectedId === flavor._id;

          const isDisabled = 
               props.mode === "multiple" && 
               !isSelected && 
               props.maxSelection && 
               props.selectedIds.length >= props.maxSelection;

          const handleClick = () => {
            if (props.mode === "multiple") {
                 // Prevent adding if max reached and not already selected
                if (props.maxSelection && 
                    props.selectedIds.length >= props.maxSelection && 
                    !props.selectedIds.includes(flavor._id)) {
                    return;
                }
               props.onToggleId(flavor._id);
            } else {
              props.onSelectId(flavor._id);
            }
          };

          return (
            <button
              key={flavor._id}
              type="button"
              onClick={handleClick}
              disabled={!!isDisabled}
              className={cn(
                "flex w-full items-center gap-md rounded-medium p-md transition-all text-left",
                "hover:bg-subtleBackground",
                isSelected
                  ? "ring-2 ring-accent ring-offset-2 ring-offset-background bg-subtleBackground"
                  : "border border-border",
                !!isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-medium">
                <Image
                  src={flavor.imageUrl || "/placeholder-flavor.png"}
                  alt={flavor.name}
                  fill
                  className="object-center"
                />
                {isSelected && (
                  <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-accent/70">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              <div className="">
                <span className="font-body font-bold text-primary">
                  {flavor.name}
                </span>
                {!props.hidePrice && flavor.price > 0 && (
                  <p className="font-body text-small text-primary/80">
                    +${flavor.price.toFixed(2)}
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

export default FlavorSelector;
