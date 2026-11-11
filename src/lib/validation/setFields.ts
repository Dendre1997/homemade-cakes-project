import type { CatalogSet } from "@/types";

export type SetFields = Omit<CatalogSet, "_id" | "createdAt" | "updatedAt">;

type NormalizeResult =
  | { ok: true; data: SetFields }
  | { ok: false; error: string };

function isWholeNumberAtLeastOne(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/** Validates an admin set payload; shared by POST and PUT. */
export function normalizeSetFields(body: unknown): NormalizeResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be an object." };
  }
  const input = body as Record<string, unknown>;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { ok: false, error: "Name is required." };

  if (!isWholeNumberAtLeastOne(input.pieceCount)) {
    return { ok: false, error: "Piece count must be a whole number of at least 1." };
  }
  if (!isWholeNumberAtLeastOne(input.maxFlavors)) {
    return {
      ok: false,
      error: "Set flavor limit must be a whole number of at least 1.",
    };
  }
  if (input.maxFlavors > input.pieceCount) {
    return {
      ok: false,
      error: "Set flavor limit cannot be more than the piece count.",
    };
  }

  let basePrice: number | undefined;
  if (input.basePrice !== undefined && input.basePrice !== null && input.basePrice !== "") {
    if (
      typeof input.basePrice !== "number" ||
      !Number.isFinite(input.basePrice) ||
      input.basePrice < 0
    ) {
      return { ok: false, error: "Base price must be a number of at least 0." };
    }
    basePrice = input.basePrice;
  }

  const rawCategoryIds = input.categoryIds ?? [];
  if (
    !Array.isArray(rawCategoryIds) ||
    rawCategoryIds.some((id) => typeof id !== "string" || !id)
  ) {
    return { ok: false, error: "Category ids must be a list of strings." };
  }

  const imageUrl =
    typeof input.imageUrl === "string" && input.imageUrl.trim()
      ? input.imageUrl.trim()
      : undefined;

  return {
    ok: true,
    data: {
      name,
      pieceCount: input.pieceCount,
      maxFlavors: input.maxFlavors,
      categoryIds: Array.from(new Set(rawCategoryIds as string[])),
      ...(imageUrl ? { imageUrl } : {}),
      ...(basePrice !== undefined ? { basePrice } : {}),
    },
  };
}
