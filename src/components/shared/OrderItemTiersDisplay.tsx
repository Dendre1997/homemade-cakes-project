import { CakeTierSelection } from "@/types";
import { cn } from "@/lib/utils";
import {
  FlavorDisplaySource,
  getLegacyFlavorDisplay,
  resolveOrderItemTiers,
} from "@/lib/orderItemDisplay";

type OrderItemTiersVariant = "admin" | "compact" | "receipt" | "print";

interface OrderItemTiersDisplayProps extends FlavorDisplaySource {
  variant?: OrderItemTiersVariant;
  className?: string;
  label?: string;
  resolveFlavorName?: (flavorId: string) => string | undefined;
}

export function OrderItemTiersDisplay({
  tiers,
  flavor,
  customFlavor,
  variant = "admin",
  className,
  label = "Tiers:",
  resolveFlavorName,
}: OrderItemTiersDisplayProps) {
  const resolved = resolveOrderItemTiers(
    { tiers, flavor, customFlavor },
    resolveFlavorName
  );
  const legacy = getLegacyFlavorDisplay({ tiers, flavor, customFlavor });

  if (resolved?.length) {
    if (variant === "compact") {
      return (
        <ul
          className={cn(
            "text-xs text-muted-foreground space-y-0.5 mt-0.5 list-none p-0 m-0",
            className
          )}
        >
          {resolved.map((tier) => (
            <li key={tier.tierIndex}>
              {tier.sizeLabel}: {tier.flavorName}
            </li>
          ))}
        </ul>
      );
    }

    if (variant === "receipt" || variant === "print") {
      return (
        <div className={cn("mt-1", className)}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/50 mb-1">
            {label.replace(/:$/, "")}
          </p>
          <ul className="space-y-1 list-none p-0 m-0">
            {resolved.map((tier) => (
              <li
                key={tier.tierIndex}
                className="text-xs font-semibold text-primary/70"
              >
                {tier.sizeLabel} — {tier.flavorName}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className={cn("text-sm mt-1", className)}>
        <span className="font-semibold text-muted-foreground">{label}</span>
        <ul className="pl-4 list-disc mt-0.5">
          {resolved.map((tier) => (
            <li key={tier.tierIndex}>
              {tier.sizeLabel} — {tier.flavorName}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!legacy) return null;

  if (variant === "compact") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>{legacy}</p>
    );
  }

  if (variant === "receipt" || variant === "print") {
    return <p className={cn("text-xs", className)}>Flavor: {legacy}</p>;
  }

  return (
    <div className={cn("text-sm", className)}>
      <span className="font-semibold text-muted-foreground">Flavor:</span>{" "}
      {legacy}
    </div>
  );
}

export function resolveTiersForPublicItem(
  item: {
    tiers?: CakeTierSelection[];
    flavor?: string;
    customFlavor?: string;
  },
  resolveFlavor: (id?: string) => string
): CakeTierSelection[] | undefined {
  const resolved = resolveOrderItemTiers(item, (id) => resolveFlavor(id));
  return resolved?.length ? resolved : undefined;
}
