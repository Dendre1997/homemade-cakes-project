"use client";
import React, { useState, useEffect, useRef } from "react"; 
import { Flavor, ProductCategory } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "../ui/Textarea";
import {
  CatalogFormActions,
  catalogChipClass,
  catalogFieldClass,
  catalogFormCardClass,
  catalogFormTitleClass,
  catalogImageActionClass,
  catalogLabelClass,
  catalogUploadButtonClass,
} from "@/components/admin/catalog/CatalogFormChrome";
import { ChipCheckbox } from "../ui/ChipCheckbox";
import { ImageUploadPreview } from "./ImageUploadPreview";
import {
  appendCloudinaryUploadPreset,
  cloudinaryUploadUrl,
} from "@/lib/cloudinaryClient";

const FormLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className={catalogLabelClass}
  >
    {children}
  </label>
);

type FlavorFormData = Omit<Flavor, "_id">;

interface FlavorFormProps {
  existingFlavor?: Flavor | null;
  onSubmit: (formData: FlavorFormData) => void;
  isSubmitting: boolean; 
  categories: ProductCategory[];
  onCancel?: () => void;
}

const FlavorForm = ({
  existingFlavor,
  onSubmit,
  isSubmitting, 
  categories,
  onCancel,
}: FlavorFormProps) => {
  const [formData, setFormData] = useState<FlavorFormData>({
    name: "",
    price: 0,
    description: "",
    imageUrl: "",
    categoryIds: [],
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (existingFlavor) {
      setFormData({
        name: existingFlavor.name || "",
        price: existingFlavor.price || 0,
        description: existingFlavor.description || "",
        imageUrl: existingFlavor.imageUrl || "",
        categoryIds: existingFlavor.categoryIds || [],
      });
    } else if (!isSubmitting) {
      // Clear form *after* submit
      setFormData({
        name: "",
        price: 0,
        description: "",
        imageUrl: "",
        categoryIds: [],
      });
    }
    // Clear orphans/errors
    setOrphanedImageUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [existingFlavor, isSubmitting]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => {
      const currentCategoryIds = prev.categoryIds || [];

      const newCategoryIds = currentCategoryIds.includes(categoryId)
        ? currentCategoryIds.filter((id) => id !== categoryId)
        : [...currentCategoryIds, categoryId];

      return {
        ...prev,
        categoryIds: newCategoryIds,
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
        {
          method: "POST",
          body: uploadData,
        }
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
    // Update the form state with the new URL
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrphanedImageUrl(null);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      <div className={catalogFormCardClass}>
      <h2 className={catalogFormTitleClass}>
        {existingFlavor ? "Update Flavor" : "Add New Flavor"}
      </h2>
      <div className="space-y-4 sm:space-y-5">
        <div>
          <FormLabel htmlFor="name">Name</FormLabel>
          <Input
            type="text"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={catalogFieldClass}
          />
        </div>
        <div>
          <FormLabel htmlFor="price">Price</FormLabel>
          <Input
            type="number"
            id="price"
            value={formData.price}
            onChange={handleChange}
            required
            step="0.01"
            placeholder="0.00"
            className={catalogFieldClass}
          />
        </div>
        <div>
          <FormLabel htmlFor="image-upload">Image</FormLabel>
          {formData.imageUrl && (
            <ImageUploadPreview
              imagePreview={formData.imageUrl}
              isUploading={isUploading}
              onRemove={handleImageRemove}
              allowPositioning={true}
              // imageFit="object-cover"
              onCropSave={handleCropSave}
              actionClassName={catalogImageActionClass}
            />
          )}
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploading}
            className="hidden"
            ref={fileInputRef}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className={catalogUploadButtonClass}
            disabled={isUploading}
          >
            {isUploading ? (
              <span>Uploading…</span>
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

        <div>
          <FormLabel htmlFor="description">Description (optional)</FormLabel>
          <Textarea
            id="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="rounded-xl border-primary/15 bg-background/40"
          />
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
                className={catalogChipClass}
              >
                {cat.name}
              </ChipCheckbox>
            ))}
          </div>
        </div>
      </div>
      <CatalogFormActions
        isSubmitting={isSubmitting}
        disabled={isUploading}
        onCancel={onCancel}
        submitLabel={
          isSubmitting
            ? "Saving…"
            : existingFlavor
              ? "Update Flavor"
              : "Add Flavor"
        }
      />
      </div>
    </form>
  );
};

export default FlavorForm;
