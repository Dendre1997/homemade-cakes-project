"use client";

import React, { useState, useEffect } from "react";
import { IShape } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import { ImageUploadPreview } from "@/components/ui/ImageUploadPreview";
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
    className="block font-body text-small text-primary/80 mb-sm"
  >
    {children}
  </label>
);

export type ShapeFormData = Omit<IShape, "_id">;

interface ShapeFormProps {
  existingShape?: IShape | null;
  onSubmit: (formData: ShapeFormData) => void;
  isSubmitting: boolean;
}

const ShapeForm = ({
  existingShape,
  onSubmit,
  isSubmitting,
}: ShapeFormProps) => {
  const [formData, setFormData] = useState<ShapeFormData>({
    name: "",
    priceSurcharge: 0,
    isDefault: false,
    isActive: true,
    imageUrl: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingShape) {
      setFormData({
        name: existingShape.name || "",
        priceSurcharge: existingShape.priceSurcharge ?? 0,
        isDefault: Boolean(existingShape.isDefault),
        isActive: existingShape.isActive !== false,
        imageUrl: existingShape.imageUrl || "",
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        priceSurcharge: 0,
        isDefault: false,
        isActive: true,
        imageUrl: "",
      });
    }
  }, [existingShape, isSubmitting]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? parseFloat(value) || 0 : value,
    }));
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

  return (
    <form
      onSubmit={handleSubmit}
      className="p-lg bg-card-background rounded-large shadow-md max-w-lg space-y-md"
    >
      <h2 className="font-heading text-h3 text-primary">
        {existingShape ? "Update Shape" : "Add New Shape"}
      </h2>

      <div>
        <FormLabel htmlFor="name">Name (e.g., Circle, Heart)</FormLabel>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <FormLabel htmlFor="priceSurcharge">Price Surcharge ($)</FormLabel>
        <Input
          type="number"
          id="priceSurcharge"
          value={formData.priceSurcharge === 0 ? "" : formData.priceSurcharge}
          onChange={handleChange}
          placeholder="0"
          min="0"
          step="0.01"
        />
        <p className="text-xs text-primary/60 mt-1">
          Extra cost added when a customer selects this shape. Use 0 for no
          surcharge.
        </p>
      </div>

      <div className="flex items-center justify-between gap-md p-md border border-border rounded-medium">
        <div>
          <p className="font-body text-body font-bold text-primary">
            Default Shape
          </p>
          <p className="text-xs text-primary/60">
            Only one shape can be the global default at a time.
          </p>
        </div>
        <Switch
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, isDefault: checked }))
          }
        />
      </div>

      <div className="flex items-center justify-between gap-md p-md border border-border rounded-medium">
        <div>
          <p className="font-body text-body font-bold text-primary">Active</p>
          <p className="text-xs text-primary/60">
            Inactive shapes are hidden from the customer storefront.
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, isActive: checked }))
          }
        />
      </div>

      <div>
        <FormLabel htmlFor="image">Shape Image (Optional)</FormLabel>
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

      <div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting
            ? "Saving..."
            : existingShape
              ? "Update Shape"
              : "Add Shape"}
        </Button>
      </div>
    </form>
  );
};

export default ShapeForm;
