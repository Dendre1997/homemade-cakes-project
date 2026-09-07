import type { Document, ObjectId } from "mongodb";
import { withMongoClient } from "@/lib/db";

/** Maps of `ObjectId.toString()` -> human-readable name, one per catalog collection. */
export interface LookupMaps {
  categories: Record<string, string>;
  flavors: Record<string, string>;
  shapes: Record<string, string>;
  diameters: Record<string, string>;
}

/**
 * Catalog names change rarely, but an AI agent issues many tool calls per
 * conversation and each one is a separate request. A short process-level TTL
 * keeps those calls from re-reading four collections every time.
 */
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  maps: LookupMaps;
  expiresAt: number;
}

const globalWithLookupCache = global as typeof globalThis & {
  _lookupMapsCache?: CacheEntry;
};

function emptyMaps(): LookupMaps {
  return { categories: {}, flavors: {}, shapes: {}, diameters: {} };
}

/**
 * Reads a document's display name, falling back through alternatives.
 * Diameters may store only `sizeValue`, so `12` becomes `12"`.
 */
function diameterLabel(doc: Document): string {
  if (typeof doc.name === "string" && doc.name.trim()) return doc.name.trim();
  if (typeof doc.sizeValue === "number") return `${doc.sizeValue}"`;
  return "";
}

function buildNameMap(
  docs: { _id: ObjectId; name?: unknown }[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const doc of docs) {
    if (typeof doc.name === "string" && doc.name.trim()) {
      map[doc._id.toString()] = doc.name.trim();
    }
  }
  return map;
}

/**
 * Fetches every category, flavor, shape and diameter and returns flat
 * id -> name dictionaries.
 *
 * Orders and custom orders store bare ObjectIds (`categoryId`, `flavorId`,
 * `diameterId`, `shapeId`). Feeding those raw to an LLM produces useless output
 * like "an order for category 64a8b...". Resolve them through these maps before
 * building the prompt context.
 */
export async function getHumanReadableLookupMaps(): Promise<LookupMaps> {
  const cached = globalWithLookupCache._lookupMapsCache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.maps;
  }

  try {
    const maps = await withMongoClient(async (client) => {
      const db = client.db(process.env.MONGODB_DB_NAME);

      const projection = { name: 1, sizeValue: 1 };
      const [categories, flavors, shapes, diameters] = await Promise.all([
        db.collection("categories").find({}, { projection }).toArray(),
        db.collection("flavors").find({}, { projection }).toArray(),
        db.collection("shapes").find({}, { projection }).toArray(),
        db.collection("diameters").find({}, { projection }).toArray(),
      ]);

      const diameterMap: Record<string, string> = {};
      for (const doc of diameters) {
        const label = diameterLabel(doc);
        if (label) diameterMap[doc._id.toString()] = label;
      }

      return {
        categories: buildNameMap(categories),
        flavors: buildNameMap(flavors),
        shapes: buildNameMap(shapes),
        diameters: diameterMap,
      } satisfies LookupMaps;
    });

    globalWithLookupCache._lookupMapsCache = {
      maps,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return maps;
  } catch (error) {
    console.error("[lookupMaps] Failed to build lookup maps:", error);
    // Serve stale data rather than degrading every id back to a raw ObjectId.
    return cached?.maps ?? emptyMaps();
  }
}

/** Drops the cached maps — call after any catalog rename. */
export function invalidateLookupMaps(): void {
  globalWithLookupCache._lookupMapsCache = undefined;
}

/**
 * Resolves an id (ObjectId, string, or absent) to its display name.
 * Returns undefined when there is nothing to show, so callers can omit the key
 * entirely instead of emitting nulls into the prompt.
 */
export function resolveName(
  map: Record<string, string>,
  id: ObjectId | string | null | undefined
): string | undefined {
  if (id === null || id === undefined) return undefined;
  const key = typeof id === "string" ? id : id.toString();
  if (!key) return undefined;
  return map[key];
}
