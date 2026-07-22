"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Flavor } from "@/types";
import { useEffect, useRef } from "react";

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
  hideHeading?: boolean;
  /** Scroll the selected flavor card into view once on mount (when a saved selection exists) */
  autoScrollToSelected?: boolean;
  onInfoClick?: (id: string) => void;
} & (MultiSelectProps | SingleSelectProps);

const FlavorSelector = (props: FlavorSelectorProps) => {
  const {
    flavors,
    className,
    autoScrollToSelected = true,
  } = props;

  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!autoScrollToSelected || hasScrolledRef.current) return;

    const selectedId =
      props.mode === "single" ? props.selectedId : props.selectedIds[0];
    if (!selectedId || flavors.length === 0) return;

    const frame = requestAnimationFrame(() => {
      if (hasScrolledRef.current) return;
      const el = itemRefs.current.get(String(selectedId));
      if (!el) return;
      el.scrollIntoView({ block: "nearest", behavior: "auto" });
      hasScrolledRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [autoScrollToSelected, flavors.length, props.mode]);

  return (
    <div className={cn("w-full space-y-sm", className)}>
      {!props.hideHeading && (
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
      )}

      <div
        role="listbox"
        aria-label="Flavor options"
        className="w-full space-y-xs max-h-96 overflow-y-auto rounded-medium p-sm custom-scrollbar"
      >
        {flavors.map((flavor) => {
          const flavorId = String(flavor._id);
          const isSelected =
            props.mode === "multiple"
              ? props.selectedIds.some((id) => String(id) === flavorId)
              : String(props.selectedId) === flavorId;

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
                    !props.selectedIds.some((id) => String(id) === flavorId)) {
                    return;
                }
               props.onToggleId(flavor._id);
            } else {
              props.onSelectId(flavor._id);
            }
          };

          return (
            <button
              key={flavorId}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(flavorId, node);
                } else {
                  itemRefs.current.delete(flavorId);
                }
              }}
              type="button"
              data-flavor-id={flavorId}
              role="option"
              aria-selected={isSelected}
              onClick={handleClick}
              disabled={!!isDisabled}
              className={cn(
                "relative flex w-full items-center gap-md rounded-medium p-md transition-all text-left",
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
                  quality={90}
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

              {isSelected && props.onInfoClick && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onInfoClick?.(flavor._id);
                  }}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 hover:bg-accent text-accent hover:text-white transition-all border border-accent/30 text-xs font-bold z-10 cursor-pointer shadow-sm"
                  title="View Flavor Details"
                >
                  ?
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FlavorSelector;
