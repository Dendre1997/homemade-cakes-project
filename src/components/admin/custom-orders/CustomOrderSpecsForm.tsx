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
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import ImagePreviewGallery from "@/components/ui/ImagePreviewGallery";
import { AdminTierFlavorEditor } from "@/components/admin/shared/AdminTierFlavorEditor";
import HybridSelector from "@/components/admin/custom-orders/HybridSelector";
import { Flavor, IShape, CustomOrderItem, ProductCategory, Diameter } from "@/types";
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

  return (
    <div className="space-y-lg rounded-large border border-border/60 bg-subtleBackground/30 p-md">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h3 className="font-heading text-h5 text-primary flex items-center gap-2">
          {itemCount > 1 ? `Item ${index + 1}` : "Product Details"}
          {itemCount > 1 && categoryDisplayName && (
            <span className="text-sm font-normal text-muted-foreground">
              · {categoryDisplayName}
            </span>
          )}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div className="space-y-sm">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</Label>
          <Select
            value={resolvedCategoryId || undefined}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="h-11">
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
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Price Estimate ($)</Label>
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
            className="h-11 font-mono font-bold"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div className="space-y-sm">
          <HybridSelector
            label="Size / Configuration"
            options={activeDiameters}
            value={sizeHybridValue}
            onChange={handleSizeChange}
          />
        </div>
        {!isMultiTier && (
          <div className="space-y-sm">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Flavor Profile</Label>
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
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select flavor" />
              </SelectTrigger>
              <SelectContent position="popper" className="w-full min-w-[var(--radix-select-trigger-width)]">
                {activeFlavors.map((f) => (
                  <SelectItem key={String(f._id)} value={String(f._id)}>
                    {f.name}
                    {f.price > 0 ? ` (+$${f.price})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isMultiTier && (
        <div className="flex w-full min-w-0 flex-col gap-3">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Flavor Profile — Tier Selection</Label>
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
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shape</Label>
        <Select
          value={details.shape || "__none__"}
          onValueChange={(val) =>
            updateDetails({ shape: val === "__none__" ? "" : val })
          }
        >
          <SelectTrigger className="h-11">
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
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Flavor Note (Optional)</Label>
        <Input
          value={details.flavorNote || ""}
          onChange={(e) => updateDetails({ flavorNote: e.target.value })}
          className="h-11"
          placeholder="e.g. less sweet, specific inquiry"
        />
      </div>

      <div className="space-y-sm">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Text on Cake</Label>
        <Input
          value={details.textOnCake || ""}
          onChange={(e) => updateDetails({ textOnCake: e.target.value })}
          className="h-11"
          placeholder="Optional inscription..."
        />
      </div>

      <div className="space-y-sm">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Addons</Label>
        <AddonAdminSelector
          selectedAddons={item.addons || []}
          onChange={(newAddons) => onItemChange(index, "addons", newAddons)}
        />
      </div>

      <div className="space-y-sm">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Design Notes / Description</Label>
        <Textarea
          rows={4}
          value={details.designNotes || ""}
          onChange={(e) => updateDetails({ designNotes: e.target.value })}
          placeholder="Detailed design requests for the baker..."
          className="resize-none"
        />
      </div>

      <div className="space-y-sm pt-2">
        <Label className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
                className="absolute inset-0 w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-inset"
                aria-label="View reference image full size"
              >
                <Image src={url} alt="Reference" fill quality={90} className="object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setImageToDeleteIndex(idx)}
                className="absolute top-1.5 right-1.5 z-10 bg-error text-white p-1.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-transform"
                aria-label="Delete reference image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground bg-subtleBackground group"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="space-y-sm">
            <Label className="text-xs font-bold uppercase tracking-widest text-accent">
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
                className="h-11 pl-7 text-right font-bold text-accent border-accent/20 bg-accent/5 focus:ring-accent/20"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-sm">
            <Label className="text-xs font-bold uppercase tracking-widest text-accent">
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
                className="h-11 pl-7 text-right font-bold text-accent border-accent/20 bg-accent/5 focus:ring-accent/20"
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

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/flavors").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/diameters").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([flavData, catData, diamData]) => {
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
                  : d.categoryIds,
              }))
            : []
        );
      })
      .catch(console.error);
  }, []);

  const items: CustomOrderItem[] = order.items ?? [];

  return (
    <div className="bg-card-background p-lg rounded-large shadow-md space-y-lg border border-border/40">
      <h2 className="font-heading text-h4 text-primary border-b border-border/40 pb-4 flex items-center gap-2">
        Product Details
        {items.length > 1 && (
          <span className="text-sm font-normal text-muted-foreground">
            ({items.length} items)
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
          onItemChange={onItemChange}
          onItemImageUpload={onItemImageUpload}
          isUploading={isUploading}
        />
      ))}

      {/* Order-level allergies */}
      <div className="space-y-sm">
        <Label className="flex items-center gap-2 text-error text-xs font-bold uppercase tracking-widest">
          <AlertTriangle className="w-4 h-4" /> Allergies
        </Label>
        <Input
          value={order.allergies || ""}
          onChange={(e) => onOrderChange("allergies", e.target.value)}
          className="h-11 border-error/20 focus:ring-error/20 bg-error/5"
          placeholder="List any allergies..."
        />
      </div>

      {/* Agreed price total (sum of per-item agreed prices) */}
      <div className="flex items-center justify-between border-t border-border/40 pt-4">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Agreed Price Total
        </span>
        <span className="font-mono text-h4 font-bold text-accent">
          ${agreedPriceTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
