"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/Select";
import { AlertTriangle, Image as ImageIcon, Trash2, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useEffect, useMemo } from "react";
import { AddonAdminSelector } from "@/components/admin/addons/AddonAdminSelector";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { addonQuantityMark, addonUnitCost } from "@/lib/addons/selectedAddonMath";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import ImagePreviewGallery from "@/components/ui/ImagePreviewGallery";
import { AdminTierFlavorEditor } from "@/components/admin/shared/AdminTierFlavorEditor";
import HybridSelector from "@/components/admin/custom-orders/HybridSelector";
import { Flavor, IShape, CustomOrderItem, ProductCategory, Diameter, CatalogSet } from "@/types";
import {
  compileComboFlavorLabel,
  compileSetFlavorLabel,
  customOrderCakeFlavorName,
  customOrderFlavorNames,
  findFlavorBySavedName,
  flavorIdsFromSavedNames,
  formatCustomOrderFlavorSummary,
} from "@/lib/sets/customOrderSets";
import { BakerFlavorChips, FlavorPills } from "@/components/admin/custom-orders/BakerFlavorChips";
import {
  resolveCustomOrderItemCategoryId,
  resolveCustomOrderItemCategoryName,
} from "@/lib/customOrderCategory";
import {
  buildTierSelections,
  compileCustomOrderFlavorLabel,
  getTierSizeLabels,
  tierFlavorsFromSelections,
  resolveFlavorId,
  resolveDiameterId,
} from "@/lib/tierSelections";

function categoryIdsInclude(
  categoryIds: unknown[] | undefined,
  categoryId: string
): boolean {
  if (!Array.isArray(categoryIds)) return false;
  return categoryIds.some((id) => String(id) === String(categoryId));
}

function filterByCategory<T extends { categoryIds?: unknown[] }>(
  items: T[],
  categoryId: string | null
): T[] {
  if (!categoryId) return items;
  const filtered = items.filter((item) =>
    categoryIdsInclude(item.categoryIds, categoryId)
  );
  return filtered.length > 0 ? filtered : items;
}

