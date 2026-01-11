"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { SeasonalEvent } from "@/types";

interface SeasonalHomeBannerProps {
  activeEvent: SeasonalEvent | null;
}

const SeasonalHomeBanner = ({ activeEvent }: SeasonalHomeBannerProps) => {
  if (!activeEvent) return null;

  return (
    <section className="w-full py-md md:py-lg">
      <div className="mx-auto max-w-7xl px-lg">
        {/* Container with theme border */}
        <div
          className="relative w-full rounded-large overflow-hidden shadow-xl group"
          style={{ borderBottom: `6px solid ${activeEvent.themeColor}` }}
        >
          {/* --- Background Image --- */}
          <div className="relative h-[300px] md:h-[450px] w-full">
            {activeEvent.heroBannerUrl ? (
              <Image
                src={activeEvent.heroBannerUrl}
                alt={activeEvent.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="w-full h-full bg-neutral-800" />
            )}

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>

          {/* --- Content --- */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-2xl text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 w-fit backdrop-blur-md bg-white/10 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Limited Time Event
            </div>

            <h2
              className="font-heading text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg"
              style={{ textShadow: `0 4px 20px ${activeEvent.themeColor}` }}
            >
              {activeEvent.name}
            </h2>

            {activeEvent.description && (
              <p className="font-body text-lg md:text-xl text-white/90 mb-8 line-clamp-2 max-w-lg">
                {activeEvent.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={`/specials/${activeEvent.slug}`}>
                <Button
                  size="lg"
                  className="border-none font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: activeEvent.themeColor,
                    color: "#fff",
                  }}
                >
                  Explore Collection
                </Button>
              </Link>

              <div className="flex items-center gap-2 text-sm text-white/70 font-mono bg-black/30 px-4 py-2 rounded-md backdrop-blur-sm w-fit">
                <span>Available until:</span>
                <span className="text-white font-bold">
                  {format(new Date(activeEvent.endDate), "MMM d")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeasonalHomeBanner;
