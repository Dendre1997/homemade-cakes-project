"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  className?: string;
}

const QuantityStepper = ({
  quantity,
  onIncrease,
  onDecrease,
  className,
}: QuantityStepperProps) => {
  return (
    <div
      className={cn(
        "flex items-center rounded-medium border border-border w-fit overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        className="p-sm transition-colors hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4 text-primary" />
      </button>

      <span className="w-12 text-center border-x border-border bg-card-background font-body text-body font-bold text-primary">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        className="p-sm transition-colors hover:bg-background"
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4 text-primary" />
      </button>
    </div>
  );
};

export default QuantityStepper;
