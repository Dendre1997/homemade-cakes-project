"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildGalleryPath } from "@/lib/gallery/buildGalleryPath";
import { GalleryBackChip } from "@/components/gallery/GalleryBackChip";
import { GalleryCategoryChipBar } from "@/components/gallery/GalleryCategoryChipBar";
import { useGalleryCategoryFilters } from "@/components/gallery/useGalleryCategoryFilters";

const galleryMobileNavShellClassName =
  "border-t border-white/20 bg-white/80 backdrop-blur-md";

export default function GalleryMobileNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collectionSlug = searchParams.get("collection");
  const categoryId = searchParams.get("categoryId");
  const activeCategory = categoryId ?? "all";

  const {
    categories,
    categoriesWithGallery,
    designCountByCategoryId,
    totalDesignCount,
  } = useGalleryCategoryFilters(!collectionSlug);

  const navigateGallery = useCallback(
    (next: { categoryId?: string | null; collection?: string | null }) => {
      const nextCategory =
        next.categoryId !== undefined ? next.categoryId : categoryId;
      const nextCollection =
        next.collection !== undefined ? next.collection : collectionSlug;

      router.push(
        buildGalleryPath(nextCategory ?? "all", nextCollection ?? null),
        { scroll: false },
      );
    },
    [router, categoryId, collectionSlug],
  );

  if (collectionSlug) {
    return (
      <div className={cn(galleryMobileNavShellClassName, "px-4 py-2")}>
        <GalleryBackChip onClick={() => navigateGallery({ collection: null })} />
      </div>
    );
  }

  const visibleCategories = categories.filter((category) =>
    categoriesWithGallery.has(category._id),
  );

  return (
    <div className={galleryMobileNavShellClassName}>
      <GalleryCategoryChipBar
        activeCategoryId={activeCategory}
        categories={visibleCategories}
        designCountByCategoryId={designCountByCategoryId}
        totalDesignCount={totalDesignCount}
        onSelect={(id) =>
          navigateGallery({ categoryId: id, collection: null })
        }
        fadeFromClassName="from-white/80"
      />
    </div>
  );
}
