import { revalidateTag } from "next/cache";

/** Shared tag for everything the public (client) layout reads on every render. */
export const LAYOUT_DATA_TAG = "layout-data";
export const LAYOUT_DATA_REVALIDATE_SECONDS = 300;

/**
 * Call from admin mutations that change categories, collections, products or seasonals,
 * so the public header/nav reflects the change immediately instead of after the TTL.
 */
export function revalidateLayoutData(): void {
  revalidateTag(LAYOUT_DATA_TAG, { expire: 0 });
}
