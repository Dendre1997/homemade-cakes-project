"use client";
import React, { useState, useEffect, useRef } from "react";
import { Addon, ProductCategory } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ChipCheckbox } from "../ui/ChipCheckbox";
import { ImageUploadPreview } from "@/components/admin/ImageUploadPreview";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";
import { Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
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


type AddonFormData = Omit<Addon, "_id">;

interface AddonsFormProps {
  existingAddon?: Addon | null;
  onSubmit: (formData: AddonFormData) => void;
  isSubmitting: boolean;
  categories: ProductCategory[];
  onCancel?: () => void;
}

const AddonsForm = ({
  existingAddon,
  onSubmit,
  isSubmitting,
  categories,
  onCancel,
}: AddonsFormProps) => {
  const { showAlert } = useAlert();

  const [formData, setFormData] = useState<AddonFormData>({
    name: "",
    description: "",
    imageUrl: "",
    isActive: true,
    allowQuantity: false,
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
    if (existingAddon) {
      setFormData({
        name: existingAddon.name || "",
        description: existingAddon.description || "",
        imageUrl: existingAddon.imageUrl || "",
        isActive: existingAddon.isActive ?? true,
        allowQuantity: existingAddon.allowQuantity === true,
        maxQuantity: existingAddon.allowQuantity
          ? existingAddon.maxQuantity
          : undefined,
        categoryIds: existingAddon.categoryIds || [],
        variants: existingAddon.variants?.length ? existingAddon.variants : [{ name: "", price: 0, imageUrl: "" }],
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        description: "",
        imageUrl: "",
        isActive: true,
        allowQuantity: false,
        maxQuantity: undefined,
        categoryIds: [],
        variants: [{ name: "", price: 0, imageUrl: "" }],
      });
    }

    setOrphanedImageUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [existingAddon, isSubmitting]);

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
    appendCloudinaryUploadPreset(uploadData);

    try {
      const response = await fetch(
        cloudinaryUploadUrl("image"),
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
    if (formData.allowQuantity) {
      const maxQuantity = formData.maxQuantity;
      if (maxQuantity == null || !Number.isInteger(maxQuantity) || maxQuantity < 1) {
        showAlert("Maximum quantity must be a whole number of at least 1.", "error");
        return;
      }
    }
    setOrphanedImageUrl(null);
    const { maxQuantity: _max, ...rest } = formData;
    onSubmit(
      formData.allowQuantity
        ? formData
        : { ...rest, allowQuantity: false }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      <div className={catalogFormCardClass}>
      <h2 className={catalogFormTitleClass}>
        {existingAddon ? "Update Addon" : "Add New Addon"}
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
            className={catalogFieldClass}
          />
        </div>
        <div>
          <FormLabel htmlFor="isActive">Active Status</FormLabel>
          <div className="mt-2 flex min-h-11 items-center gap-3">
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

      <div className="space-y-3 rounded-xl border border-primary/10 bg-background/40 p-3">
        <div className="flex min-h-11 items-center gap-3">
          <Switch
            id="allowQuantity"
            checked={formData.allowQuantity === true}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                allowQuantity: checked,
                maxQuantity: checked ? prev.maxQuantity : undefined,
              }))
            }
          />
          <FormLabel htmlFor="allowQuantity">
            Allow client to choose quantity
          </FormLabel>
        </div>
        {formData.allowQuantity && (
          <div>
            <FormLabel htmlFor="maxQuantity">Maximum quantity</FormLabel>
            <Input
              type="number"
              id="maxQuantity"
              min={1}
              step={1}
              value={formData.maxQuantity ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                setFormData((prev) => ({
                  ...prev,
                  maxQuantity: raw === "" ? undefined : Number(raw),
                }));
              }}
              required
              className={catalogFieldClass}
            />
          </div>
        )}
      </div>

      <div>
        <FormLabel htmlFor="description">Description (Optional)</FormLabel>
        <Input
          type="text"
          id="description"
          value={formData.description || ""}
          onChange={handleChange}
          className={catalogFieldClass}
        />
      </div>

      <div className="space-y-sm">
        <h3 className="font-body text-body font-bold text-primary">Variants</h3>
        <div className="space-y-sm">
          {formData.variants.map((variant, index) => (
            <div key={index} className="flex w-full min-w-0 flex-col gap-3 rounded-xl border border-primary/10 bg-background/40 p-3">
              <div className="flex flex-col w-full gap-2">
                <FormLabel htmlFor={`variant-image-upload-${index}`}>Variant Image</FormLabel>
                <div className="">
                  <ImageUploadPreview
                    imagePreview={variant.imageUrl || null}
                    isUploading={uploadingVariantIndex === index}
                    onRemove={() => handleVariantImageRemove(index)}
                    containerClassName="h-48 w-full"
                    actionClassName={catalogImageActionClass}
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
                      className={catalogUploadButtonClass}
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
                  className={catalogFieldClass}
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
                  className={catalogFieldClass}
                />
              </div>
              <div className="mt-1 flex w-full justify-end border-t border-primary/10 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeVariant(index)}
                  disabled={formData.variants.length <= 1}
                  className="flex h-11 items-center gap-2 rounded-xl px-3 text-error transition-colors hover:bg-error/10 hover:text-error sm:h-10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove Variant
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={addVariant}
            className="mt-1 h-11 w-full gap-2 rounded-xl sm:h-10"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add another option
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
          actionClassName={catalogImageActionClass}
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
          className={catalogUploadButtonClass}
          disabled={isUploading}
        >
          {isUploading ? (
            <span>Uploading Image…</span>
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
              className={catalogChipClass}
            >
              {cat.name}
            </ChipCheckbox>
          ))}
        </div>
      </div>

      <CatalogFormActions
        isSubmitting={isSubmitting}
        disabled={isUploading}
        onCancel={onCancel}
        submitLabel={
          isSubmitting
            ? "Saving…"
            : existingAddon
              ? "Update Addon"
              : "Add Addon"
        }
      />
      </div>
    </form>
  );
};

export default AddonsForm;
