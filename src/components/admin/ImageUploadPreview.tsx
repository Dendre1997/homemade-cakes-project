"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { Point, Area } from "react-easy-crop";
import { Button } from "../ui/Button";
import LoadingSpinner from "../ui/Spinner";
import { X, Check, Move, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  getOriginalCloudinaryUrl,
  generateCroppedUrl,
} from "@/lib/cloudinaryUtils"; // Import helpers

interface ImageUploadPreviewProps {
  imagePreview: string | null;
  isUploading: boolean;
  onRemove: () => void;
  containerClassName?: string;
  allowPositioning?: boolean;

  onCropSave?: (newUrl: string) => void;
}

export const ImageUploadPreview = ({
  imagePreview,
  isUploading,
  onRemove,
  containerClassName = "h-48 w-full",
  allowPositioning = false,
  onCropSave,
}: ImageUploadPreviewProps) => {
  const [isRepositioning, setIsRepositioning] = useState(false);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const croppedPixelsRef = useRef<Area | null>(null);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      croppedPixelsRef.current = croppedAreaPixels;
    },
    []
  );

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCropSave && croppedPixelsRef.current && imagePreview) {
      const originalUrl = getOriginalCloudinaryUrl(imagePreview);

      const newUrl = generateCroppedUrl(originalUrl, croppedPixelsRef.current);

      onCropSave(newUrl);
    }
    setIsRepositioning(false);
  };

  const displayImage =
    isRepositioning && imagePreview
      ? getOriginalCloudinaryUrl(imagePreview)
      : imagePreview;

  if (!imagePreview && !isUploading) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative mt-sm rounded-medium overflow-hidden border border-border bg-subtleBackground group select-none",
        containerClassName
      )}
    >
      {/* --- VIEW MODE (Standard Image) --- */}
      {!isRepositioning && imagePreview && (
        <div className="relative w-full h-full">
          <Image
            src={imagePreview}
            alt="Preview"
            fill
            className="object-cover pointer-events-none"
            unoptimized={true} 
          />
        </div>
      )}

      {/* --- EDIT MODE (Cropper) --- */}
      {isRepositioning && displayImage && (
        <div className="relative w-full h-full bg-black">
          <Cropper
            image={displayImage}
            crop={crop}
            zoom={zoom}
            aspect={4 / 5}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={true}
          />
        </div>
      )}

      {/* --- LOADING --- */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-bold text-primary">Uploading...</p>
            <LoadingSpinner />
          </div>
        </div>
      )}

      {/* --- CONTROLS --- */}
      {imagePreview && !isUploading && (
        <>
          <div className="absolute top-2 right-2 flex gap-2 z-30">
            {allowPositioning && onCropSave && (
              <Button
                type="button"
                variant={isRepositioning ? "primary" : "secondary"}
                size="sm"
                className="!p-2 h-8 w-8 rounded-full shadow-sm"
                onClick={(e) => {
                  if (isRepositioning) {
                    handleSave(e);
                  } else {
                    e.stopPropagation();
                    setIsRepositioning(true);
                  }
                }}
                title={isRepositioning ? "Save Crop" : "Crop Image"}
              >
                {isRepositioning ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Move className="h-4 w-4" />
                )}
              </Button>
            )}

            {!isRepositioning && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="!p-2 h-8 w-8 rounded-full shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Zoom Slider (Only when Editing) */}
          {isRepositioning && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2/3 z-30 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
              <ZoomOut className="h-3 w-3 text-white" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1 cursor-pointer accent-white"
              />
              <ZoomIn className="h-3 w-3 text-white" />
            </div>
          )}
        </>
      )}
    </div>
  );
};
