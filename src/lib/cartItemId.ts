/** Isomorphic cart ID helpers — safe for client and server (no Node/DB imports). */

export const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function isObjectIdString(id: string): boolean {
  return OBJECT_ID_RE.test(id);
}

export interface ParsedCartItemId {
  productId: string;
  flavorId: string;
  diameterId: string;
  /** Resolved shape ObjectId, or empty when legacy / placeholder */
  shapeId: string;
  inscription: string;
}

/** Build a composite cart line ID (standard cakes). */
export function buildCartItemId(params: {
  productId: string;
  flavorId: string;
  diameterId: string;
  shapeId?: string;
  inscription?: string;
}): string {
  const { productId, flavorId, diameterId, shapeId, inscription = "" } = params;
  return `${productId}-${flavorId}-${diameterId}-${shapeId || "default"}-${inscription}`;
}

/**
 * Parse composite cart IDs with backward compatibility.
 *
 * Legacy:  productId-flavorId-diameterId-inscription
 * Current: productId-flavorId-diameterId-shapeId|default-inscription
 */
export function parseCartItemId(id: string): ParsedCartItemId {
  const parts = id.split("-");
  const productId = parts[0] ?? "";
  const flavorId = parts[1] ?? "";
  const diameterId = parts[2] ?? "";
  const fourth = parts[3];

  if (fourth && (fourth === "default" || OBJECT_ID_RE.test(fourth))) {
    return {
      productId,
      flavorId,
      diameterId,
      shapeId: fourth === "default" ? "" : fourth,
      inscription: parts.slice(4).join("-"),
    };
  }

  return {
    productId,
    flavorId,
    diameterId,
    shapeId: "",
    inscription: parts.slice(3).join("-"),
  };
}
