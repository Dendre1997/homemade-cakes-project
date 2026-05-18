/** Unsigned upload preset for direct browser uploads to Cloudinary. */
export const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export function appendCloudinaryUploadPreset(formData: FormData): void {
  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not configured");
  }
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
}

export function cloudinaryUploadUrl(
  resourceType: "image" | "video" = "image"
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}
