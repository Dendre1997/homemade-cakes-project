import type { CSSProperties } from "react";
import { Text } from "@react-email/components";
import { CartItem } from "@/types";
import {
  getLegacyFlavorDisplay,
  resolveOrderItemTiers,
} from "@/lib/orderItemDisplay";

interface EmailOrderItemFlavorProps {
  item: CartItem;
  getFlavorName: (id?: string) => string;
  flavorStyle?: CSSProperties;
  labelStyle?: CSSProperties;
}

export function EmailOrderItemFlavor({
  item,
  getFlavorName,
  flavorStyle,
  labelStyle,
}: EmailOrderItemFlavorProps) {
  const resolved = resolveOrderItemTiers(item, (id) => getFlavorName(id));

  if (resolved?.length) {
    return (
      <>
        <Text style={{ margin: "6px 0 2px", fontSize: 12, ...labelStyle }}>
          <strong>Tiers:</strong>
        </Text>
        <ul style={{ margin: "0 0 4px", paddingLeft: 16 }}>
          {resolved.map((tier) => (
            <li
              key={tier.tierIndex}
              style={{
                fontSize: 12,
                color: "rgba(74, 46, 44, 0.85)",
                marginBottom: 2,
                ...flavorStyle,
              }}
            >
              {tier.sizeLabel} — {tier.flavorName}
            </li>
          ))}
        </ul>
      </>
    );
  }

  const legacy =
    getLegacyFlavorDisplay(item) ||
    getFlavorName(item.flavor || item.customFlavor) ||
    "";

  if (!legacy) return null;

  return <span style={flavorStyle}>{legacy}</span>;
}