interface CustomOrderSpecsFormProps {
  order: any;
  shapes?: IShape[];
  /** Update a single item field (e.g. "details", "category", "agreedPrice"). */
  onItemChange: (index: number, field: string, value: any) => void;
  /** Update an order-level field (e.g. "allergies"). */
  onOrderChange: (field: string, value: any) => void;
  /** Upload reference images for a specific item. */
  onItemImageUpload: (index: number, files: FileList) => Promise<void>;
  isUploading: boolean;
  agreedPriceTotal: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-item editor
// ─────────────────────────────────────────────────────────────────────────────

interface ItemSpecEditorProps {
  item: CustomOrderItem;
  index: number;
  itemCount: number;
  shapes: IShape[];
  flavors: Flavor[];
  categories: ProductCategory[];
  diameters: Diameter[];
  sets: CatalogSet[];
  onItemChange: (index: number, field: string, value: any) => void;
  onItemImageUpload: (index: number, files: FileList) => Promise<void>;
  isUploading: boolean;
}

function ItemSpecEditor({
  item,
  index,
  itemCount,
  shapes,
  flavors,
  categories,
  diameters,
  sets,
  onItemChange,
  onItemImageUpload,
  isUploading,
}: ItemSpecEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [imageToDeleteIndex, setImageToDeleteIndex] = useState<number | null>(null);
  const [tierFlavors, setTierFlavors] = useState<Record<number, string>>({});
  const [isDesignQuoteManuallyEdited, setIsDesignQuoteManuallyEdited] = useState(false);

  const details: any = item.details || {};
  const referenceImages: string[] = item.referenceImages || [];

  const calculateAutoDesignQuote = (agreedPrice: number) =>
    Math.max(0, agreedPrice - (Number(item.approximatePrice) || 0));

  const handleAgreedPriceChange = (raw: string) => {
    if (raw === "") {
      setIsDesignQuoteManuallyEdited(false);
      onItemChange(index, "agreedPrice", null);
      onItemChange(index, "designQuote", null);
      return;
    }

    const agreedPrice = Number(raw);
    if (Number.isNaN(agreedPrice)) return;

    onItemChange(index, "agreedPrice", agreedPrice);

    if (agreedPrice <= 0) {
      setIsDesignQuoteManuallyEdited(false);
      onItemChange(index, "designQuote", null);
      return;
    }

    if (!isDesignQuoteManuallyEdited) {
      onItemChange(index, "designQuote", calculateAutoDesignQuote(agreedPrice));
    }
  };

  const handleDesignQuoteChange = (raw: string) => {
    setIsDesignQuoteManuallyEdited(true);
    onItemChange(
      index,
      "designQuote",
      raw === "" ? null : Number(raw)
    );
  };

  const resolvedCategoryId = useMemo(
    () => resolveCustomOrderItemCategoryId(item, categories),
    [item.categoryId, item.category, categories]
  );

  const categoryDisplayName = useMemo(
    () => resolveCustomOrderItemCategoryName(item, categories),
    [item.categoryId, item.category, categories]
  );

  const selectableCategories = useMemo(
    () => categories.filter((c) => c.categoryType !== "combo"),
    [categories]
  );

  const activeFlavors = useMemo(() => {
    return filterByCategory(flavors, resolvedCategoryId);
  }, [flavors, resolvedCategoryId]);

  const activeDiameters = useMemo(() => {
    return filterByCategory(diameters, resolvedCategoryId).sort(
      (a, b) => (a.sizeValue || 0) - (b.sizeValue || 0)
    );
  }, [diameters, resolvedCategoryId]);

  const selectedSingleFlavorId = useMemo(
    () => resolveFlavorId(details.flavor, activeFlavors),
    [details.flavor, activeFlavors]
  );

  const activeCategory = useMemo(
    () => categories.find((category) => String(category._id) === resolvedCategoryId),
    [categories, resolvedCategoryId]
  );
  const categoryType = activeCategory?.categoryType;
  const isSetLine = categoryType === "set";
  const isComboLine = categoryType === "combo";
  const flavorText = String(details.flavor ?? "");
  const bentoCategoryId = categories.find((category) =>
    category.name.toLowerCase().includes("bento")
  )?._id;
  const treatCategoryId = categories.find((category) =>
    category.name.toLowerCase().includes(
      categoryDisplayName.toLowerCase().includes("macaron") ? "macaron" : "cupcake"
    )
  )?._id;
  const flavorsFor = (categoryId?: string) => {
    if (!categoryId) return activeFlavors;
    const matched = flavors.filter((flavor) =>
      categoryIdsInclude(flavor.categoryIds, String(categoryId))
    );
    return matched.length > 0 ? matched : activeFlavors;
  };
  const treatPool = isComboLine ? flavorsFor(treatCategoryId ? String(treatCategoryId) : undefined) : activeFlavors;
  const cakePool = isComboLine ? flavorsFor(bentoCategoryId ? String(bentoCategoryId) : undefined) : activeFlavors;
  const treatSource = isComboLine
    ? flavorText.match(/Treats:\s*\[([^\]]*)\]/)?.[1] ?? ""
    : flavorText;
  const selectedTreatIds = isSetLine || isComboLine
    ? flavorIdsFromSavedNames(treatPool, treatSource)
    : [];
  const selectedCake = isComboLine
    ? findFlavorBySavedName(cakePool, customOrderCakeFlavorName(flavorText) ?? "")
    : undefined;
  const chosenSet = sets.find((set) => String(set._id) === String(details.setId));
  const flavorSummary = formatCustomOrderFlavorSummary(flavorText, categoryType);

  const writeTreatIds = (nextIds: string[]) => {
    const names = nextIds
      .map((id) => treatPool.find((flavor) => String(flavor._id) === id)?.name ?? "")
      .filter(Boolean);
    if (isComboLine) {
      updateDetails({
        flavor: compileComboFlavorLabel(
          names,
          selectedCake?.name || customOrderCakeFlavorName(flavorText) || ""
        ),
      });
      return;
    }
    updateDetails({ flavor: compileSetFlavorLabel(names), tiers: undefined });
  };

  const sizeHybridValue = useMemo(() => {
    const resolveFromPool = (pool: Diameter[]) =>
      resolveDiameterId(details.diameterId, pool) ||
      resolveDiameterId(details.size, pool);

    const resolvedId =
      resolveFromPool(activeDiameters) || resolveFromPool(diameters);
    if (resolvedId) return resolvedId;
    return details.size || "";
  }, [details.diameterId, details.size, activeDiameters, diameters]);

