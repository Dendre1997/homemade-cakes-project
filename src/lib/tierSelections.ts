import { CakeTierSelection, Diameter, Flavor } from "@/types";

export type TierFlavorMap = Record<number, string>;

export function getTierSizeLabels(diameter?: Diameter | null): string[] {
  const tiersCount = diameter?.tiersCount ?? 1;
  if (tiersCount > 1 && Array.isArray(diameter?.tierSizes)) {
    return diameter.tierSizes;
  }
  return Array.from({ length: tiersCount }, (_, index) => `Tier ${index + 1}`);
}

export function tierFlavorsFromSelections(
  tiers?: CakeTierSelection[]
): TierFlavorMap {
  if (!tiers?.length) return {};
  return tiers.reduce<TierFlavorMap>((acc, tier) => {
    acc[tier.tierIndex] = tier.flavorId;
    return acc;
  }, {});
}

export function buildTierSelections(
  tiersCount: number,
  tierSizes: string[],
  tierFlavorIds: TierFlavorMap,
  flavors: Pick<Flavor, "_id" | "name">[]
): CakeTierSelection[] {
  return Array.from({ length: tiersCount }, (_, index) => {
    const flavorId = tierFlavorIds[index] ?? "";
    const flavor = flavors.find((f) => String(f._id) === String(flavorId));
    return {
      tierIndex: index,
      sizeLabel: tierSizes[index] ?? `Tier ${index + 1}`,
      flavorId,
      flavorName: flavor?.name,
    };
  });
}

/** Custom-order wizard / admin request format */
export function compileCustomOrderFlavorLabel(
  tiers: CakeTierSelection[]
): string {
  return tiers
    .map(
      (tier) =>
        `Tier ${tier.tierIndex + 1} (${tier.sizeLabel}): ${tier.flavorName ?? ""}`
    )
    .join(" | ");
}

/** Catalog / standard order format */
export function compileCatalogFlavorLabel(
  tiers: CakeTierSelection[],
  tiersCount: number,
  singleFlavorName?: string
): string {
  if (tiersCount > 1) {
    return tiers.map((t) => `${t.sizeLabel}: ${t.flavorName ?? ""}`).join(" | ");
  }
  return singleFlavorName ?? "";
}

export function allTierFlavorsSelected(
  tiersCount: number,
  tierFlavorIds: TierFlavorMap
): boolean {
  return Array.from({ length: tiersCount }, (_, index) => tierFlavorIds[index]).every(
    Boolean
  );
}

export function sumFlavorUpcharges(
  flavorIds: string[],
  flavors: Pick<Flavor, "_id" | "price">[]
): number {
  return flavorIds.reduce((sum, id) => {
    const flavor = flavors.find((f) => String(f._id) === String(id));
    return sum + (flavor?.price ?? 0);
  }, 0);
}

export function syncTierPayload(
  diameter: Diameter | undefined,
  tierFlavorIds: TierFlavorMap,
  flavors: Pick<Flavor, "_id" | "name">[],
  existingTiers?: CakeTierSelection[]
): {
  tiers: CakeTierSelection[] | undefined;
  flavor: string;
  diameterId?: string;
} {
  const tiersCount =
    existingTiers?.length ??
    diameter?.tiersCount ??
    1;

  if (tiersCount <= 1) {
    const flavorId = tierFlavorIds[0];
    const flavorName = flavors.find((f) => String(f._id) === String(flavorId))?.name ?? "";
    return {
      tiers: undefined,
      flavor: flavorName,
      diameterId: diameter?._id?.toString(),
    };
  }

  const tierSizes =
    existingTiers?.map((t) => t.sizeLabel) ?? getTierSizeLabels(diameter);

  if (!allTierFlavorsSelected(tiersCount, tierFlavorIds)) {
    return {
      tiers: undefined,
      flavor: "",
      diameterId: diameter?._id?.toString(),
    };
  }

  const tiers = buildTierSelections(tiersCount, tierSizes, tierFlavorIds, flavors);
  return {
    tiers,
    flavor: compileCustomOrderFlavorLabel(tiers),
    diameterId: diameter?._id?.toString(),
  };
}
