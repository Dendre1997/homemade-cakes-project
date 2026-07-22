"use client";
import React, { useState, useEffect} from "react";
import { Diameter, ProductCategory, IShape } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";;
import { ChipCheckbox } from "../ui/ChipCheckbox";
import { ImageUploadPreview } from "@/components/ui/ImageUploadPreview";
import {
  appendCloudinaryUploadPreset,
  cloudinaryUploadUrl,
} from "@/lib/cloudinaryClient";
import { cn } from "@/lib/utils";


// ---Icon Components ---
import { FourInchBentoIcon } from "@/components/icons/cake-sizes/FourInchBentoIcon";
import { FiveInchBentoIcon } from "../icons/cake-sizes/FiveInchBentoIcon";
import { SixInchCakeIcon } from "../icons/cake-sizes/SixInchCakeIcon";
import { SevenInchCakeIcon } from "../icons/cake-sizes/SevenInchCakeIcon";
import { EightInchCakeIcon } from "../icons/cake-sizes/EightInchCakeIcon";

const availableIcons = [
  { name: "FourInchBentoIcon", size: 4, component: FourInchBentoIcon },
  { name: "FiveInchBentoIcon", size: 5, component: FiveInchBentoIcon },
  { name: "SixInchCakeIcon", size: 6, component: SixInchCakeIcon },
  { name: "SevenInchCakeIcon", size: 7, component: SevenInchCakeIcon },
  { name: "EightInchCakeIcon", size: 8, component: EightInchCakeIcon },
].sort((a, b) => a.size - b.size);

const TIER_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

function getTierSizeLabel(index: number, total: number): string {
  if (total === 1) return "Tier Size";
  if (index === 0) return "Tier 1 (Top) Size";
  if (index === total - 1) return `Tier ${index + 1} (Bottom) Size`;
  return `Tier ${index + 1} Size`;
}

/** Extract the first integer from a tier size label; returns 0 if none found. */
function extractFirstInteger(value: string): number {
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/** Sum of extracted integers across all tier size labels (Approach 1). */
function sumTierSizeValues(tierSizes: string[] | undefined): number {
  return (tierSizes ?? []).reduce(
    (sum, label) => sum + extractFirstInteger(label),
    0
  );
}

const FormLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className="block font-body text-small text-primary/80 mb-sm"
  >
    {children}
  </label>
);

type DiameterFormData = Omit<Diameter, "_id">;
interface DiameterFormProps {
  existingDiameter?: Diameter | null;
  onSubmit: (formData: DiameterFormData) => void;
  isSubmitting: boolean;
  categories: ProductCategory[];
}

