export const MAX_DIAMETER_TIERS = 5;

export interface NormalizedDiameterTierFields {
  tiersCount: number;
  tierSizes?: string[];
}

export function normalizeDiameterTierFields(
  tiersCount: unknown,
  tierSizes: unknown
): { ok: true; data: NormalizedDiameterTierFields } | { ok: false; error: string } {
  const count =
    tiersCount === undefined || tiersCount === null ? 1 : tiersCount;

  if (typeof count !== "number" || !Number.isInteger(count)) {
    return { ok: false, error: "tiersCount must be an integer" };
  }

  if (count < 1 || count > MAX_DIAMETER_TIERS) {
    return {
      ok: false,
      error: `tiersCount must be between 1 and ${MAX_DIAMETER_TIERS}`,
    };
  }

  if (count === 1) {
    if (tierSizes !== undefined && tierSizes !== null) {
      if (!Array.isArray(tierSizes)) {
        return { ok: false, error: "tierSizes must be an array of strings" };
      }
      if (tierSizes.length > 0) {
        return {
          ok: false,
          error: "tierSizes must be empty or omitted when tiersCount is 1",
        };
      }
    }
    return { ok: true, data: { tiersCount: 1 } };
  }

  if (!Array.isArray(tierSizes)) {
    return {
      ok: false,
      error: "tierSizes must be an array when tiersCount is greater than 1",
    };
  }

  if (tierSizes.length !== count) {
    return {
      ok: false,
      error: `tierSizes must contain exactly ${count} entries when tiersCount is ${count}`,
    };
  }

  const normalizedSizes = tierSizes.map((entry) =>
    typeof entry === "string" ? entry.trim() : ""
  );

  if (normalizedSizes.some((entry) => entry.length === 0)) {
    return {
      ok: false,
      error: "Each tierSizes entry must be a non-empty string",
    };
  }

  return {
    ok: true,
    data: { tiersCount: count, tierSizes: normalizedSizes },
  };
}
