"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type GalleryBackChipProps = {
  onClick: () => void;
  className?: string;
};

export function GalleryBackChip({ onClick, className }: GalleryBackChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap",
        "rounded-full border border-white/30 bg-white/40 px-5 py-2.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md",
        "transition-all duration-150",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      Back to Collections
    </motion.button>
  );
}