  const resolvedDiameter = useMemo(() => {
    const pool = activeDiameters.length > 0 ? activeDiameters : diameters;
    const resolvedId =
      resolveDiameterId(details.diameterId, pool) ||
      resolveDiameterId(details.size, pool);
    if (resolvedId) {
      return pool.find((d) => String(d._id) === resolvedId);
    }
    return undefined;
  }, [activeDiameters, diameters, details.diameterId, details.size]);

  const tiersCount = details.tiers?.length ?? resolvedDiameter?.tiersCount ?? 1;
  const isMultiTier = tiersCount > 1;

  const tierSizes = useMemo(() => {
    if (details.tiers?.length) {
      return details.tiers.map((t: { sizeLabel: string }) => t.sizeLabel);
    }
    return getTierSizeLabels(resolvedDiameter);
  }, [details.tiers, resolvedDiameter]);

  useEffect(() => {
    if (details.tiers?.length) {
      setTierFlavors(tierFlavorsFromSelections(details.tiers, activeFlavors));
    }
  }, [details.tiers, activeFlavors]);

  const updateDetails = (patch: Record<string, any>) =>
    onItemChange(index, "details", { ...details, ...patch });

  const handleCategoryChange = (categoryId: string) => {
    const cat = categories.find((c) => String(c._id) === categoryId);
    onItemChange(index, "__patch", {
      categoryId,
      category: cat?.name ?? "",
    });
  };

  const handleSizeChange = (val: string, isCustom: boolean) => {
    if (isCustom) {
      updateDetails({
        size: val,
        diameterId: undefined,
      });
      return;
    }

    const diam = activeDiameters.find((d) => String(d._id) === val);
    const patch: Record<string, any> = {
      size: diam?.name ?? "",
      diameterId: val,
    };
    if ((diam?.tiersCount ?? 1) <= 1) {
      patch.tiers = undefined;
    }
    updateDetails(patch);
  };

  const handleTierFlavorChange = (tierIndex: number, flavorId: string) => {
    const nextTierFlavors = { ...tierFlavors, [tierIndex]: flavorId };
    setTierFlavors(nextTierFlavors);

    const tiers = buildTierSelections(
      tiersCount,
      tierSizes,
      nextTierFlavors,
      activeFlavors
    );
    updateDetails({
      tiers,
      flavor: compileCustomOrderFlavorLabel(tiers),
      diameterId: details.diameterId ?? resolvedDiameter?._id?.toString(),
    });
  };

  const handleRemoveImage = (imgIndex: number) => {
    const newImages = [...referenceImages];
    newImages.splice(imgIndex, 1);
    onItemChange(index, "referenceImages", newImages);
  };

  const handleConfirmDeleteImage = () => {
    if (imageToDeleteIndex === null) return;
    handleRemoveImage(imageToDeleteIndex);
    setImageToDeleteIndex(null);
    setGalleryIndex(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onItemImageUpload(index, e.target.files);
    }
  };

  const scanPrice = typeof item.agreedPrice === "number" && !Number.isNaN(item.agreedPrice)
    ? item.agreedPrice
    : Number(item.approximatePrice) || 0;
  const scanSize = details.size && !/^[a-f0-9]{24}$/i.test(String(details.size)) ? String(details.size) : "";

