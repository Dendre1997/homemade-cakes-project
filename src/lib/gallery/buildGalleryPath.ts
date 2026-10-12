export function buildGalleryPath(
  categoryId: string | null,
  collectionSlug: string | null,
) {
  const params = new URLSearchParams();

  if (categoryId && categoryId !== "all") {
    params.set("categoryId", categoryId);
  }
  if (collectionSlug) {
    params.set("collection", collectionSlug);
  }

  const query = params.toString();
  return query ? `/gallery?${query}` : "/gallery";
}
