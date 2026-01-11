"use client";

import React from "react";
import { Flavor } from "@/types";
import { FlavorCard } from "./FlavorCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/shadcn-carousel";

interface FlavorCarouselProps {
  flavors: Flavor[];
}

export const FlavorCarousel = ({ flavors }: FlavorCarouselProps) => {
  if (!flavors || flavors.length === 0) return null;

  return (
    <div className="w-full relative px-12">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {flavors.map((flavor) => (
            <CarouselItem
              key={flavor._id}
              className="pl-4 basis-full md:basis-1/2 lg:basis-1/3"
            >
              <div className="h-full p-1">
                 <FlavorCard flavor={flavor} className="h-40" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};
