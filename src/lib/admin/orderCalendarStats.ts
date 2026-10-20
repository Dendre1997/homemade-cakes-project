import { Order, OrderStatus } from "@/types";
import { toDateKey } from "@/lib/db/capacity";

export type DayOrderStats = {
  /** Kitchen-relevant orders on this day (not cancelled, not delivered). */
  orderCount: number;
};

/** Still on the board — not finished, not cancelled. */
export function isActiveKitchenOrder(order: Order): boolean {
  return (
    order.status !== OrderStatus.CANCELLED &&
    order.status !== OrderStatus.DELIVERED
  );
}

export function deliveryDateKeysForOrder(order: Order): string[] {
  if (!isActiveKitchenOrder(order)) return [];
  const keys = new Set<string>();
  for (const entry of order.deliveryInfo?.deliveryDates ?? []) {
    const key = toDateKey(entry.date);
    if (key) keys.add(key);
  }
  return [...keys];
}

export function buildOrderStatsByDateKey(
  orders: Order[]
): Map<string, DayOrderStats> {
  const map = new Map<string, DayOrderStats>();

  for (const order of orders) {
    const dateKeys = deliveryDateKeysForOrder(order);
    if (dateKeys.length === 0) continue;

    for (const key of dateKeys) {
      const prev = map.get(key) ?? { orderCount: 0 };
      map.set(key, {
        orderCount: prev.orderCount + 1,
      });
    }
  }

  return map;
}

export function ordersForDeliveryDateKey(
  orders: Order[],
  dateKey: string
): Order[] {
  return orders.filter((order) => {
    if (!isActiveKitchenOrder(order)) return false;
    return (order.deliveryInfo?.deliveryDates ?? []).some(
      (entry) => toDateKey(entry.date) === dateKey
    );
  });
}

export function loadLevelFromOrderCount(
  orderCount: number
): "none" | "low" | "medium" | "high" {
  if (orderCount <= 0) return "none";
  if (orderCount <= 2) return "low";
  if (orderCount <= 5) return "medium";
  return "high";
}
