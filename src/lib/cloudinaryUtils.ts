/**
 * Extracts the public_id from a full Cloudinary URL.
 * @param url The full Cloudinary URL.
 * @returns The public_id or null if not found.
 */
export const getPublicIdFromUrl = (url: string): string | null => {
  const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};
