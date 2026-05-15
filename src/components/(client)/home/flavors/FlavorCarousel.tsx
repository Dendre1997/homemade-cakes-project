"use client";

import React, { useState, useEffect } from "react";
import { Flavor } from "@/types";
import { FlavorCard } from "./FlavorCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/shadcn-carousel";

interface FlavorCarouselProps {
  flavors: Flavor[];
}

export const FlavorCarousel = ({ flavors }: FlavorCarouselProps) => {
  const [activeFlavorId, setActiveFlavorId] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setActiveFlavorId(null);
    };

    api.on("select", handleSelect);

    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const handleToggle = (id: string) => {
    setActiveFlavorId((prev) => (prev === id ? null : id));
  };

  const handlePointerEnter = (e: React.PointerEvent, id: string) => {
    if (e.pointerType === "mouse") {
      setActiveFlavorId(id);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent, id: string) => {
    if (e.pointerType === "mouse") {
      setActiveFlavorId((prev) => (prev === id ? null : prev));
    }
  };

  if (!flavors || flavors.length === 0) return null;

  return (
    <div className="w-full relative px-12 md:px-16">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4 md:-ml-6 py-10">
          {flavors.map((flavor) => (
            <CarouselItem
              key={flavor._id.toString()}
              className="pl-4 md:pl-6 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
               <FlavorCard 
                 flavor={flavor} 
                 isFlipped={activeFlavorId === flavor._id.toString()}
                 onToggle={() => handleToggle(flavor._id.toString())}
                 onPointerEnter={(e) => handlePointerEnter(e, flavor._id.toString())}
                 onPointerLeave={(e) => handlePointerLeave(e, flavor._id.toString())}
               />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 md:-left-12 h-12 w-12 md:h-16 md:w-16" />
        <CarouselNext className="-right-4 md:-right-12 h-12 w-12 md:h-16 md:w-16" />
      </Carousel>
    </div>
  );
};
