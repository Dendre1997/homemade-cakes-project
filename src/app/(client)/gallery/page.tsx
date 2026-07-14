"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { GalleryCollectionCard, IGalleryImage, ProductCategory } from "@/types";
import {
  GALLERY_OTHER_COLLECTION_NAME,
  GALLERY_OTHER_COLLECTION_SLUG,
} from "@/lib/gallery/constants";
import LoadingSpinner from "@/components/ui/Spinner";
import GalleryDrillDownItem from "@/components/gallery/GalleryDrillDownItem";
import { useAlert } from "@/contexts/AlertContext";

function ExpandableDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [text]);

  const maxLength = 80;
  if (text.length < maxLength) {
    return (
      <div className="space-y-xs w-full">
        <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-wrap break-words">
          {text}
        </p>
      </div>
    );
  }

  const displayText = isExpanded ? text : `${text.slice(0, maxLength).trim()}...`;

  return (
    <div className="space-y-xs text-muted-foreground font-body leading-relaxed whitespace-pre-wrap break-words w-full">
      <span>{displayText}</span>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-accent font-bold hover:underline underline-offset-2 transition-all focus:outline-none inline-flex items-center"
      >
        {isExpanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}

function buildGalleryPath(categoryId: string | null, collectionSlug: string | null) {
  const params = new URLSearchParams();

  if (categoryId && categoryId !== "all") {
    params.set("categoryId", categoryId);
  }
  if (collectionSlug) {
    params.set("collection", collectionSlug);
  }

  const query = params.toString();
  return query ? `/gallery?${query}` : "/gallery";
}

function GalleryContent() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("categoryId");
  const collectionSlug = searchParams.get("collection");
  const activeCategory = categoryId ?? "all";
  const isDrillDown = Boolean(collectionSlug);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesWithGallery, setCategoriesWithGallery] = useState<Set<string>>(
    new Set()
  );
  const [collectionCards, setCollectionCards] = useState<GalleryCollectionCard[]>([]);
  const [images, setImages] = useState<IGalleryImage[]>([]);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const navigateGallery = useCallback(
    (next: { categoryId?: string | null; collection?: string | null }) => {
      const nextCategory =
        next.categoryId !== undefined ? next.categoryId : categoryId;
      const nextCollection =
        next.collection !== undefined ? next.collection : collectionSlug;

      router.push(
        buildGalleryPath(
          nextCategory ?? "all",
          nextCollection ?? null
        )
      );
    },
    [router, categoryId, collectionSlug]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) throw new Error("Failed to load categories");

        const data: ProductCategory[] = await response.json();
        if (cancelled) return;

        setCategories(data);

        const checks = await Promise.all(
          data.map(async (category) => {
            const cardsResponse = await fetch(
              `/api/gallery/collections?categoryId=${category._id}`
            );
            if (!cardsResponse.ok) return null;

            const cards: GalleryCollectionCard[] = await cardsResponse.json();
            return cards.length > 0 ? category._id : null;
          })
        );

        if (!cancelled) {
          setCategoriesWithGallery(
            new Set(checks.filter((id): id is string => Boolean(id)))
          );
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          showAlert("Could not load the gallery. Please try again later.", "error");
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [showAlert]);

  useEffect(() => {
    if (isDrillDown) return;

    let cancelled = false;

    async function loadCollectionCards() {
      try {
        setIsLoading(true);

        const url =
          activeCategory !== "all"
            ? `/api/gallery/collections?categoryId=${activeCategory}`
            : "/api/gallery/collections";

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load gallery collections");

        const data: GalleryCollectionCard[] = await response.json();
        if (!cancelled) {
          setCollectionCards(data);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          showAlert("Could not load the gallery. Please try again later.", "error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCollectionCards();

    return () => {
      cancelled = true;
    };
  }, [isDrillDown, activeCategory, showAlert]);

  useEffect(() => {
    if (!collectionSlug) return;

    let cancelled = false;

    async function loadCollectionImages() {
      try {
        setIsLoading(true);
        setCurrentIndex(null);

        const params = new URLSearchParams({ collectionId: collectionSlug! });
        if (activeCategory !== "all") {
          params.set("categoryId", activeCategory);
        }

        const response = await fetch(`/api/gallery?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to load gallery images");

        const data: IGalleryImage[] = await response.json();
        if (!cancelled) {
          setImages(data);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          showAlert("Could not load the gallery. Please try again later.", "error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCollectionImages();

    return () => {
      cancelled = true;
    };
  }, [collectionSlug, activeCategory, showAlert]);

  useEffect(() => {
    if (!collectionSlug) {
      setCollectionTitle("");
      return;
    }

    if (collectionSlug === GALLERY_OTHER_COLLECTION_SLUG) {
      setCollectionTitle(GALLERY_OTHER_COLLECTION_NAME);
      return;
    }

    let cancelled = false;

    async function loadCollectionTitle() {
      try {
        const response = await fetch(`/api/collections/slug/${collectionSlug}`);
        if (!response.ok) {
          if (!cancelled) setCollectionTitle(collectionSlug ?? "");
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setCollectionTitle(data.name ?? collectionSlug ?? "");
        }
      } catch {
        if (!cancelled) {
          setCollectionTitle(collectionSlug ?? "");
        }
      }
    }

    loadCollectionTitle();

    return () => {
      cancelled = true;
    };
  }, [collectionSlug]);

  const handleRequestDesign = useCallback(
    (image: IGalleryImage) => {
      const firstCategory = image.categories?.[0];
      const categoryName =
        categories.find((category) => category._id === firstCategory)?.name || "";

      const query = new URLSearchParams({
        category: categoryName,
        image: image.imageUrl || "",
      }).toString();

      router.push(`/custom-order?${query}`);
    },
    [categories, router]
  );

  const handleOpenModal = (index: number) => {
    setCurrentIndex(index);
  };

  const handleCloseModal = () => {
    setCurrentIndex(null);
  };

  const handleNext = useCallback(() => {
    if (currentIndex === null || images.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev! + 1) % images.length);
  }, [currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex === null || images.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev! - 1 + images.length) % images.length);
  }, [currentIndex, images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex === null) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") handleCloseModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, handleNext, handlePrev]);

  const currentImage = currentIndex !== null ? images[currentIndex] : null;

  const variants = {
    enter: (slideDirection: number) => ({
      x: slideDirection > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (slideDirection: number) => ({
      zIndex: 0,
      x: slideDirection < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  const visibleCategories = categories.filter((category) =>
    categoriesWithGallery.has(category._id)
  );

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="p-md md:p-lg max-w-7xl mx-auto">
      <header
        className={`text-center md:text-left ${isDrillDown ? "hidden lg:block lg:mb-lg" : "mb-lg"}`}
      >
        <h1 className="font-heading text-h2 md:text-h1 text-primary mb-xs">
          Portfolio Gallery
        </h1>
      </header>

      {!isDrillDown && (
        <section className="mb-lg overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          <div className="flex items-center gap-sm min-w-max">
            <Button
              variant={activeCategory === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() =>
                navigateGallery({ categoryId: null, collection: null })
              }
              className="rounded-full px-lg border border-border"
            >
              All
            </Button>
            {visibleCategories.map((category) => (
              <Button
                key={category._id}
                variant={activeCategory === category._id ? "primary" : "secondary"}
                size="sm"
                onClick={() =>
                  navigateGallery({
                    categoryId: category._id,
                    collection: null,
                  })
                }
                className="rounded-full px-lg border border-border"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </section>
      )}

      {isDrillDown ? (
        <>
          <div className="mb-2 lg:mb-lg">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateGallery({ collection: null })}
              className="rounded-full px-lg border border-border lg:mb-md"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Collections
            </Button>
            <h2 className="hidden lg:block font-heading text-h2 text-primary">
              {collectionTitle}
            </h2>
          </div>

          <section className="flex flex-col gap-4 lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:gap-3">
            {images.length > 0 ? (
              images.map((img, idx) => (
                <GalleryDrillDownItem
                  key={img._id.toString()}
                  image={img}
                  index={idx}
                  categories={categories}
                  onOpenModal={handleOpenModal}
                  onRequestDesign={handleRequestDesign}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-muted-foreground italic">
                No photos found in this collection yet.
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {collectionCards.length > 0 ? (
            collectionCards.map((card) => (
              <motion.button
                key={card._id}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                onClick={() => navigateGallery({ collection: card.slug })}
                className="group relative aspect-[4/3] overflow-hidden rounded-large bg-muted text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Image
                  src={card.latestImageUrl}
                  alt={card.name}
                  fill
                  quality={90}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300 group-hover:via-black/40" />
                <div className="absolute inset-x-0 bottom-0 p-md md:p-lg">
                  <h2 className="font-heading text-h3 md:text-h2 text-white leading-tight">
                    {card.name}
                  </h2>
                  <span className="mt-sm inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    {card.imageCount}{" "}
                    {card.imageCount === 1 ? "design" : "designs"}
                  </span>
                </div>
              </motion.button>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-muted-foreground italic">
              No collections found for this category yet.
            </div>
          )}
        </section>
      )}

      <Dialog
        open={currentIndex !== null}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 border-0 rounded-large shadow-2xl overflow-hidden flex flex-col bg-white">
          <DialogTitle className="sr-only">
            {currentImage?.title || "Gallery Item"}
          </DialogTitle>

          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="relative w-full h-[50vh] md:h-full md:w-3/5 bg-background/20 flex items-center justify-center group overflow-hidden touch-pan-x">
              <AnimatePresence mode="popLayout" custom={direction}>
                <motion.div
                  key={currentImage?._id?.toString()}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="relative w-full h-full flex items-center justify-center p-sm"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) handlePrev();
                    else if (info.offset.x < -100) handleNext();
                  }}
                >
                  {currentImage && (
                    <Image
                      src={currentImage.imageUrl}
                      alt={currentImage.title}
                      fill
                      quality={95}
                      className="object-contain"
                      sizes="(max-width: 1023px) 100vw, 60vw"
                      priority
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 flex items-center justify-between px-md pointer-events-none z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="pointer-events-auto p-2 rounded-full bg-subtleBackground/60 backdrop-blur-md text-primary hover:text-white hover:bg-primary transition-all active:scale-95 hidden md:block"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="pointer-events-auto p-2 rounded-full bg-subtleBackground/60 backdrop-blur-md text-primary hover:text-white hover:bg-primary transition-all active:scale-95 hidden md:block"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>
            </div>

            <div className="w-full flex-1 md:w-2/5 p-lg md:p-xl bg-white overflow-y-auto custom-scrollbar flex flex-col border-t md:border-t-0 md:border-l border-border">
              <div className="mb-lg">
                <h3 className="font-heading text-h3 text-primary mb-sm leading-tight">
                  {currentImage?.title}
                </h3>
                <div className="flex flex-wrap gap-xs mb-md">
                  {currentImage?.categories?.map((catId) => {
                    const cat = categories.find((c) => c._id === catId);
                    return cat ? (
                      <span
                        key={catId}
                        className="text-[10px] uppercase font-bold tracking-widest bg-subtleBackground text-muted-foreground px-2 py-0.5 rounded-full"
                      >
                        {cat.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="space-y-sm flex-1 min-w-0 w-full overflow-hidden">
                {currentImage?.description && (
                  <ExpandableDescription text={currentImage.description} />
                )}
              </div>

              <div className="pt-xl mt-lg border-t border-dotted">
                <Button
                  className="w-full h-12 rounded-full font-bold"
                  onClick={() => {
                    if (currentImage) {
                      handleRequestDesign(currentImage);
                    }
                  }}
                >
                  Request This Design
                </Button>
                <p className="mt-sm text-center text-[11px] text-muted-foreground">
                  Customizable to your date, size, and flavor
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}
