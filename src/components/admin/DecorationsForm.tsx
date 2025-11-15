"use client";
import React, { useState, useEffect, useRef } from "react";
import { Decoration, ProductCategory } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ChipCheckbox } from "../ui/ChipCheckbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";
import { ImageUploadPreview } from "@/components/ui/ImageUploadPreview";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";
import { X } from "lucide-react";

// Update in Future
const DECORATION_TYPES = ["Chocolate", "Fruit", "Figurine", "Flowers", "Other"];

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
    price: 0,
    imageUrl: "",
    type: "",
    categoryIds: [],
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingDecoration) {
      setFormData({
        name: existingDecoration.name || "",
        price: existingDecoration.price || 0,
        imageUrl: existingDecoration.imageUrl || "",
        type: existingDecoration.type || "",
        categoryIds: existingDecoration.categoryIds || [],
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        price: 0,
        imageUrl: "",
        type: "",
        categoryIds: [],
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
    if (!formData.type) {
      showAlert("Please select a decoration type.", "error");
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
          <FormLabel htmlFor="price">Price</FormLabel>
          <Input
            type="number"
            id="price"
            value={formData.price === 0 ? "" : formData.price}
            onChange={handleChange}
            placeholder="0.00"
            required
            step="0.01"
          />
        </div>
      </div>

      <div>
        <FormLabel htmlFor="type">Decoration Type</FormLabel>
        <Select
          value={formData.type}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, type: value }))
          }
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Select a type..." />
          </SelectTrigger>
          <SelectContent>
            {DECORATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FormLabel htmlFor="image-upload">Image</FormLabel>
        <ImageUploadPreview
          imagePreview={formData.imageUrl || null}
          isUploading={isUploading}
          onRemove={handleImageRemove}
          containerClassName="h-48 w-full"
          imageFit="object-contain"
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
