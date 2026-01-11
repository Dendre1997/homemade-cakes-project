"use client";

import { cn } from "@/lib/utils";
import { BoxIcon as BoxIconSix } from "@/components/icons/quantityIcons/BoxIconSix";
import { BoxIconTwelve } from "@/components/icons/quantityIcons/BoxIconTwelve";
import { BoxIconTwentyFour } from "@/components/icons/quantityIcons/BoxIconTwentyFour";

export interface QuantityConfig {
  _id?: string;
  label: string; // e.g. "Box of 6"
  quantity: number;
  price: number;
}

interface QuantitySelectorProps {
  configs: QuantityConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

const QuantitySelector = ({
  configs,
  selectedId,
  onSelect,
  className,
}: QuantitySelectorProps) => {

  const getIcon = (quantity: number) => {
      if (quantity <= 6) return <BoxIconSix className="h-full w-full text-primary" />;
      if (quantity <= 12) return <BoxIconTwelve className="h-full w-full text-primary" />;
      return <BoxIconTwentyFour className="h-full w-full text-primary" />;
  };

  return (
    <div className={cn(className)}>
      <h3 className="font-body text-body font-bold text-primary mb-sm">
        Choose a size:
      </h3>
      <div className="flex gap-md overflow-x-auto pb-sm custom-scrollbar">
        {configs.map((config) => {
          // Fallback to label if _id is missing (should be there from DB though)
          const configId = config._id || config.label; 
          const isSelected = selectedId === configId;

          return (
            <button
              key={configId}
              type="button"
              onClick={() => onSelect(configId)}
              className={cn(
                "flex w-40 shrink-0 flex-col items-center gap-sm rounded-medium border   text-center transition-all duration-200",
                isSelected
                  ? "border-2 border-accent bg-background shadow-md"
                  : "border-border hover:border-accent-secondary hover:shadow-md"
              )}
            >
              <div className="flex h-24 w-24 items-center justify-center">
                 {getIcon(config.quantity)}
              </div>
              <div>
                <p className="font-body text-body font-bold text-primary">
                  {config.label}
                </p>
                <p className="font-body text-small text-primary/80">
                  {config.quantity} items
                </p>
                 <p className="font-body text-body font-bold text-accent mt-1">
                  ${config.price.toFixed(2)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuantitySelector;
