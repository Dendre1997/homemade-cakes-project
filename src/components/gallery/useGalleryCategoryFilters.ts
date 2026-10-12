"use client";

import { useEffect, useState } from "react";
import type { GalleryCollectionCard, ProductCategory } from "@/types";

export function useGalleryCategoryFilters(enabled = true) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesWithGallery, setCategoriesWithGallery] = useState<Set<string>>(
    new Set(),
  );
  const [designCountByCategoryId, setDesignCountByCategoryId] = useState<
    Record<string, number>
  >({});
  const [totalDesignCount, setTotalDesignCount] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) throw new Error("Failed to load categories");

        const data: ProductCategory[] = await response.json();
        if (cancelled) return;

        setCategories(data);

        const allCardsResponse = await fetch("/api/gallery/collections");
        if (allCardsResponse.ok) {
          const allCards: GalleryCollectionCard[] = await allCardsResponse.json();
          if (!cancelled) {
            setTotalDesignCount(
              allCards.reduce((sum, card) => sum + (card.imageCount ?? 0), 0),
            );
          }
        }

        const counts: Record<string, number> = {};
        const visible = new Set<string>();

        await Promise.all(
          data.map(async (category) => {
            const cardsResponse = await fetch(
              `/api/gallery/collections?categoryId=${category._id}`,
            );
            if (!cardsResponse.ok) return;

            const cards: GalleryCollectionCard[] = await cardsResponse.json();
            if (cards.length === 0) return;

            visible.add(category._id);
            counts[category._id] = cards.reduce(
              (sum, card) => sum + (card.imageCount ?? 0),
              0,
            );
          }),
        );

        if (!cancelled) {
          setCategoriesWithGallery(visible);
          setDesignCountByCategoryId(counts);
        }
      } catch (error) {
        console.error("[useGalleryCategoryFilters]", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    categories,
    categoriesWithGallery,
    designCountByCategoryId,
    totalDesignCount,
    isLoading,
  };
}
