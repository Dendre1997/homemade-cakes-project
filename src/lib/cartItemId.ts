/** Isomorphic cart ID helpers — safe for client and server (no Node/DB imports). */

export const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function isObjectIdString(id: string): boolean {
  return OBJECT_ID_RE.test(id);
}

export interface ParsedCartItemId {
  productId: string;
  /** First flavor id (backward compatibility for single-tier / legacy). */
  flavorId: string;
  /** All flavor ids — multiple entries when multi-tier (comma-separated in cart id). */
  flavorIds: string[];
  diameterId: string;
  /** Resolved shape ObjectId, or empty when legacy / placeholder */
  shapeId: string;
  inscription: string;
}

/** Parse the flavor segment of a composite cart id into ordered flavor ObjectIds. */
export function parseFlavorIdsFromSegment(flavorSegment: string): string[] {
  if (!flavorSegment) return [];
  return flavorSegment
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** Build a composite cart line ID (standard cakes). */
export function buildCartItemId(params: {
  productId: string;
  /** Single-tier flavor (legacy). Ignored when tierFlavorIds is provided. */
  flavorId?: string;
  /** Ordered flavor ids per tier (multi-tier). */
  tierFlavorIds?: string[];
  diameterId: string;
  shapeId?: string;
  inscription?: string;
}): string {
  const {
    productId,
    flavorId,
    tierFlavorIds,
    diameterId,
    shapeId,
    inscription = "",
  } = params;

  const flavorSegment =
    tierFlavorIds && tierFlavorIds.length > 0
      ? tierFlavorIds.join(",")
      : (flavorId ?? "");

  return `${productId}-${flavorSegment}-${diameterId}-${shapeId || "default"}-${inscription}`;
}

/**
 * Parse composite cart IDs with backward compatibility.
 *
 * Legacy:  productId-flavorId-diameterId-inscription
 * Current: productId-flavorId-diameterId-shapeId|default-inscription
 * Multi-tier: productId-flavA,flavB-diameterId-shapeId|default-inscription
 */
export function parseCartItemId(id: string): ParsedCartItemId {
  const parts = id.split("-");
  const productId = parts[0] ?? "";
  const flavorSegment = parts[1] ?? "";
  const flavorIds = parseFlavorIdsFromSegment(flavorSegment);
  const flavorId = flavorIds[0] ?? flavorSegment;
  const diameterId = parts[2] ?? "";
  const fourth = parts[3];

  if (fourth && (fourth === "default" || OBJECT_ID_RE.test(fourth))) {
    return {
      productId,
      flavorId,
      flavorIds,
      diameterId,
      shapeId: fourth === "default" ? "" : fourth,
      inscription: parts.slice(4).join("-"),
    };
  }

  return {
    productId,
    flavorId,
    flavorIds,
    diameterId,
    shapeId: "",
    inscription: parts.slice(3).join("-"),
  };
}
