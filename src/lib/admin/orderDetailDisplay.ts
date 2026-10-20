import { Order, OrderStatus } from "@/types";
import { toDateKey } from "@/lib/db/capacity";
import { formatBakeryDate } from "@/lib/dates/bakeryCalendar";

export function formatOrderDeliveryDateLabel(date: Date | string): string {
  const key = toDateKey(date);
  if (!key) return "";
  return formatBakeryDate(key, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function orderEarliestPickupKey(order: Order): string | null {
  const keys = (order.deliveryInfo?.deliveryDates ?? [])
    .map((entry) => toDateKey(entry.date))
    .filter((key): key is string => Boolean(key));
  if (keys.length === 0) return null;
  return [...keys].sort()[0];
}

export function orderItemUnitCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

export function orderStatusLabel(status: OrderStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function orderStatusChipClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PENDING_CONFIRMATION:
      return "bg-amber-500/15 text-amber-900 border-amber-500/30";
    case OrderStatus.CANCELLED:
      return "bg-error/15 text-error border-error/30";
    case OrderStatus.DELIVERED:
      return "bg-green-500/15 text-green-900 border-green-500/30";
    case OrderStatus.READY:
      return "bg-accent/15 text-accent border-accent/40";
    case OrderStatus.IN_PROGRESS:
    case OrderStatus.CONFIRMED:
    case OrderStatus.PAID:
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-background/40 text-primary/80 border-primary/15";
  }
}
