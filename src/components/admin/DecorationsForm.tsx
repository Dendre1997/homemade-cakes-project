"use client";
import React, { useState, useEffect, useRef } from "react";
import { Decoration, ProductCategory } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ChipCheckbox } from "../ui/ChipCheckbox";
import { ImageUploadPreview } from "@/components/admin/ImageUploadPreview";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";
import { X, Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/Switch";

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


type DecorationFormData = Omit<Decoration, "_id">;

interface DecorationsFormProps {
  existingDecoration?: Decoration | null;
  onSubmit: (formData: DecorationFormData) => void;
  isSubmitting: boolean;
  categories: ProductCategory[];
}

const DecorationsForm = ({
  existingDecoration,
  onSubmit,
  isSubmitting,
  categories,
}: DecorationsFormProps) => {
  const { showAlert } = useAlert();

  const [formData, setFormData] = useState<DecorationFormData>({
    name: "",
    description: "",
    imageUrl: "",
    isActive: true,
    categoryIds: [],
    variants: [{ name: "", price: 0, imageUrl: "" }],
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);
  const [imagePos, setImagePos] = useState({ x: 50, y: 50 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingDecoration) {
      setFormData({
        name: existingDecoration.name || "",
        description: existingDecoration.description || "",
        imageUrl: existingDecoration.imageUrl || "",
        isActive: existingDecoration.isActive ?? true,
        categoryIds: existingDecoration.categoryIds || [],
        variants: existingDecoration.variants?.length ? existingDecoration.variants : [{ name: "", price: 0, imageUrl: "" }],
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        description: "",
        imageUrl: "",
        isActive: true,
        categoryIds: [],
        variants: [{ name: "", price: 0, imageUrl: "" }],
      });
    }

    setOrphanedImageUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [existingDecoration, isSubmitting]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleVariantChange = (index: number, field: "name" | "price", value: string | number) => {
    setFormData((prev) => {
      const newVariants = [...prev.variants];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: "", price: 0, imageUrl: "" }],
    }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVariantIndex(index);
    setUploadError(null);

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

      setFormData((prev) => {
        const newVariants = [...prev.variants];
        newVariants[index] = { ...newVariants[index], imageUrl: result.secure_url };
        return { ...prev, variants: newVariants };
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingVariantIndex(null);
    }
  };

  const handleVariantImageRemove = (index: number) => {
    setFormData((prev) => {
      const newVariants = [...prev.variants];
      newVariants[index] = { ...newVariants[index], imageUrl: "" };
      return { ...prev, variants: newVariants };
    });
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
    if (formData.variants.some((v) => !v.name || v.price < 0)) {
      showAlert("All variants must have a name and a valid price.", "error");
      return;
    }
    setOrphanedImageUrl(null);
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-lg bg-card-background rounded-large shadow-md max-w-lg space-y-md"
    >
      <h2 className="font-heading text-h3 text-primary">
        {existingDecoration ? "Update Decoration" : "Add New Decoration"}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        <div>
          <FormLabel htmlFor="name">Name</FormLabel>
          <Input
            type="text"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <FormLabel htmlFor="isActive">Active Status</FormLabel>
          <div className="flex items-center space-x-2 mt-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <span className="font-body text-small text-primary/80">
              {formData.isActive ? "Active (Visible)" : "Inactive (Hidden)"}
            </span>
          </div>
        </div>
      </div>

      <div>
        <FormLabel htmlFor="description">Description (Optional)</FormLabel>
        <Input
          type="text"
          id="description"
          value={formData.description || ""}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-sm">
        <h3 className="font-body text-body font-bold text-primary">Variants</h3>
        <div className="space-y-sm">
          {formData.variants.map((variant, index) => (
            <div key={index} className="flex flex-col gap-sm w-full p-sm border border-border rounded-medium bg-background/50">
              <div className="flex flex-col w-full gap-2">
                <FormLabel htmlFor={`variant-image-upload-${index}`}>Variant Image</FormLabel>
                <div className="">
                  <ImageUploadPreview
                    imagePreview={variant.imageUrl || null}
                    isUploading={uploadingVariantIndex === index}
                    onRemove={() => handleVariantImageRemove(index)}
                    containerClassName="h-48 w-full"
                  />
                  <div className="flex flex-col gap-sm">
                    <Input
                      id={`variant-image-upload-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleVariantImageUpload(index, e)}
                      disabled={uploadingVariantIndex === index}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => document.getElementById(`variant-image-upload-${index}`)?.click()}
                      className="h-8 px-3 text-small"
                      disabled={uploadingVariantIndex === index}
                    >
                      {variant.imageUrl ? "Change Image" : "Upload Image"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="w-full">
                <FormLabel htmlFor={`variant-name-${index}`}>Variant Name</FormLabel>
                <Input
                  type="text"
                  id={`variant-name-${index}`}
                  value={variant.name}
                  onChange={(e) => handleVariantChange(index, "name", e.target.value)}
                  placeholder="e.g. Standard, 3 pcs"
                  required
                />
              </div>
              <div className="w-full">
                <FormLabel htmlFor={`variant-price-${index}`}>Price</FormLabel>
                <Input
                  type="number"
                  id={`variant-price-${index}`}
                  value={variant.price === 0 ? "" : variant.price}
                  onChange={(e) => handleVariantChange(index, "price", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
              <div className="w-full flex justify-end border-t border-border pt-sm mt-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeVariant(index)}
                  disabled={formData.variants.length <= 1}
                  className="px-3 text-error hover:text-error hover:bg-error/10 flex gap-2 items-center"
                >
                  <Trash2 className="w-4 h-4" /> Remove Variant
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={addVariant}
            className="w-full mt-sm gap-2"
          >
            <Plus className="w-4 h-4" /> Add another option
          </Button>
        </div>
      </div>

      <div>
        <FormLabel htmlFor="image-upload">Image</FormLabel>
        <ImageUploadPreview
          imagePreview={formData.imageUrl || null}
          isUploading={isUploading}
          onRemove={handleImageRemove}
          containerClassName="h-48 w-full"
          // allowPositioning={true}
          // imageFit="object-cover"
          // imagePosition={imagePos}
          // onPositionChange={setImagePos}
        />
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
          className="mt-sm"
          disabled={isUploading}
        >
          {isUploading ? (
            <h1>Uploading Image...</h1>
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
        <Button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="w-full"
        >
          {isSubmitting
            ? "Saving..."
            : existingDecoration
              ? "Update Decoration"
              : "Add Decoration"}
        </Button>
      </div>
    </form>
  );
};

export default DecorationsForm;
