"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { IGalleryImage, ProductCategory } from "@/types";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";

export default function GalleryPage() {
  const { showAlert } = useAlert();

  // -- State --
  const [images, setImages] = useState<IGalleryImage[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  // -- Data Fetching --
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [galleryRes, categoriesRes] = await Promise.all([
        fetch("/api/gallery"),
        fetch("/api/categories")
      ]);

      if (!galleryRes.ok || !categoriesRes.ok) throw new Error("Failed to load gallery");

      const galleryData = await galleryRes.json();
      const categoriesData = await categoriesRes.json();

      setImages(galleryData);
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
      showAlert("Could not load the gallery. Please try again later.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -- Derived State (Logic Trap Fix) --
  const filteredImages = useMemo(() => {
    if (activeCategory === "all") return images;
    return images.filter((img) => 
      img.categories?.includes(activeCategory)
    );
  }, [images, activeCategory]);

  // -- Modal Controls --
  const handleOpenModal = (index: number) => {
    setCurrentIndex(index);
  };

  const handleCloseModal = () => {
    setCurrentIndex(null);
  };

  const handleNext = useCallback(() => {
    if (currentIndex === null || filteredImages.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev! + 1) % filteredImages.length);
  }, [currentIndex, filteredImages.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex === null || filteredImages.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev! - 1 + filteredImages.length) % filteredImages.length);
  }, [currentIndex, filteredImages.length]);

  // Keyboard navigation
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

  // -- Render Helpers --
  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const currentImage = currentIndex !== null ? filteredImages[currentIndex] : null;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0
    })
  };

  return (
    <main className="p-md md:p-lg max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-lg text-center md:text-left">
        <h1 className="font-heading text-h2 md:text-h1 text-primary mb-xs">Portfolio Gallery</h1>
      </header>

      {/* Category Tabs/Pills */}
      <section className="mb-lg overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
        <div className="flex items-center gap-sm min-w-max">
          <Button
            variant={activeCategory === "all" ? "primary" : "secondary"}
            size="sm"
            onClick={() => { setActiveCategory("all"); setCurrentIndex(null); }}
            className="rounded-full px-lg border border-border"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat._id}
              variant={activeCategory === cat._id ? "primary" : "secondary"}
              size="sm"
              onClick={() => { setActiveCategory(cat._id); setCurrentIndex(null); }}
              className="rounded-full px-lg border border-border"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Image Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
        {filteredImages.length > 0 ? (
          filteredImages.map((img, idx) => (
            <motion.div
              layout
              key={img._id.toString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={() => handleOpenModal(idx)}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-medium bg-muted"
            >
              <Image
                src={img.imageUrl}
                alt={img.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
              />
              {/* Subtle Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-xs">
                <span className="text-white text-small font-bold line-clamp-2 px-sm drop-shadow-md">
                  {img.title}
                </span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-muted-foreground italic">
            No photos found in this category yet.
          </div>
        )}
      </section>

      {/* Swipeable Detail Modal */}
      <Dialog open={currentIndex !== null} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 border-0 rounded-large shadow-2xl overflow-hidden flex flex-col bg-white">
          <DialogTitle className="sr-only">{currentImage?.title || "Gallery Item"}</DialogTitle>
          
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Image Section (Stack Top on Mobile, Left on Desktop) */}
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
                    opacity: { duration: 0.2 }
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
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 60vw"
                      priority
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows (Hidden on mobile touch by layout but functional) */}
              <div className="absolute inset-0 flex items-center justify-between px-md pointer-events-none z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  className="pointer-events-auto p-2 rounded-full bg-subtleBackground/60 backdrop-blur-md text-primary hover:text-white hover:bg-primary transition-all active:scale-95 hidden md:block"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="pointer-events-auto p-2 rounded-full bg-subtleBackground/60 backdrop-blur-md text-primary hover:text-white hover:bg-primary transition-all active:scale-95 hidden md:block"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>

            </div>

            {/* Info Section (Stack Bottom on Mobile, Right on Desktop) */}
            <div className="w-full flex-1 md:w-2/5 p-lg md:p-xl bg-white overflow-y-auto custom-scrollbar flex flex-col border-t md:border-t-0 md:border-l border-border">
              <div className="mb-lg">
                <h3 className="font-heading text-h3 text-primary mb-sm leading-tight">
                  {currentImage?.title}
                </h3>
                <div className="flex flex-wrap gap-xs mb-md">
                   {currentImage?.categories?.map(catId => {
                     const cat = categories.find(c => c._id === catId);
                     return cat ? (
                       <span key={catId} className="text-[10px] uppercase font-bold tracking-widest bg-subtleBackground text-muted-foreground px-2 py-0.5 rounded-full">
                         {cat.name}
                       </span>
                     ) : null;
                   })}
                </div>
              </div>

              <div className="space-y-md flex-1">
                {currentImage?.description && (
                  <div className="space-y-xs">
                    <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">
                      {currentImage.description}
                    </p>
                  </div>
                )}
                
                  <div className="flex items-center gap-sm bg-accent/5 p-md rounded-medium border border-accent/10">
                    <Info className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-small font-bold text-accent uppercase tracking-wider">Design Estimate</p>
                {currentImage && typeof currentImage.decorationPrice === 'number' && currentImage.decorationPrice > 0 ? (
                      <p className="text-sm text-primary">
                        Starts at ${currentImage.decorationPrice.toFixed(2)} for this level of decoration
                      </p>
                  ) : (
                    <p className="text-sm text-primary">
                    The is no extra cost for this design.
                    </p>
                  )}
                    </div>
                  </div>
                
              </div>

              <div className="pt-xl mt-lg border-t border-dotted">
                <Button 
                  className="w-full h-12 rounded-full font-bold"
                  onClick={() => {
                    const firstCategory = currentImage?.categories?.[0];
                    const categoryName = categories.find(c => c._id === firstCategory)?.name || "";
                    
                    const query = new URLSearchParams({
                      category: categoryName,
                      image: currentImage?.imageUrl || ""
                    }).toString();

                    router.push(`/custom-order?${query}`);
                  }}
                >
                  Order a Similar Design
                </Button>
                <p className="mt-sm text-center text-[11px] text-muted-foreground">
                   Each design is unique and tailored to your preferences.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
