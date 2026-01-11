"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { HeroSlide } from "@/types";
import { Button } from "../ui/Button";
import { useAlert } from "@/contexts/AlertContext";
import { Camera, Link as LinkIcon, X, Save, Loader2, Trash2, Move, ZoomIn, ZoomOut, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Cropper from "react-easy-crop";
import { Point, Area } from "react-easy-crop";
import { getOriginalCloudinaryUrl, generateCroppedUrl } from "@/lib/cloudinaryUtils";

type HeroSlideFormData = Omit<HeroSlide, "_id">;

interface HeroSlideFormProps {
  existingSlide?: HeroSlide | null;
  onSubmit: (formData: HeroSlideFormData) => void;
  isSubmitting: boolean;
}

const HeroSlideForm = ({
  existingSlide,
  onSubmit,
  isSubmitting,
}: HeroSlideFormProps) => {
  const { showAlert } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<HeroSlideFormData>({
    title: "",
    subtitle: "",
    link: "/products",
    buttonText: "Order Now",
    imageUrl: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);

  // Cropping State
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedPixelsRef = useRef<Area | null>(null);

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    croppedPixelsRef.current = croppedAreaPixels;
  };

  const handleSaveCrop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (formData.imageUrl && croppedPixelsRef.current) {
        const originalUrl = getOriginalCloudinaryUrl(formData.imageUrl);
        const newUrl = generateCroppedUrl(originalUrl, croppedPixelsRef.current);
        setFormData((prev) => ({ ...prev, imageUrl: newUrl }));
    }
    setIsRepositioning(false);
  };



  useEffect(() => {
    if (existingSlide) {
      setFormData({
        title: existingSlide.title || "",
        subtitle: existingSlide.subtitle || "",
        link: existingSlide.link || "/products",
        buttonText: existingSlide.buttonText || "Order Now",
        imageUrl: existingSlide.imageUrl || "",
      });
    } else if (!isSubmitting) {
      setFormData({
        title: "",
        subtitle: "",
        link: "/products",
        buttonText: "Order Now",
        imageUrl: "",
      });
      setOrphanedImageUrl(null);
    }
  }, [existingSlide, isSubmitting]);

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

  const handleImageRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      showAlert("Please upload an image for the slide.", "error");
      return;
    }
    if (!formData.title) {
      showAlert("A title is required.", "error");
      return;
    }
    setOrphanedImageUrl(null);
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full h-[60vh] min-h-[500px] rounded-large overflow-hidden bg-neutral-100 group border-2 border-dashed border-border hover:border-accent/50 transition-colors"
    >
      <div className="absolute inset-0 w-full h-full">
        {formData.imageUrl ? (
          <div className={cn("relative w-full h-full bg-black", isRepositioning && "z-50")}>
             {isRepositioning ? (
                <Cropper
                  image={getOriginalCloudinaryUrl(formData.imageUrl)}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                showGrid={true}
                style={{
             containerStyle: { width: "100%", height: "100%" },
             mediaStyle: { height: "auto" }
          }}
                />
             ) : (
                <Image
                  src={formData.imageUrl}
                  alt="Slide Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
             )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-neutral-200">
            <p className="text-neutral-400 font-heading text-xl">
              No Image Selected
            </p>
          </div>
        )}

        <div className="absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/40" />

        <div
          className={cn(
            "absolute inset-0 z-0",
            !isRepositioning && "cursor-pointer"
          )}
          onClick={() => !isSubmitting && !isRepositioning && fileInputRef.current?.click()}
          title={!isRepositioning ? "Click background to change image" : undefined}
        />

        <div className="absolute top-4 right-4 z-[60] flex gap-2">
          {isUploading && (
            <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
            </span>
          )}
          {!isRepositioning && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-colors"
              title="Change Image"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}

          {formData.imageUrl && !isUploading && (
             <button
               type="button"
               onClick={(e) => {
                 if (isRepositioning) {
                   handleSaveCrop(e);
                 } else {
                   e.preventDefault();
                   e.stopPropagation();
                   setIsRepositioning(true);
                 }
               }}
               className={cn(
                  "backdrop-blur-md p-2 rounded-full text-white transition-colors",
                  isRepositioning ? "bg-accent hover:bg-accent-secondary" : "bg-white/20 hover:bg-white/40"
               )}
               title={isRepositioning ? "Save Position" : "Reposition Image"}
             >
               {isRepositioning ? <Check className="h-5 w-5" /> : <Move className="h-5 w-5" />}
             </button>
          )}

          {formData.imageUrl && !isUploading && !isRepositioning && (
            <button
              type="button"
              onClick={handleImageRemove}
              className="bg-red-500/80 hover:bg-red-600/90 backdrop-blur-md p-2 rounded-full text-white transition-colors"
              title="Remove Image"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageUpload}
          disabled={isSubmitting || isUploading}
        />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-lg z-10 pointer-events-none">
        
        {/* Hide text inputs during repositioning to allow focus on image */}
        {!isRepositioning && (
            <>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Click to Enter Title"
                  className="pointer-events-auto bg-transparent text-center font-heading text-5xl md:text-7xl drop-shadow-md mb-md w-full outline-none border-b border-transparent hover:border-white/30 focus:border-white placeholder:text-white/50 transition-colors"
                  disabled={isSubmitting}
                />

                <textarea
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  placeholder="Click to Enter Subtitle (Optional)"
                  rows={1}
                  className="pointer-events-auto bg-transparent text-center font-body text-xl md:text-2xl max-w-2xl drop-shadow-sm mb-lg w-full outline-none resize-none border-b border-transparent hover:border-white/30 focus:border-white placeholder:text-white/50 transition-colors"
                  disabled={isSubmitting}
                  style={{ minHeight: "1.5em" }}
                />

                <div className="pointer-events-auto flex flex-col items-center gap-3">
                  <div className="relative">
                    <Button
                      size="lg"
                      variant="primary"
                      type="button"
                      className="min-w-[200px] relative overflow-hidden"
                    >
                      <input
                        value={formData.buttonText}
                        onChange={(e) =>
                          setFormData({ ...formData, buttonText: e.target.value })
                        }
                        className="bg-transparent text-center text-white font-bold w-full outline-none placeholder:text-white/70 cursor-text"
                        placeholder="Button Label"
                      />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 hover:bg-black/50 transition-colors">
                    <LinkIcon className="h-3 w-3 text-white/70" />
                    <input
                      value={formData.link}
                      onChange={(e) =>
                        setFormData({ ...formData, link: e.target.value })
                      }
                      placeholder="/products"
                      className="bg-transparent text-xs text-white w-32 outline-none border-none placeholder:text-white/40"
                    />
                  </div>
                </div>
            </>
        )}

        {/* Zoom Controls for Repositioning */}
        {isRepositioning && (
             <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full max-w-md animate-in fade-in slide-in-from-bottom-2">
               


               {/* Zoom Controls */}
               <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm w-2/3">
                 <ZoomOut className="h-4 w-4 text-white" />
                 <input
                   type="range"
                   value={zoom}
                   min={1}
                   max={3}
                   step={0.1}
                   onChange={(e) => setZoom(Number(e.target.value))}
                   className="w-full h-1 cursor-pointer accent-white"
                 />
                 <ZoomIn className="h-4 w-4 text-white" />
               </div>
             </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6 z-30 flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || isUploading}
          size="lg"
          className="shadow-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />{" "}
              {existingSlide ? "Save Changes" : "Create Slide"}
            </>
          )}
        </Button>
      </div>

      {uploadError && (
        <div className="absolute top-4 left-4 bg-error text-white px-4 py-2 rounded-md text-sm z-50 shadow-lg animate-in fade-in">
          {uploadError}
        </div>
      )}
    </form>
  );
};

export default HeroSlideForm;
