export type AddonQuantitySettings =
  | { allowQuantity: false }
  | { allowQuantity: true; maxQuantity: number };

/** Catalog rule for whether a client may pick how many of an addon go on one cake. */
export function normalizeAddonQuantitySettings(input: {
  allowQuantity?: unknown;
  maxQuantity?: unknown;
}): AddonQuantitySettings | { error: string } {
  if (input.allowQuantity !== true) {
    return { allowQuantity: false };
  }

  const maxQuantity = Number(input.maxQuantity);
  if (!Number.isInteger(maxQuantity) || maxQuantity < 1) {
    return {
      error: "Maximum quantity must be a whole number of at least 1.",
    };
  }

  return { allowQuantity: true, maxQuantity };
}
