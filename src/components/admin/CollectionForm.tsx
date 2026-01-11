"use client";
import { useState, useEffect, useRef } from 'react';
import { Collection } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ImageUploadPreview } from './ImageUploadPreview';
import { slugify } from "@/lib/utils";

const FormLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode; }) => (
  <label htmlFor={htmlFor} className="block font-body text-small text-primary/80 mb-sm">
    {children}
  </label>
);

interface CollectionFormProps {
  existingCollection?: Collection | null;
  onSubmit: (formData: Omit<Collection, '_id'>) => void;
  isSubmitting: boolean;
}

const CollectionForm = ({
  existingCollection,
  onSubmit,
  isSubmitting,
}: CollectionFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    slug: "",
  });
  

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
  const [orphanedImageUrl, setOrphanedImageUrl] = useState<string | null>(null);


  useEffect(() => {
    if (existingCollection) {
      setFormData({
        name: existingCollection.name || "",
        description: existingCollection.description || "",
        imageUrl: existingCollection.imageUrl || "",
        slug: existingCollection.slug || "",
      });
    } else if (!isSubmitting) {
      setFormData({
        name: "",
        description: "",
        imageUrl: "",
        slug: "",
      });
      setOrphanedImageUrl(null);
      setUploadError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    }
  }, [existingCollection, isSubmitting]);

  useEffect(() => {
    if (!existingCollection || formData.slug === "") {
      setFormData((prev) => ({
        ...prev,
        slug: slugify(prev.name),
      }));
    }
  }, [formData.name, formData.slug, existingCollection]);

    

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

      
      if (orphanedImageUrl) {
        console.log(
          "Cleaning up previously uploaded (but unsaved) image:",
          orphanedImageUrl
        );
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
        {
          method: "POST",
          body: uploadData,
        }
      );

      if (!response.ok) throw new Error("Image upload failed.");
        const result = await response.json();
        setOrphanedImageUrl(result.secure_url);
      setFormData((prev) => ({ ...prev, imageUrl: result.secure_url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
        setOrphanedImageUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropSave = (newUrl: string) => {
    // Update the form state with the new URL
    setFormData((prev) => ({ ...prev, imageUrl: newUrl }));
  };

  const handleImageRemove = () => {
    if (orphanedImageUrl) {
      console.log("Cleaning up (removed) unsaved image:", orphanedImageUrl);
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setOrphanedImageUrl(null);
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-lg bg-card-background rounded-large shadow-md max-w-lg space-y-md"
    >
      <div>
        <FormLabel htmlFor="name">Collection Name</FormLabel>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <FormLabel htmlFor="description">Description</FormLabel>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={3}
        />
      </div>

      <div>
        <FormLabel htmlFor="image">Collection Image</FormLabel>

        <ImageUploadPreview
          imagePreview={formData.imageUrl || null}
          isUploading={isUploading}
          onRemove={handleImageRemove}
          containerClassName="h-48 w-full"
          allowPositioning={true}
          // imageFit="object-cover"
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
          {formData.imageUrl ? "Change Image" : "Upload Image"}
        </Button>
        {uploadError && (
          <p className="text-error text-small mt-sm">{uploadError}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || isUploading}
      >
        {isSubmitting
          ? existingCollection
            ? "Updating..."
            : "Creating..."
          : existingCollection
            ? "Update Collection"
            : "Create Collection"}
      </Button>
    </form>
  );
};

export default CollectionForm;
