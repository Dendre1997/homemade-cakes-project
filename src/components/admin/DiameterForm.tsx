"use client";
import React, { useState, useEffect} from "react";
import { Diameter, ProductCategory } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";;
import { ChipCheckbox } from "../ui/ChipCheckbox";
import { ImageUploadPreview } from "@/components/ui/ImageUploadPreview";
import {
  appendCloudinaryUploadPreset,
  cloudinaryUploadUrl,
} from "@/lib/cloudinaryClient";


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
    basePrice: undefined,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingDiameter) {
      setFormData({
        name: existingDiameter.name || "",
        sizeValue: existingDiameter.sizeValue || 0,
        servings: existingDiameter.servings || "",
        illustration: existingDiameter.illustration || "",
        imageUrl: existingDiameter.imageUrl || "",
        categoryIds: existingDiameter.categoryIds || [],
        basePrice: existingDiameter.basePrice,
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        sizeValue: 0,
        servings: "",
        illustration: "",
        imageUrl: "",
        categoryIds: [],
        basePrice: undefined,
      });
    }
  }, [existingDiameter, isSubmitting]);

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
    onSubmit(formData);
  };

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
          />
          {SelectedIcon && (
            <div className="h-10 w-10 p-2 border border-border rounded-medium shrink-0">
              <SelectedIcon />
            </div>
          )}
        </div>
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
