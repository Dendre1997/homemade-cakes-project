"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { IGalleryImage, ProductCategory } from "@/types";

function ExpandableDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [text]);

  const maxLength = 80;
  if (text.length < maxLength) {
    return (
      <div className="w-full">
        <p className="text-muted-foreground font-body text-sm leading-relaxed whitespace-pre-wrap break-words">
          {text}
        </p>
      </div>
    );
  }

  const displayText = isExpanded ? text : `${text.slice(0, maxLength).trim()}...`;

  return (
    <div className="text-muted-foreground font-body text-sm leading-relaxed whitespace-pre-wrap break-words w-full">
      <span>{displayText}</span>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-accent font-bold hover:underline underline-offset-2 transition-all focus:outline-none inline-flex items-center"
      >
        {isExpanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}

export interface GalleryDrillDownItemProps {
  image: IGalleryImage;
  index: number;
  categories: ProductCategory[];
  onOpenModal: (index: number) => void;
  onRequestDesign: (image: IGalleryImage) => void;
}

export default function GalleryDrillDownItem({
  image,
  index,
  categories,
  onOpenModal,
  onRequestDesign,
}: GalleryDrillDownItemProps) {
  const imageCategories = image.categories
    ?.map((categoryId) => categories.find((category) => category._id === categoryId))
    .filter((category): category is ProductCategory => Boolean(category));

  return (
    <article className="flex flex-col border-b border-border pb-4 last:border-b-0 [content-visibility:auto] lg:contents lg:border-0 lg:pb-0">
      <div className="relative -mx-md md:-mx-lg aspect-[4/5] bg-muted lg:mx-0 lg:aspect-square lg:overflow-hidden lg:rounded-medium lg:group">
        <Image
          src={image.imageUrl}
          alt={image.title}
          fill
          priority={index < 2}
          quality={90}
          className="object-cover lg:transition-transform lg:duration-700 lg:group-hover:scale-110"
          sizes="(max-width: 1023px) 100vw, 25vw"
        />

        <button
          type="button"
          aria-label={`View ${image.title}`}
          onClick={() => onOpenModal(index)}
          className="hidden lg:block absolute inset-0 z-10 cursor-pointer"
        />

        <div className="hidden lg:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex-col items-center justify-center text-center p-xs pointer-events-none">
          <span className="text-white text-small font-bold line-clamp-2 px-sm drop-shadow-md">
            {image.title}
          </span>
        </div>
      </div>

      <Button
        className="lg:hidden w-full md:-mx-lg h-10 rounded-none text-sm font-semibold"
        onClick={() => onRequestDesign(image)}
      >
        Request This Design
      </Button>

      <div className="lg:hidden px-md pt-3 pb-2 space-y-2">
        <h3 className="font-heading text-h3 text-primary leading-tight">
          {image.title}
        </h3>

        {imageCategories && imageCategories.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {imageCategories.map((category) => (
              <span
                key={category._id}
                className="text-[10px] uppercase font-bold tracking-widest bg-subtleBackground text-muted-foreground px-2 py-0.5 rounded-full"
              >
                {category.name}
              </span>
            ))}
          </div>
        )}

        {image.description && (
          <ExpandableDescription text={image.description} />
        )}
      </div>
    </article>
  );
}
