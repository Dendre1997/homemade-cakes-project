"use client";

import Link from "next/link";
import { useActiveSeasonal } from "@/hooks/useActiveSeasonal";
import { ArrowRight, Sparkles } from "lucide-react";

const SeasonalHeaderBar = () => {
  const { activeEvent, isLoading } = useActiveSeasonal();
  if (isLoading || !activeEvent) return null;

  return (
    <div
      className="w-full py-2 px-4 text-center relative overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: activeEvent.themeColor || "#000" }}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 relative z-10">
        <Sparkles className="w-4 h-4 text-white animate-pulse" />

        <p className="text-sm font-body font-medium text-white tracking-wide">
          <span className="font-bold">{activeEvent.name}</span> is here! Check
          out our limited edition treats.
        </p>

        <Link
          href={`/specials/${activeEvent.slug}`}
          className="group flex items-center gap-1 text-sm font-bold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white transition-all"
        >
          Shop Collection
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      <div className="absolute top-0 left-0 w-full h-full bg-white/10 skew-x-[-20deg] animate-[shimmer_3s_infinite] -translate-x-full" />

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
};

export default SeasonalHeaderBar;
