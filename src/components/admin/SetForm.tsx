"use client";
import React, { useState, useEffect } from "react";
import { CatalogSet, ProductCategory } from "@/types";
import type { SetFields } from "@/lib/validation/setFields";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
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
import { ImageUploadPreview } from "@/components/ui/ImageUploadPreview";
import { SetBoxIcon } from "@/components/ui/SetBoxIcon";
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

export type SetFormData = SetFields;

interface SetFormProps {
  existingSet?: CatalogSet | null;
  /** Resolves true when the server saved the set. */
  onSubmit: (formData: SetFormData) => Promise<boolean>;
  isSubmitting: boolean;
  categories: ProductCategory[];
  onCancel?: () => void;
}

const emptyForm = (): SetFormData => ({
  name: "",
  pieceCount: 0,
  maxFlavors: 1,
  imageUrl: "",
  categoryIds: [],
  basePrice: undefined,
});

const parseCount = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const SetForm = ({
  existingSet,
  onSubmit,
  isSubmitting,
  categories,
  onCancel,
}: SetFormProps) => {
  const [formData, setFormData] = useState<SetFormData>(emptyForm);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const orphanedImageRef = React.useRef<string | null>(null);
  orphanedImageRef.current = orphanedImageUrl;

  const discardOrphanedUpload = () => {
    const url = orphanedImageRef.current;
    if (!url) return;
    fetch("/api/admin/cloudinary-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url] }),
    });
    setOrphanedImageUrl(null);
  };

  useEffect(() => {
    // An upload that was never saved belongs to the set being left.
    discardOrphanedUpload();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError(null);
    setFormData(
      existingSet
        ? {
            name: existingSet.name || "",
            pieceCount: existingSet.pieceCount || 0,
            maxFlavors: existingSet.maxFlavors || 1,
            imageUrl: existingSet.imageUrl || "",
            categoryIds: existingSet.categoryIds || [],
            basePrice: existingSet.basePrice,
          }
        : emptyForm()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSet]);

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => {
      const current = prev.categoryIds || [];
      return {
        ...prev,
        categoryIds: current.includes(categoryId)
          ? current.filter((id) => id !== categoryId)
          : [...current, categoryId],
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    discardOrphanedUpload();

    const uploadData = new FormData();
    uploadData.append("file", file);
    appendCloudinaryUploadPreset(uploadData);

    try {
      const response = await fetch(cloudinaryUploadUrl("image"), {
        method: "POST",
        body: uploadData,
      });
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
    discardOrphanedUpload();
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Forget the pending upload before saving: a successful save can switch the
    // edited set, and leaving it must not delete the icon that was just saved.
    const pendingUpload = orphanedImageRef.current;
    orphanedImageRef.current = null;
    setOrphanedImageUrl(null);
    const saved = await onSubmit({ ...formData, name: formData.name.trim() });
    if (!saved) {
      setOrphanedImageUrl(pendingUpload);
      return;
    }
    if (!existingSet) {
      setFormData(emptyForm());
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      <div className={catalogFormCardClass}>
      <h2 className={catalogFormTitleClass}>
        {existingSet ? "Update Set" : "Add New Set"}
      </h2>

      <div>
        <FormLabel htmlFor="name">Name (e.g., Set of 12)</FormLabel>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
          className={catalogFieldClass}
        />
      </div>

      <div>
        <FormLabel htmlFor="pieceCount">Piece Count</FormLabel>
        <div className="flex items-center gap-md">
          <Input
            type="number"
            id="pieceCount"
            value={formData.pieceCount === 0 ? "" : formData.pieceCount}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                pieceCount: parseCount(e.target.value),
              }))
            }
            placeholder="e.g. 12"
            min={1}
            step={1}
            required
            className={catalogFieldClass}
          />
          {formData.pieceCount > 0 && !formData.imageUrl && (
            <div className="h-10 w-10 p-1 border border-border rounded-medium shrink-0">
              <SetBoxIcon
                pieceCount={formData.pieceCount}
                className="h-full w-full text-primary"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <FormLabel htmlFor="maxFlavors">Set Flavor Limit</FormLabel>
        <Input
          type="number"
          id="maxFlavors"
          value={formData.maxFlavors === 0 ? "" : formData.maxFlavors}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              maxFlavors: parseCount(e.target.value),
            }))
          }
          placeholder="e.g. 2"
          min={1}
          max={formData.pieceCount > 0 ? formData.pieceCount : undefined}
          step={1}
          required
          className={catalogFieldClass}
        />
        <p className="text-xs text-primary/60 mt-1">
          The most flavors a customer may choose for this set. You split the
          pieces between them.
        </p>
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
            setFormData((prev) => ({
              ...prev,
              basePrice: val === "" ? undefined : parseFloat(val),
            }));
          }}
          placeholder="e.g. 48"
          min={0}
          step="0.01"
          className={catalogFieldClass}
        />
        <p className="text-xs text-primary/60 mt-1">
          If empty, the custom order estimate is the category price per piece
          times the piece count.
        </p>
      </div>

      <div>
        <FormLabel htmlFor="image">Set Icon (Optional)</FormLabel>
        <ImageUploadPreview
          imagePreview={formData.imageUrl || null}
          isUploading={isUploading}
          onRemove={handleImageRemove}
          containerClassName="h-48 w-full"
          allowPositioning={true}
          onCropSave={handleCropSave}
          actionClassName={catalogImageActionClass}
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
          className={catalogUploadButtonClass}
          disabled={isUploading}
        >
          {isUploading ? (
            <span>Uploading…</span>
          ) : formData.imageUrl ? (
            "Change Icon"
          ) : (
            "Upload Icon"
          )}
        </Button>
        {uploadError && (
          <p className="text-error text-small mt-sm">{uploadError}</p>
        )}
        <p className="text-xs text-primary/60 mt-1">
          Without an icon, the built-in set icon for the piece count is shown.
        </p>
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
        onCancel={onCancel}
        submitLabel={isSubmitting ? "Saving…" : existingSet ? "Update Set" : "Add Set"}
      />
      </div>
    </form>
  );
};

export default SetForm;
