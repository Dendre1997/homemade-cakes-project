"use client";

import Image from "next/image";
import { Button } from "./Button";
import LoadingSpinner from "./Spinner";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadPreviewProps {
  imagePreview: string | null;
  isUploading: boolean;
  onRemove: () => void;
  containerClassName?: string;
  imageFit?: "object-cover" | "object-contain";
}

export const ImageUploadPreview = ({
  imagePreview,
  isUploading,
  onRemove,
  containerClassName = "h-48 w-full",
  imageFit = "object-contain",
}: ImageUploadPreviewProps) => {
  if (!imagePreview && !isUploading) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative mt-sm rounded-medium overflow-hidden border border-border bg-subtleBackground",
        containerClassName 
      )}
    >
      {imagePreview && (
        <Image
          src={imagePreview}
          alt="Image preview"
          layout="fill"
          className={cn(imageFit, "p-xs")} 
        />
      )}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}
      {imagePreview && !isUploading && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="absolute top-sm right-sm !p-2"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
