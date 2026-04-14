"use client";
import { useState, useEffect, useRef } from "react";
import { ProductCategory } from "@/types";
import { slugify } from "@/lib/utils";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ImageUploadPreview } from "@/components/admin/ImageUploadPreview";
import LoadingSpinner from "@/components/ui/Spinner";

const FormLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className="block font-body text-small text-text-primary/80 mb-sm"
  >
    {children}
  </label>
);

type CategoryFormData = Omit<ProductCategory, "_id">;
interface CategoryFormProps {
  existingCategory?: ProductCategory | null;
  onSubmit: (
    formData: Omit<ProductCategory, "_id" | "slug"> & {
      slug: string;
      manufacturingTimeInMinutes: number;
    }
  ) => void;
  isSubmitting: boolean;
}

const CategoryForm = ({
  existingCategory,
  onSubmit,
  isSubmitting
}: CategoryFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    manufacturingTimeInMinutes: 0,
    imageUrl: "",
    basePrice: 0,
    categoryType: "single" as "single" | "set" | "combo",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (existingCategory) {
      setFormData({
        name: existingCategory.name || "",
        slug: existingCategory.slug || "",
        manufacturingTimeInMinutes:
          existingCategory.manufacturingTimeInMinutes || 0,
        imageUrl: existingCategory.imageUrl || "",
        basePrice: existingCategory.basePrice || 0,
        categoryType: existingCategory.categoryType || "single",
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        slug: "",
        manufacturingTimeInMinutes: 0,
        imageUrl: "",
        basePrice: 0,
        categoryType: "single" as "single" | "set" | "combo",
      });
    }
  }, [existingCategory, isSubmitting]);

  useEffect(() => {
    if (!existingCategory) {
      setFormData((prev) => ({
        ...prev,
        slug: slugify(prev.name),
      }));
    }
  }, [formData.name, existingCategory]);

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
    uploadData.append("upload_preset", "homemade_cakes_preset");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setOrphanedImageUrl(null);
  onSubmit(formData);
};

  return (
    <form
      onSubmit={handleSubmit}
      className="p-lg bg-card-background rounded-large shadow-md max-w-lg space-y-md"
    >
      <div>
        <FormLabel htmlFor="name">Name</FormLabel>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <FormLabel htmlFor="slug">URL Slug (auto-generated)</FormLabel>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          placeholder="e.g., bento-cakes"
          required
        />
      </div>
      <div>
        <FormLabel htmlFor="manufacturingTime">
          Manufacturing Time (minutes)
        </FormLabel>
        <Input
          id="manufacturingTime"
          type="number"
          value={
            formData.manufacturingTimeInMinutes === 0
              ? ""
              : formData.manufacturingTimeInMinutes
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              manufacturingTimeInMinutes: parseInt(e.target.value) || 0,
            })
          }
          placeholder="e.g., 90"
        />
        <p className="mt-1 text-xs text-gray-500">
          Time required to prepare one item from this category.
        </p>
      </div>
      <div>
        <FormLabel htmlFor="basePrice">Base Price ($)</FormLabel>
        <Input
          id="basePrice"
          type="number"
          min="0"
          step="0.01"
          value={formData.basePrice === 0 ? "" : formData.basePrice}
          onChange={(e) =>
            setFormData({
              ...formData,
              basePrice: parseFloat(e.target.value) || 0,
            })
          }
          placeholder="e.g., 25.00"
        />
        <p className="mt-1 text-xs text-gray-500">
          Starting price for items in this category.
        </p>
      </div>

      <div>
        <FormLabel htmlFor="image">Category Image</FormLabel>
        <ImageUploadPreview
          imagePreview={formData.imageUrl || null}
          isUploading={isUploading}
          onRemove={handleImageRemove}
          containerClassName="h-48 w-full"
          allowPositioning={true}
          // imageFit="object-cover"
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
        <FormLabel htmlFor="categoryType">Category Type</FormLabel>
        <div className="flex flex-col sm:flex-col gap-2">
          <Button
            type="button"
            variant={formData.categoryType === "single" ? "primary" : "secondary"}
            onClick={() => setFormData({ ...formData, categoryType: "single" })}
            className="flex-1"
          >
            Single
          </Button>
          <Button
            type="button"
            variant={formData.categoryType === "set" ? "primary" : "secondary"}
            onClick={() => setFormData({ ...formData, categoryType: "set" })}
            className="flex-1"
          >
            Set
          </Button>
          <Button
            type="button"
            variant={formData.categoryType === "combo" ? "primary" : "secondary"}
            onClick={() => setFormData({ ...formData, categoryType: "combo" })}
            className="flex-1"
          >
            Combo
          </Button>
        </div>
      </div>

      <div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          variant="primary"
        >
          {isSubmitting ? "Saving..." : existingCategory ? "Update" : "Create"}
        </Button>
      </div>

      
    </form>
  );
};

export default CategoryForm;
