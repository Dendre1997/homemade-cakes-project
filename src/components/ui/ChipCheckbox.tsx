"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const ChipCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "group inline-flex select-none items-center justify-center gap-sm rounded-medium border px-md py-sm font-body text-small transition-all",
      "border-border bg-card-background text-primary",
      "data-[state=unchecked]:hover:border-accent data-[state=unchecked]:hover:bg-background",
      "data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-white",
      className
    )}
    {...props}
  >
    <Plus className="h-4 w-4 shrink-0 group-data-[state=checked]:hidden" />

    <Check className="h-4 w-4 shrink-0 group-data-[state=unchecked]:hidden" />

    {children}
  </CheckboxPrimitive.Root>
));
ChipCheckbox.displayName = "ChipCheckbox";

export { ChipCheckbox };
