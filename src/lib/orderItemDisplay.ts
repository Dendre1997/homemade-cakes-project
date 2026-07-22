import { CakeTierSelection } from "@/types";

export type FlavorDisplaySource = {
  tiers?: CakeTierSelection[];
  flavor?: string;
  customFlavor?: string;
};

export function resolveOrderItemTiers(
  source: FlavorDisplaySource,
  resolveFlavorName?: (flavorId: string) => string | undefined
): CakeTierSelection[] | null {
  if (!source.tiers?.length) return null;

  return source.tiers.map((tier) => ({
    ...tier,
    flavorName:
      tier.flavorName ||
      resolveFlavorName?.(tier.flavorId) ||
      tier.flavorId,
  }));
}

export function getLegacyFlavorDisplay(source: FlavorDisplaySource): string {
  const value = source.customFlavor || source.flavor;
  if (!value || value === "N/A") return "";
  return value.trim();
}

export function formatTiersInline(tiers: CakeTierSelection[]): string {
  return tiers
    .map((t) => `${t.sizeLabel}: ${t.flavorName || t.flavorId}`)
    .join(" | ");
}

export function hasTierSelections(source: FlavorDisplaySource): boolean {
  return (source.tiers?.length ?? 0) > 0;
}
