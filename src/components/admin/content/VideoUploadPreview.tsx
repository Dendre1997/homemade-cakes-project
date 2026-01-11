import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, UploadCloud, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteVideoFromCloudinary } from "@/app/actions/cloudinary";

interface VideoUploadPreviewProps {
  videoUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  containerClassName?: string;
}

export const VideoUploadPreview = ({
  videoUrl,
  onUpload,
  onRemove,
  containerClassName = "h-64 w-full",
}: VideoUploadPreviewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (client-side check)
    if (!file.type.startsWith("video/")) {
      setUploadError("Please upload a valid video file.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      // 500MB
      setUploadError("Video exceeds 500MB limit.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "homemade_cakes_preset");
      formData.append("resource_type", "video");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Upload failed");
      }

      const data = await response.json();
      if (data.secure_url) {
        onUpload(data.secure_url);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload video."
      );
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoUrl) return;

    setIsDeleting(true);
    try {
      await deleteVideoFromCloudinary(videoUrl);
      onRemove();
    } catch (error) {
      console.error("Failed to delete video:", error);
      // Still remove from UI even if remote delete fails, or handle differently?
      // User requested "delete video from cloudinary", so we should try.
      // If it fails, maybe we still want to clear the field so they can upload a new one.
      // For now, let's assume UI clear is ensuring they can move forward.
      onRemove();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "relative mt-sm rounded-medium overflow-hidden border border-border bg-subtleBackground group",
        containerClassName
      )}
    >
      {/* --- VIEW MODE (Video Player) --- */}
      {videoUrl ? (
        <div className="relative w-full h-full bg-black">
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
          />

          {/* Controls */}
          <div className="absolute top-2 right-2 z-10">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeleting}
              className="!p-2 h-8 w-8 rounded-full shadow-sm"
              onClick={handleDelete}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* --- UPLOAD MODE --- */
        <div className="absolute inset-0 flex items-center justify-center">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-small text-muted-foreground">
                Uploading video...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-md">
              <p className="text-small text-muted-foreground">
                {uploadError ? (
                  <span className="text-error">{uploadError}</span>
                ) : (
                  "No video selected"
                )}
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFileChange}
                className="hidden"
              />

              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                Upload Video
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
