/**
 * Extracts the public_id from a full Cloudinary URL.
 * @param url The full Cloudinary URL.
 * @returns The public_id or null if not found.
 */
export const getPublicIdFromUrl = (url: string): string | null => {
  if (!url) return null;
  
  // 1. Split at /upload/
  const parts = url.split("/upload/");
  if (parts.length < 2) return null;
  
  let path = parts[1]; // e.g. "v1234/folder/video.mp4" or "w_500/v1234/video.mp4"

  // 2. Handle Versioning: Look for /v<digits>/ and take everything after
  // This handles keys like "w_500/v12345/my-video.mp4" -> "my-video.mp4"
  const versionMatch = path.match(/v\d+\/(.+)/);
  if (versionMatch) {
    path = versionMatch[1];
  } 

  // 3. Remove Extension (last dot part)
  // e.g. "my-video.mp4" -> "my-video"
  const extensionRegex = /\.[^/.]+$/;
  path = path.replace(extensionRegex, "");

  return path;
};

export const getOriginalCloudinaryUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com")) return url;

  // 1. Split the URL at "/upload/"
  const parts = url.split("/upload/");
  if (parts.length < 2) return url;

  const baseUrl = parts[0];
  const rest = parts[1]; // e.g. "c_crop,w_500/v12345/image.jpg" OR "v12345/image.jpg"

  // 2. Find where the version "v12345" starts

  // Regex: Matches "v" followed by numbers, then a slash
  const versionMatch = rest.match(/(v\d+\/)/);

  if (versionMatch) {
    // Found a version (e.g. "v12345/").
    // Return "base/upload/" + "v12345/image.jpg"
    const versionIndex = rest.indexOf(versionMatch[0]);
    return `${baseUrl}/upload/${rest.substring(versionIndex)}`;
  }

  // If no version (rare, but possible), assume everything after upload is path
  return url;
};

/**
 * Generates the crop URL.
 */
export const generateCroppedUrl = (
  originalUrl: string,
  pixels: { x: number; y: number; width: number; height: number }
) => {
  if (!originalUrl) return "";

  // 1. Clean the URL first
  const cleanUrl = getOriginalCloudinaryUrl(originalUrl);

  // 2. Create the transformation string
  // c_crop is the standard cropping mode
  const transformation = `c_crop,x_${Math.round(pixels.x)},y_${Math.round(pixels.y)},w_${Math.round(pixels.width)},h_${Math.round(pixels.height)}`;

  // 3. Inject it directly after "/upload/"
  return cleanUrl.replace("/upload/", `/upload/${transformation}/`);
};