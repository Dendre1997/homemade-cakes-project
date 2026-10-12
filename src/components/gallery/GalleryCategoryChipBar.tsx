"use client";

import { LayoutGroup, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/types";

const ACTIVE_PILL_LAYOUT_ID = "gallery-category-active-pill";

type GalleryCategoryChipBarProps = {
  activeCategoryId: string;
  categories: ProductCategory[];
  designCountByCategoryId: Record<string, number>;
  totalDesignCount: number;
  onSelect: (categoryId: string | null) => void;
  className?: string;
  fadeFromClassName?: string;
};

function CategoryChip({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "relative inline-flex h-11 min-h-11 flex-shrink-0 snap-start items-center justify-center overflow-hidden",
        "whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition-all duration-150",
        isActive ? "font-bold text-white shadow-md" : "font-medium text-primary",
      )}
      aria-pressed={isActive}
    >
      {isActive && (
        <motion.span
          layoutId={ACTIVE_PILL_LAYOUT_ID}
          className="absolute inset-0 rounded-full bg-accent shadow-md"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}
      {!isActive && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-white/30 bg-white/40 shadow-sm backdrop-blur-md"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        <span>{label}</span>
        {count !== undefined && (
          <span
            className={cn(
              "text-xs tabular-nums",
              isActive ? "text-white/90" : "text-primary/60",
            )}
          >
            ({count})
          </span>
        )}
      </span>
    </motion.button>
  );
}

export function GalleryCategoryChipBar({
  activeCategoryId,
  categories,
  designCountByCategoryId,
  totalDesignCount,
  onSelect,
  className,
  fadeFromClassName = "from-white/80",
}: GalleryCategoryChipBarProps) {
  return (
    <div className={cn("relative", className)}>
      <LayoutGroup id="gallery-category-chips">
        <div
          className={cn(
            "flex w-full flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar",
            "snap-x snap-mandatory px-4 py-2",
            "sm:flex-wrap sm:justify-center sm:overflow-visible",
          )}
        >
          <CategoryChip
            label="All"
            count={totalDesignCount}
            isActive={activeCategoryId === "all"}
            onClick={() => onSelect(null)}
          />
          {categories.map((category) => (
            <CategoryChip
              key={category._id}
              label={category.name}
              count={designCountByCategoryId[category._id]}
              isActive={activeCategoryId === category._id}
              onClick={() => onSelect(category._id)}
            />
          ))}
        </div>
      </LayoutGroup>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent sm:hidden",
          fadeFromClassName,
        )}
      />
    </div>
  );
}
