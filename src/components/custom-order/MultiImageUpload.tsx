"use client";

import { useState, useRef } from "react";
import { ImageUploadPreview } from "@/components/ui/ImageUploadPreview";
import { Button } from "@/components/ui/Button";
import { ImagePlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export const MultiImageUpload = ({
  value = [],
  onChange,
  maxImages = 3,
}: MultiImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Remaining slots
    const remainingSlots = maxImages - value.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    const uploadPromises = filesToUpload.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "homemade_cakes_preset"); // Using preset from other forms

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.secure_url;
      } catch (error) {
        console.error("Upload error:", error);
        return null;
      }
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => !!url);
      onChange([...value, ...validUrls]);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const newUrls = value.filter((_, idx) => idx !== indexToRemove);
    onChange(newUrls);
  };

  const handleUpdateImage = (index: number, newUrl: string) => {
     const updated = [...value];
     updated[index] = newUrl;
     onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Render Existing Images */}
        {value.map((url, idx) => (
          <div key={url + idx} className="relative group">
            <ImageUploadPreview
              imagePreview={url}
              isUploading={false}
              onRemove={() => handleRemove(idx)}
              allowPositioning={true}
              onCropSave={(newUrl) => handleUpdateImage(idx, newUrl)}
              containerClassName="h-32 w-full"
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-10 pointer-events-none">
              #{idx + 1}
            </div>
          </div>
        ))}

        {/* Add Button (Only if limit not reached) */}
        {value.length < maxImages && (
          <div
            className="h-32 w-full flex items-center justify-center border-2 border-dashed border-primary rounded-lg bg-subtleBackground mt-sm cursor-pointer hover:bg-textOnPrimary hover:border-accent transition-colors"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2 text-primary">
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">Uploading...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 opacity-50" />
                  <span className="text-sm font-medium">Add Image</span>
                  <span className="text-xs text-primary">
                    ({value.length}/{maxImages})
                  </span>
                </>
              )}
            </div>

            {/* Hidden Input */}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500">
        Upload up to {maxImages} reference images for your design.
      </p>
    </div>
  );
};
