"use client";

import React, { useState, useEffect, useRef } from "react";
import { SeasonalEvent, ProductWithCategory } from "@/types";
import { slugify } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { ImageUploadPreview } from "@/components/admin/ImageUploadPreview";
import LoadingSpinner from "@/components/ui/Spinner";
import { Checkbox } from "@/components/ui/Checkbox";
import { ProductPicker } from "@/components/admin/ProductPicker";
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker";
import { format } from "date-fns";

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

type SeasonalFormData = Omit<SeasonalEvent, "_id"> & {
  selectedProductIds: string[];
  imageScale?: number;
};

interface SeasonalFormProps {
  existingEvent?: SeasonalEvent | null;
  availableProducts: ProductWithCategory[];
  initialSelectedProductIds?: string[];
  onSubmit: (formData: SeasonalFormData) => void;
  isSubmitting: boolean;
}

const SeasonalForm = ({
  existingEvent,
  onSubmit,
  isSubmitting,
  availableProducts,
  initialSelectedProductIds = [],
}: SeasonalFormProps) => {
  const [formData, setFormData] = useState<Omit<SeasonalEvent, "_id">>({
    name: "",
    slug: "",
    description: "",
    heroBannerUrl: "",
    themeColor: "#ff9900",
    startDate: "",
    endDate: "",
    isActive: false,
  });

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingEvent) {
      setFormData({
        name: existingEvent.name || "",
        slug: existingEvent.slug || "",
        description: existingEvent.description || "",
        heroBannerUrl: existingEvent.heroBannerUrl || "",
        themeColor: existingEvent.themeColor || "#000000",
        startDate: existingEvent.startDate
          ? new Date(existingEvent.startDate).toISOString().split("T")[0]
          : "",
        endDate: existingEvent.endDate
          ? new Date(existingEvent.endDate).toISOString().split("T")[0]
          : "",
        isActive: existingEvent.isActive || false,
      });
      setSelectedProductIds(initialSelectedProductIds);

      const eventAny = existingEvent as any;
      if (eventAny.imageScale) setImageScale(eventAny.imageScale);

    } else if (!isSubmitting) {
      setFormData({
        name: "",
        slug: "",
        description: "",
        heroBannerUrl: "",
        themeColor: "#ff9900",
        startDate: "",
        endDate: "",
        isActive: false,
      });
      setSelectedProductIds([]);
      setOrphanedImageUrl(null);
      setImageScale(1);

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [existingEvent, isSubmitting, initialSelectedProductIds]);

  useEffect(() => {
    if (!existingEvent || formData.slug === "") {
      setFormData((prev) => ({ ...prev, slug: slugify(prev.name) }));
    }
  }, [formData.name, formData.slug,  existingEvent]);

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
      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      setOrphanedImageUrl(result.secure_url);
      setFormData((prev) => ({ ...prev, heroBannerUrl: result.secure_url }));
      setImageScale(1);

    } catch (err) {
      setUploadError("Failed to upload image");
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
    setFormData((prev) => ({ ...prev, heroBannerUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropSave = (newUrl: string) => {
    if (!formData.heroBannerUrl) return;
    setFormData((prev) => ({ ...prev, heroBannerUrl: newUrl }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrphanedImageUrl(null);
    onSubmit({ 
      ...formData, 
      selectedProductIds,
      imageScale: imageScale
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-lg p-lg bg-card-background rounded-large shadow-md max-w-4xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        <div className="space-y-md">
          <h2 className="font-heading text-h3 text-primary mb-md">
            {existingEvent ? "Event Details" : "Create New Event"}
          </h2>

          <div>
            <FormLabel htmlFor="name">Event Name</FormLabel>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <FormLabel htmlFor="slug">Slug</FormLabel>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
            />
          </div>
          
          <div>
              <FormLabel htmlFor="dateRange">Event Duration</FormLabel>
              <CustomDateRangePicker
                showPresets={false}
                startDate={
                  formData.startDate
                    ? new Date(
                        new Date(formData.startDate).getTime() +
                          new Date().getTimezoneOffset() * 60000
                      )
                    : undefined
                }
                endDate={
                   formData.endDate
                    ? new Date(
                        new Date(formData.endDate).getTime() +
                          new Date().getTimezoneOffset() * 60000
                      )
                    : undefined
                }
                onSelectRange={(start, end) => {
                  setFormData({
                    ...formData,
                    startDate: start ? format(start, "yyyy-MM-dd") : "",
                    endDate: end ? format(end, "yyyy-MM-dd") : "",
                  });
                }}
              />
          </div>
          <div>
            <FormLabel htmlFor="color">Theme Color</FormLabel>
            <div className="flex items-center gap-md">
              <input
                type="color"
                id="color"
                value={formData.themeColor}
                onChange={(e) =>
                  setFormData({ ...formData, themeColor: e.target.value })
                }
                className="h-10 w-20 p-1 rounded cursor-pointer border border-border"
              />
              <span className="text-small text-primary/70 font-mono">
                {formData.themeColor}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-md p-sm border border-border rounded-medium bg-subtleBackground">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked as boolean })
              }
            />
            <label
              htmlFor="isActive"
              className="font-body font-bold text-primary cursor-pointer select-none"
            >
              Event is Active
            </label>
          </div>

          <div>
            <FormLabel htmlFor="image">Hero Banner</FormLabel>
            <ImageUploadPreview
              imagePreview={formData.heroBannerUrl || null}
              isUploading={isUploading}
              onRemove={handleImageRemove}
              containerClassName="h-52 w-full"
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
                <LoadingSpinner />
              ) : formData.heroBannerUrl ? (
                "Change Banner"
              ) : (
                "Upload Banner"
              )}
            </Button>
            {uploadError && (
              <p className="text-error text-small mt-sm">{uploadError}</p>
            )}
          </div>

          <div>
            <FormLabel htmlFor="description">Description</FormLabel>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-md border-t lg:border-t-0 lg:border-l border-border pt-lg lg:pt-0 lg:pl-lg">
          <h2 className="font-heading text-h3 text-primary mb-md">
            Include Products
          </h2>

          <ProductPicker
            availableProducts={availableProducts}
            selectedIds={selectedProductIds}
            onChange={setSelectedProductIds}
            themeColor={formData.themeColor || "#ff9900"}
          />
        </div>
      </div>

      <div className="pt-lg border-t border-border">
        <Button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="w-full"
          size="lg"
        >
          {isSubmitting
            ? "Saving..."
            : existingEvent
              ? "Update Event"
              : "Create Event"}
        </Button>
      </div>
    </form>
  );
};

export default SeasonalForm;
