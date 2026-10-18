import { unstable_cache } from "next/cache";
import { fetchActiveCategories } from "@/lib/data";
import { fetchCollections } from "@/lib/db/collections";
import { getActiveSeasonals } from "@/lib/db/seasonals";
import {
  LAYOUT_DATA_REVALIDATE_SECONDS,
  LAYOUT_DATA_TAG,
} from "@/lib/cache/layoutData";

// Cached reads for the public (client) layout. Dynamic pages such as /profile render the
// layout on every request; without this each render hit MongoDB three times with retries.
// The wrapped fetchers throw on failure, and unstable_cache never stores a thrown result,
// so an outage cannot pin an empty nav for the whole TTL.
const cacheOptions = {
  revalidate: LAYOUT_DATA_REVALIDATE_SECONDS,
  tags: [LAYOUT_DATA_TAG],
};

export const getCachedLayoutCategories = unstable_cache(
  fetchActiveCategories,
  ["layout", "active-categories"],
  cacheOptions
);

export const getCachedLayoutCollections = unstable_cache(
  fetchCollections,
  ["layout", "collections"],
  cacheOptions
);

// Seasonal start/end boundaries may apply up to one TTL late.
export const getCachedActiveSeasonals = unstable_cache(
  getActiveSeasonals,
  ["layout", "active-seasonals"],
  cacheOptions
);
