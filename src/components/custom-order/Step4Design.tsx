import { useFormContext, Controller } from "react-hook-form";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { useState, useEffect, useMemo } from "react";
import { Check, AlertCircle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import Image from "next/image";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";
import { MultiImageUpload } from "@/components/custom-order/MultiImageUpload";

export default function Step4Design() {
  const { control, watch, setValue, formState: { errors } } = useFormContext<CustomOrderFormData>();
  const textOnCakeWatcher = watch("details.textOnCake");
  const [showInscriptionInput, setShowInscriptionInput] = useState(!!textOnCakeWatcher);
  
  // Carousel Data State
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogImages, setCatalogImages] = useState<string[]>([]);

  // Wizard Data
  const categoryName = watch("category");
  const referenceImages = watch("referenceImages") || []; // Up to 3

  // Fetch Pipeline: Categories -> Products
  useEffect(() => {
    async function fetchCatalogInspiration() {
      setIsLoadingCatalog(true);
      try {
        const catRes = await fetch("/api/categories");
        if (!catRes.ok) throw new Error("Failed to load categories");
        const categories = await catRes.json();

        const activeCategoryId = categories.find((c: any) => {
           const displayName = c.name.endsWith('s') || c.name.endsWith('S') ? c.name.slice(0, -1) : c.name;
           return displayName === categoryName || c.name === categoryName;
        })?._id;

        if (activeCategoryId) {
           const prodRes = await fetch(`/api/products?categoryId=${activeCategoryId}`);
           if (prodRes.ok) {
              const products = await prodRes.json();
              // Extract first image from every active product in this category
              const images = products
                .map((p: any) => p.imageUrls?.[0])
                .filter(Boolean);
                
              // Deduplicate strings just in case
              const uniqueImages = Array.from(new Set(images)) as string[];
              setCatalogImages(uniqueImages);
           }
        }
      } catch (err) {
        console.error("Failed to fetch inspiration catalog", err);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    
    if (categoryName) fetchCatalogInspiration();
  }, [categoryName]);

  // Derived Limitations
  const maxImages = 3;
  const currentTotal = referenceImages.length;
  const isAtCapacity = currentTotal >= maxImages;
  const remainingSlots = maxImages - currentTotal;

  const handleToggleCarouselImage = (url: string) => {
    const isAlreadySelected = referenceImages.includes(url);
    
    if (isAlreadySelected) {
       setValue("referenceImages", referenceImages.filter((u) => u !== url), { shouldValidate: true });
    } else {
       if (isAtCapacity) {
          alert("Maximum of 3 images reached. Deselect an image to add a different one.");
          return;
       }
       setValue("referenceImages", [...referenceImages, url], { shouldValidate: true });
    }
  };

  // Split images for visual grouping (Uploaded vs Catalog)
  const uploadedSelectedImages = referenceImages.filter(url => !catalogImages.includes(url));
  const catalogSelectedImagesCount = referenceImages.filter(url => catalogImages.includes(url)).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="text-center">
        <p className="text-primary/70 mt-2">
          Pick from our catalog or upload your own references.
        </p>
      </div>

      <div className="space-y-10">
        {/* ROW 1: INSPIRATION CAROUSEL */}
        <div className="border-b border-primary/10 pb-10">
          <h3 className="font-heading text-xl text-primary mb-2">
            Our Creations
          </h3>
          <p className="text-sm text-primary/60 mb-4">
            Tap any design to use it as inspiration for your order
          </p>

          {isLoadingCatalog ? (
            <div className="flex justify-center -my-32 scale-[0.4]">
              <Spinner />
            </div>
          ) : catalogImages.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
              {catalogImages.map((imgUrl, idx) => {
                const isSelected = referenceImages.includes(imgUrl);
                // Can't click unselected if at capacity
                const isDisabled = !isSelected && isAtCapacity;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleCarouselImage(imgUrl)}
                    disabled={isDisabled}
                    className={`relative w-40 h-40 shrink-0 snap-center rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
                      isSelected
                        ? "ring-4 ring-accent scale-95"
                        : "border border-border hover:brightness-110"
                    } ${isDisabled ? "opacity-40 cursor-not-allowed grayscale" : ""}`}
                  >
                    <Image
                      src={imgUrl}
                      alt="Catalog Inspiration"
                      fill
                      className={`object-cover ${isSelected ? "" : "opacity-90"}`}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                        <div className="bg-white rounded-full p-2 shadow-lg">
                          <Check className="w-6 h-6 text-accent" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-primary/50 italic bg-subtleBackground p-4 rounded-xl text-center">
              No images available for this category yet.
            </p>
          )}
        </div>

        {/* SECURE MIDDLE FEEDBACK ZONE */}
        <div className="bg-subtleBackground p-4 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-primary">
              Reference Capacity:{" "}
              <span className={isAtCapacity ? "text-red-500" : "text-accent"}>
                {currentTotal} / 3
              </span>
            </p>
            {catalogSelectedImagesCount > 0 && (
              <p className="text-xs text-primary/60 mt-1">
                {catalogSelectedImagesCount} catalog image(s) selected. You can
                upload up to {maxImages - currentTotal} of your own.
              </p>
            )}
          </div>
          {isAtCapacity && (
            <p className="text-sm font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full whitespace-nowrap">
              Maximum Reached
            </p>
          )}
        </div>

        {/* ROW 2: UPLOAD ZONE */}
        <div className="border-b border-primary/10 pb-10">
          <h3 className="font-heading text-xl text-primary mb-2">
            Upload Your Idea
          </h3>
          <p className="text-sm text-primary/60 mb-4">
            Upload photos to show us your inspiration
          </p>

          <MultiImageUpload
            value={uploadedSelectedImages}
            onChange={(newUploads) => {
              const currentCatalogPicks = referenceImages.filter((url) =>
                catalogImages.includes(url),
              );
              setValue(
                "referenceImages",
                [...currentCatalogPicks, ...newUploads],
                { shouldValidate: true },
              );
            }}
            maxImages={maxImages - catalogSelectedImagesCount}
          />
          {errors.referenceImages && (
            <p className="text-red-500 text-sm mt-4 flex items-center gap-1 font-medium bg-red-50 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />{" "}
              {errors.referenceImages.message}
            </p>
          )}
        </div>

        {/* ROW 3: TEXT INPUTS */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center space-x-3">
              <Switch
                id="inscription-toggle"
                checked={showInscriptionInput}
                onCheckedChange={(checked) => {
                  setShowInscriptionInput(checked);
                  if (!checked)
                    setValue("details.textOnCake", "", {
                      shouldValidate: true,
                    });
                }}
              />
              <Label
                htmlFor="inscription-toggle"
                className="font-heading font-semibold text-lg cursor-pointer text-primary"
              >
                Add Cake writing / Inscription{" "}
                <span className="text-primary/50 text-base font-normal tracking-wide">
                  (Optional)
                </span>
              </Label>
            </div>

            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out overflow-hidden",
                showInscriptionInput
                  ? "grid-rows-[1fr] opacity-100 mt-4"
                  : "grid-rows-[0fr] opacity-0 mt-0",
              )}
            >
              <div className="min-h-0">
                <p className="text-xs text-primary/60 mb-3 block">
                  Max 35 characters. Type exactly as you want it written.
                </p>
                <Controller
                  control={control}
                  name="details.textOnCake"
                  render={({ field }) => (
                    <div className="relative">
                      <Textarea
                        {...field}
                        maxLength={35}
                        placeholder="e.g. Happy 3rd Birthday Mia!"
                        className="resize-none h-20 text-primary bg-subtleBackground"
                      />
                      <span className="absolute bottom-2 right-2 text-xs text-primary/40 font-medium">
                        {field.value?.length || 0} / 35
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <label className="font-heading font-semibold text-lg mb-2 block text-primary">
              Your Design Ideas
            </label>
            <p className="text-xs text-primary/60 mb-3">
              Tell us about colors, themes, or any special ideas you have.
            </p>
            <Controller
              control={control}
              name="details.designNotes"
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="I want a vintage heart style with heavy piping, mainly baby pink with white borders..."
                  className={`h-32 bg-subtleBackground ${errors.details?.designNotes ? "border-red-500 ring-1 ring-red-500" : ""}`}
                />
              )}
            />
            {errors.details?.designNotes && (
              <p className="text-red-500 text-sm mt-3 flex items-center gap-1 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />{" "}
                {errors.details.designNotes.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
