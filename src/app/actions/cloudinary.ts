"use server";

import cloudinary from "@/lib/cloudinary";
import { getPublicIdFromUrl } from "@/lib/cloudinaryUtils";

export async function deleteImageFromCloudinary(imageUrl: string) {
  try {
    if (!imageUrl) {
      throw new Error("No image URL provided");
    }

    const publicId = getPublicIdFromUrl(imageUrl);

    if (!publicId) {
      console.warn("Could not extract public_id from URL:", imageUrl);
      return { success: false, error: "Invalid image URL format" };
    }

    console.log(`Deleting image from Cloudinary. Public ID: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok" && result.result !== "not found") { 
      throw new Error("Cloudinary deletion failed");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function deleteVideoFromCloudinary(videoUrl: string) {
  try {
    if (!videoUrl) {
      throw new Error("No video URL provided");
    }

    const publicId = getPublicIdFromUrl(videoUrl);

    if (!publicId) {
      console.warn("Could not extract public_id from URL:", videoUrl);
      return { success: false, error: "Invalid video URL format" };
    }

    // Attempt deletion
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
      invalidate: true,
    });

    // If 'not found', retry with extension (just in case)
    if (result.result === "not found") {
         const originalExtensionMatch = videoUrl.match(/\.([^/.]+)$/);
         if (originalExtensionMatch) {
             const extension = originalExtensionMatch[1];
             const publicIdWithExt = `${publicId}.${extension}`;
             
             const retryResult = await cloudinary.uploader.destroy(publicIdWithExt, {
                 resource_type: "video",
                 invalidate: true,
             });
             
             // If still not found, we consider it success (it's gone)
             if (retryResult.result !== "ok" && retryResult.result !== "not found") {
                  throw new Error(`Cloudinary retry failed: ${retryResult.result}`);
             }
             return { success: true };
         }
    }

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting video from Cloudinary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