  return (
    <div className="space-y-4 rounded-2xl border border-primary/10 bg-background/30 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {details.setImageUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-primary/15">
              <Image src={details.setImageUrl} alt="" fill sizes="64px" className="object-cover" />
            </div>
          ) : null}
          <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary/45">
            {itemCount > 1 ? `Item ${index + 1}` : "Item"}
          </p>
          <p className="truncate text-sm font-semibold text-primary">
            {categoryDisplayName || item.category || "Product"}
          </p>
          <p className="truncate text-xs text-primary/65">
            {[scanSize, flavorSummary].filter(Boolean).join(" · ") || "Size and flavor not set"}
          </p>
          {(isSetLine || isComboLine) && selectedTreatIds.length > 0 && (
            <div className="mt-2">
              <FlavorPills
                labels={
                  isComboLine
                    ? customOrderFlavorNames(flavorText, "combo")
                    : customOrderFlavorNames(flavorText, "set")
                }
              />
            </div>
          )}
          </div>
        </div>
        <p className="shrink-0 text-base font-bold tabular-nums text-accent">
          ${scanPrice.toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-sm">
          <Label className="text-xs font-medium text-primary/55">Category</Label>
          <Select
            value={resolvedCategoryId || undefined}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="h-11 rounded-xl sm:h-10">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {selectableCategories.map((cat) => (
                <SelectItem key={String(cat._id)} value={String(cat._id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!resolvedCategoryId && item.category && (
            <p className="text-xs text-muted-foreground">
              Saved category: {item.category} (select a match above)
            </p>
          )}
        </div>

        <div className="space-y-sm">
          <Label className="text-xs font-medium text-primary/55">Price Estimate ($)</Label>
          <Input
            type="number"
            value={item.approximatePrice ?? ""}
            onChange={(e) =>
              onItemChange(
                index,
                "approximatePrice",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="h-11 rounded-xl font-mono font-bold tabular-nums sm:h-10"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-sm">
          <HybridSelector
            label="Size / Configuration"
            options={activeDiameters}
            value={sizeHybridValue}
            onChange={handleSizeChange}
          />
        </div>
        {!isMultiTier && !isSetLine && !isComboLine && (
          <div className="space-y-sm">
            <Label className="text-xs font-medium text-primary/55">Flavor Profile</Label>
            <Select
              value={selectedSingleFlavorId || undefined}
              onValueChange={(flavorId) => {
                const flavor = activeFlavors.find(
                  (f) => String(f._id) === flavorId
                );
                updateDetails({
                  flavor: flavor?.name ?? "",
                  tiers: undefined,
                });
              }}
              disabled={activeFlavors.length === 0}
            >
              <SelectTrigger className="h-11 rounded-xl sm:h-10">
                <SelectValue placeholder="Select flavor" />
              </SelectTrigger>
              <SelectContent position="popper" className="w-full min-w-[var(--radix-select-trigger-width)]">
                {activeFlavors.map((f) => (
                  <SelectItem key={String(f._id)} value={String(f._id)}>
                    {(f.name ?? "").trim()}
                    {f.price > 0 ? ` (+$${f.price})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {(isSetLine || isComboLine) && (
        <div className="space-y-3">
          {isComboLine && (
            <div className="space-y-sm">
              <Label className="text-xs font-medium text-primary/55">Cake flavor</Label>
              <Select
                value={selectedCake?._id ? String(selectedCake._id) : undefined}
                onValueChange={(flavorId) => {
                  const flavor = cakePool.find((item) => String(item._id) === flavorId);
                  const treats = customOrderFlavorNames(flavorText, "combo");
                  updateDetails({
                    flavor: compileComboFlavorLabel(treats, flavor?.name ?? ""),
                  });
                }}
              >
                <SelectTrigger className="h-11 rounded-xl sm:h-10">
                  <SelectValue placeholder="Select cake flavor" />
                </SelectTrigger>
                <SelectContent>
                  {cakePool.map((flavor) => (
                    <SelectItem key={String(flavor._id)} value={String(flavor._id)}>
                      {(flavor.name ?? "").trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-sm">
            <Label className="text-xs font-medium text-primary/55">
              {isComboLine ? "Treat flavors" : "Set flavors"}
            </Label>
            <BakerFlavorChips
              flavors={treatPool}
              selectedIds={selectedTreatIds}
              maxFlavors={chosenSet?.maxFlavors}
              onToggle={(flavorId) => {
                const next = selectedTreatIds.includes(flavorId)
                  ? selectedTreatIds.filter((id) => id !== flavorId)
                  : [...selectedTreatIds, flavorId];
                writeTreatIds(next);
              }}
            />
          </div>
        </div>
      )}

      {isMultiTier && (
        <div className="flex w-full min-w-0 flex-col gap-3">
          <Label className="text-xs font-medium text-primary/55">Flavor Profile — Tier Selection</Label>
          <AdminTierFlavorEditor
            tiersCount={tiersCount}
            tierSizes={tierSizes}
            tierFlavors={tierFlavors}
            flavors={activeFlavors}
            onTierFlavorChange={handleTierFlavorChange}
            variant="cards"
            className={
              tiersCount === 2
                ? "grid w-full grid-cols-1 gap-6 xl:grid-cols-2"
                : "flex w-full flex-col gap-6"
            }
          />
        </div>
      )}

      <div className="space-y-sm">
        <Label className="text-xs font-medium text-primary/55">Shape</Label>
        <Select
          value={details.shape || "__none__"}
          onValueChange={(val) =>
            updateDetails({ shape: val === "__none__" ? "" : val })
          }
        >
          <SelectTrigger className="h-11 rounded-xl sm:h-10">
            <SelectValue placeholder="Select Shape" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— No shape —</SelectItem>
            {details.shape &&
              !shapes.some((s) => s.name === details.shape) && (
                <SelectItem value={details.shape}>
                  {details.shape} (custom)
                </SelectItem>
              )}
            {shapes.map((s) => (
              <SelectItem key={s._id} value={s.name}>
                {s.name}
                {s.priceSurcharge > 0 ? ` (+$${s.priceSurcharge})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-sm">
        <Label className="text-xs font-medium text-primary/55">Flavor Note (Optional)</Label>
        <Textarea
          rows={3}
          value={details.flavorNote || ""}
          onChange={(e) => updateDetails({ flavorNote: e.target.value })}
          className="resize-none"
          placeholder="e.g. less sweet, specific inquiry"
        />
      </div>

      <div className="space-y-sm">
        <Label className="text-xs font-medium text-primary/55">Text on Cake</Label>
        <Input
          value={details.textOnCake || ""}
          onChange={(e) => updateDetails({ textOnCake: e.target.value })}
          className="h-11 rounded-xl sm:h-10"
          placeholder="Optional inscription..."
        />
      </div>

      <div className="space-y-sm">
        <Label className="text-xs font-medium text-primary/55">Addons</Label>
        <AddonAdminSelector
          selectedAddons={item.addons || []}
          onChange={(newAddons) => onItemChange(index, "addons", newAddons)}
        />
        {(item.addons || []).some((addon) => (addon.quantity ?? 1) > 1) && (
          <ul className="text-xs text-primary/70 space-y-1">
            {(item.addons || [])
              .filter((addon) => (addon.quantity ?? 1) > 1)
              .map((addon, i) => (
                <li key={`${addon.addonId}-${i}`}>
                  {addon.name}
                  {addon.variantName ? ` · ${addon.variantName}` : ""}
                  {addonQuantityMark(addon.quantity)}
                  {addonUnitCost(addon) > 0 ? ` · $${addonUnitCost(addon).toFixed(2)}` : ""}
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="space-y-sm">
        <Label className="text-xs font-medium text-primary/55">Design Notes / Description</Label>
        <Textarea
          rows={4}
          value={details.designNotes || ""}
          onChange={(e) => updateDetails({ designNotes: e.target.value })}
          placeholder="Detailed design requests for the baker..."
          className="resize-none"
        />
      </div>

      <div className="space-y-sm pt-2">
        <Label className="flex items-center justify-between text-xs font-medium text-primary/55">
          <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Reference Images</span>
          <span className="text-[10px] lowercase font-normal italic">{referenceImages.length} uploaded</span>
        </Label>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
          {referenceImages.map((url: string, idx: number) => (
            <div
              key={idx}
              className="relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm"
            >
              <button
                type="button"
                onClick={() => setGalleryIndex(idx)}
                className="absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                aria-label="View reference image full size"
              >
                <Image src={url} alt="Reference" fill quality={90} className="object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setImageToDeleteIndex(idx)}
                className="absolute top-1.5 right-1.5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-error text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Delete reference image"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/20 bg-background/40 text-primary/55 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <Plus className="h-6 w-6" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-widest">Add Image</span>
              </>
            )}
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <div className="border-t border-border/40 pt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-sm">
            <Label className="mb-1.5 block text-xs font-medium text-accent">
              Agreed Price ($)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                $
              </span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.agreedPrice ?? ""}
                onChange={(e) => handleAgreedPriceChange(e.target.value)}
                className="h-11 rounded-xl border-accent/20 bg-accent/5 pl-7 text-right font-bold tabular-nums text-accent focus:ring-accent/20 sm:h-10"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-sm">
            <Label className="mb-1.5 block text-xs font-medium text-accent">
              Design Quote ($)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                $
              </span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.designQuote ?? ""}
                onChange={(e) => handleDesignQuoteChange(e.target.value)}
                className="h-11 rounded-xl border-accent/20 bg-accent/5 pl-7 text-right font-bold tabular-nums text-accent focus:ring-accent/20 sm:h-10"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-medium">
          Base:{" "}
          <span className="font-mono font-semibold text-primary/70">
            ${Math.max(0, (Number(item.agreedPrice) || 0) - (Number(item.designQuote) || 0)).toFixed(2)}
          </span>
        </p>
      </div>

      <ImagePreviewGallery
        isOpen={galleryIndex !== null}
        onClose={() => setGalleryIndex(null)}
        images={referenceImages}
        initialIndex={galleryIndex ?? 0}
      />

      <ConfirmationModal
        isOpen={imageToDeleteIndex !== null}
        onClose={() => setImageToDeleteIndex(null)}
        onConfirm={handleConfirmDeleteImage}
        title="Remove Reference Image?"
        confirmText="Delete"
        variant="danger"
      >
        <p>
          This image will be removed from the custom request. Click Save to
          persist the change.
        </p>
      </ConfirmationModal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form (loops items, order-level allergies + agreed total)
// ─────────────────────────────────────────────────────────────────────────────

export const CustomOrderSpecsForm = ({
  order,
  shapes = [],
  onItemChange,
  onOrderChange,
  onItemImageUpload,
  isUploading,
  agreedPriceTotal,
}: CustomOrderSpecsFormProps) => {
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [sets, setSets] = useState<CatalogSet[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/flavors").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/diameters").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/sets").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([flavData, catData, diamData, setData]) => {
        setFlavors(
          Array.isArray(flavData)
            ? flavData.map((f) => ({
                ...f,
                _id: String(f._id),
                categoryIds: Array.isArray(f.categoryIds)
                  ? f.categoryIds.map(String)
                  : f.categoryIds,
              }))
            : []
        );
        setCategories(
          Array.isArray(catData)
            ? catData.map((c) => ({ ...c, _id: String(c._id) }))
            : []
        );
        setDiameters(
          Array.isArray(diamData)
            ? diamData.map((d) => ({
                ...d,
                _id: String(d._id),
                categoryIds: Array.isArray(d.categoryIds)
                  ? d.categoryIds.map(String)
                  : d.                categoryIds,
              }))
            : []
        );
        setSets(
          Array.isArray(setData)
            ? setData.map((set) => ({ ...set, _id: String(set._id) }))
            : []
        );
      })
      .catch(console.error);
  }, []);

  const items: CustomOrderItem[] = order.items ?? [];

  return (
    <DashboardGlassCard className="space-y-4">
      <h2 className="flex min-w-0 items-center gap-2 font-heading text-lg font-semibold text-primary">
        Line items
        {items.length > 1 && (
          <span className="text-sm font-normal text-primary/55">
            {items.length}
          </span>
        )}
      </h2>

      {items.map((item, index) => (
        <ItemSpecEditor
          key={item.id ?? index}
          item={item}
          index={index}
          itemCount={items.length}
          shapes={shapes}
          flavors={flavors}
          categories={categories}
          diameters={diameters}
          sets={sets}
          onItemChange={onItemChange}
          onItemImageUpload={onItemImageUpload}
          isUploading={isUploading}
        />
      ))}

      {/* Order-level allergies */}
      <div className="space-y-sm">
        <Label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-error">
          <AlertTriangle className="w-4 h-4" /> Allergies
        </Label>
        <Input
          value={order.allergies || ""}
          onChange={(e) => onOrderChange("allergies", e.target.value)}
          className="h-11 rounded-xl border-error/20 bg-error/5 focus:ring-error/20 sm:h-10"
          placeholder="List any allergies..."
        />
      </div>

      {/* Agreed price total (sum of per-item agreed prices) */}
      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <span className="text-xs font-medium uppercase tracking-wide text-primary/55">
          Agreed total
        </span>
        <span className="font-mono text-2xl font-bold tabular-nums text-accent">
          ${agreedPriceTotal.toFixed(2)}
        </span>
      </div>
    </DashboardGlassCard>
  );
};