const DiameterForm = ({
  existingDiameter,
  onSubmit,
  isSubmitting,
  categories,
}: DiameterFormProps) => {
  const [formData, setFormData] = useState<DiameterFormData>({
    name: "",
    sizeValue: 0,
    servings: "",
    illustration: "",
    imageUrl: "",
    categoryIds: [],
    shapeIds: [],
    basePrice: undefined,
    tiersCount: 1,
    tierSizes: undefined,
  });

  const [shapes, setShapes] = useState<IShape[]>([]);
  const [isLoadingShapes, setIsLoadingShapes] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchShapes = async () => {
      try {
        const res = await fetch("/api/admin/shapes");
        if (!res.ok) throw new Error("Failed to fetch shapes");
        const data = await res.json();
        setShapes(
          data.map((shape: IShape & { _id: unknown }) => ({
            ...shape,
            _id:
              typeof shape._id === "string" ? shape._id : String(shape._id),
          }))
        );
      } catch (err) {
        console.error("Failed to load shapes for diameter form:", err);
      } finally {
        setIsLoadingShapes(false);
      }
    };

    fetchShapes();
  }, []);

  useEffect(() => {
    if (existingDiameter) {
      const tiersCount = existingDiameter.tiersCount ?? 1;
      setFormData({
        name: existingDiameter.name || "",
        sizeValue: existingDiameter.sizeValue || 0,
        servings: existingDiameter.servings || "",
        illustration: existingDiameter.illustration || "",
        imageUrl: existingDiameter.imageUrl || "",
        categoryIds: existingDiameter.categoryIds || [],
        shapeIds: existingDiameter.shapeIds || [],
        basePrice: existingDiameter.basePrice,
        tiersCount,
        tierSizes:
          tiersCount > 1
            ? existingDiameter.tierSizes?.length === tiersCount
              ? [...existingDiameter.tierSizes]
              : Array.from({ length: tiersCount }, () => "")
            : undefined,
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        sizeValue: 0,
        servings: "",
        illustration: "",
        imageUrl: "",
        categoryIds: [],
        shapeIds: [],
        basePrice: undefined,
        tiersCount: 1,
        tierSizes: undefined,
      });
    }
  }, [existingDiameter, isSubmitting]);

  // Auto-calculate sizeValue as sum of tier diameters when multi-tier
  useEffect(() => {
    const count = formData.tiersCount ?? 1;
    if (count <= 1) return;

    const sum = sumTierSizeValues(formData.tierSizes);
    if (formData.sizeValue !== sum) {
      setFormData((prev) => ({ ...prev, sizeValue: sum }));
    }
  }, [formData.tiersCount, formData.tierSizes, formData.sizeValue]);

  useEffect(() => {
    const numericSize = formData.sizeValue;
    if (isNaN(numericSize) || availableIcons.length === 0) return;

    const minIcon = availableIcons[0];
    const maxIcon = availableIcons[availableIcons.length - 1];
    let bestMatch = minIcon;

    if (numericSize <= minIcon.size) bestMatch = minIcon;
    else if (numericSize >= maxIcon.size) bestMatch = maxIcon;
    else {
      bestMatch =
        availableIcons
          .slice()
          .reverse()
          .find((icon) => numericSize >= icon.size) || minIcon;
    }

    if (formData.illustration !== bestMatch.name) {
      setFormData((prev) => ({ ...prev, illustration: bestMatch.name }));
    }
  }, [formData.sizeValue, formData.illustration]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => {
      const currentCategoryIds = prev.categoryIds || [];
      return {
        ...prev,
        categoryIds: currentCategoryIds.includes(categoryId)
          ? currentCategoryIds.filter((id) => id !== categoryId)
          : [...currentCategoryIds, categoryId],
      };
    });
  };

  const handleShapeChange = (shapeId: string) => {
    setFormData((prev) => {
      const currentShapeIds = prev.shapeIds || [];
      return {
        ...prev,
        shapeIds: currentShapeIds.includes(shapeId)
          ? currentShapeIds.filter((id) => id !== shapeId)
          : [...currentShapeIds, shapeId],
      };
    });
  };

  const handleTiersCountChange = (count: number) => {
    setFormData((prev) => ({
      ...prev,
      tiersCount: count,
      tierSizes:
        count > 1
          ? Array.from({ length: count }, (_, index) => prev.tierSizes?.[index] ?? "")
          : undefined,
    }));
  };

  const handleTierSizeChange = (index: number, value: string) => {
    setFormData((prev) => {
      const count = prev.tiersCount ?? 1;
      const nextSizes = Array.from(
        { length: count },
        (_, i) => (i === index ? value : prev.tierSizes?.[i] ?? "")
      );
      return { ...prev, tierSizes: nextSizes };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    if (orphanedImageUrl) {
      fetch("/api/admin/cloudinary-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [orphanedImageUrl] }),
      });
    }

    const uploadData = new FormData();
    uploadData.append("file", file);
    appendCloudinaryUploadPreset(uploadData);

    try {
      const response = await fetch(
        cloudinaryUploadUrl("image"),
        { method: "POST", body: uploadData }
      );
      if (!response.ok) throw new Error("Image upload failed.");
      const result = await response.json();

      setOrphanedImageUrl(result.secure_url);
      setFormData((prev) => ({ ...prev, imageUrl: result.secure_url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropSave = (newUrl: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: newUrl }));
  };

  const handleImageRemove = () => {
    if (orphanedImageUrl) {
      fetch("/api/admin/cloudinary-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [orphanedImageUrl] }),
      });
      setOrphanedImageUrl(null);
    }
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrphanedImageUrl(null);

    const tiersCount = formData.tiersCount ?? 1;
    const payload: DiameterFormData = {
      ...formData,
      tiersCount,
      tierSizes:
        tiersCount > 1
          ? (formData.tierSizes ?? []).map((size) => size.trim())
          : undefined,
    };

    onSubmit(payload);
  };

  const tiersCount = formData.tiersCount ?? 1;

  const SelectedIcon = availableIcons.find(
    (icon) => icon.name === formData.illustration
  )?.component;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-lg bg-card-background rounded-large shadow-md max-w-lg space-y-md"
    >
      <h2 className="font-heading text-h3 text-primary">
        {existingDiameter ? "Update Diameter" : "Add New Diameter"}
      </h2>

      <div>
        <FormLabel htmlFor="name">Name (e.g., 6 Inch)</FormLabel>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <FormLabel htmlFor="sizeValue">
          Size Value (numerical, for sorting)
        </FormLabel>
        <div className="flex items-center gap-md">
          <Input
            type="number"
            id="sizeValue"
            value={formData.sizeValue === 0 ? "" : formData.sizeValue}
            onChange={handleChange}
            placeholder="0"
            required
            step="0.5"
            readOnly={tiersCount > 1}
            className={cn(tiersCount > 1 && "bg-muted/50 cursor-not-allowed")}
          />
          {SelectedIcon && (
            <div className="h-10 w-10 p-2 border border-border rounded-medium shrink-0">
              <SelectedIcon />
            </div>
          )}
        </div>
        {tiersCount > 1 && (
          <p className="text-xs text-primary/60 mt-1">
            Auto-calculated sum of tier sizes.
          </p>
        )}
      </div>

      <div>
        <FormLabel htmlFor="servings">
          Servings Text (e.g., 10-12 servings)
        </FormLabel>
        <Input
          type="text"
          id="servings"
          value={formData.servings}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <FormLabel htmlFor="basePrice">
          Base Price for Custom Orders (optional)
        </FormLabel>
        <Input
          type="number"
          id="basePrice"
          value={formData.basePrice ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setFormData(prev => ({
              ...prev,
              basePrice: val === "" ? undefined : parseFloat(val)
            }));
          }}
          placeholder="e.g. 50"
          step="0.01"
        />
        <p className="text-xs text-primary/60 mt-1">
          If set, this price will be used directly in the custom order form instead of calculating from category base price.
        </p>
      </div>

      <div className="space-y-sm">
        <FormLabel htmlFor="tiersCount">Number of Tiers</FormLabel>
        <div
          className="flex flex-wrap gap-sm"
          role="group"
          aria-label="Number of tiers"
        >
          {TIER_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => handleTiersCountChange(count)}
              className={cn(
                "min-w-[2.75rem] px-md py-sm rounded-medium border font-body text-small transition-colors",
                tiersCount === count
                  ? "bg-primary text-white border-primary"
                  : "bg-card-background text-primary border-border hover:border-primary/40"
              )}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-xs text-primary/60">
          Single-tier diameters behave exactly as before. Multi-tier diameters
          require a size label for each tier.
        </p>
      </div>

      {tiersCount > 1 && (
        <div className="space-y-sm">
          <h3 className="font-body text-body font-bold text-primary">
            Tier Sizes
          </h3>
          {Array.from({ length: tiersCount }, (_, index) => (
            <div key={index}>
              <FormLabel htmlFor={`tierSize-${index}`}>
                {getTierSizeLabel(index, tiersCount)}
              </FormLabel>
              <Input
                type="text"
                id={`tierSize-${index}`}
                value={formData.tierSizes?.[index] ?? ""}
                onChange={(e) => handleTierSizeChange(index, e.target.value)}
                placeholder='e.g. 6 inch'
                required
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <FormLabel htmlFor="image">Diameter Image (Optional)</FormLabel>
        <ImageUploadPreview
          imagePreview={formData.imageUrl || null}
          isUploading={isUploading}
          onRemove={handleImageRemove}
          containerClassName="h-48 w-full"
          allowPositioning={true}
          onCropSave={handleCropSave}
        />
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          ref={fileInputRef}
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          className="mt-sm"
          disabled={isUploading}
        >
          {isUploading ? (
            <p>Uploading...</p>
          ) : formData.imageUrl ? (
            "Change Image"
          ) : (
            "Upload Image"
          )}
        </Button>
        {uploadError && (
          <p className="text-error text-small mt-sm">{uploadError}</p>
        )}
      </div>

      <div className="space-y-sm">
        <h3 className="font-body text-body font-bold text-primary">
          Categories
        </h3>
        <div
          className="p-md border border-border rounded-medium 
            grid gap-md
            grid-cols-[repeat(auto-fit,minmax(150px,1fr))]"
        >
          {categories.map((cat) => (
            <ChipCheckbox
              key={cat._id}
              checked={(formData.categoryIds || []).includes(cat._id)}
              onCheckedChange={() => handleCategoryChange(cat._id)}
            >
              {cat.name}
            </ChipCheckbox>
          ))}
        </div>
      </div>

      <div className="space-y-sm">
        <h3 className="font-body text-body font-bold text-primary">Shapes</h3>
        {isLoadingShapes ? (
          <p className="text-sm text-primary/60 p-md border border-border rounded-medium">
            Loading shapes...
          </p>
        ) : shapes.length === 0 ? (
          <p className="text-sm text-primary/60 p-md border border-border rounded-medium">
            No shapes available. Create shapes in the catalog first.
          </p>
        ) : (
          <div
            className="p-md border border-border rounded-medium 
            grid gap-md
            grid-cols-[repeat(auto-fit,minmax(150px,1fr))]"
          >
            {shapes.map((shape) => (
              <ChipCheckbox
                key={shape._id}
                checked={(formData.shapeIds || []).includes(shape._id)}
                onCheckedChange={() => handleShapeChange(shape._id)}
              >
                {shape.name}
                {shape.priceSurcharge > 0
                  ? ` (+$${shape.priceSurcharge})`
                  : ""}
              </ChipCheckbox>
            ))}
          </div>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting
            ? "Saving..."
            : existingDiameter
              ? "Update Diameter"
              : "Add Diameter"}
        </Button>
      </div>
    </form>
  );
};

export default DiameterForm;
