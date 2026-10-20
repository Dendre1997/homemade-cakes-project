import Link from "next/link";
import { format } from "date-fns";
import { CustomOrder } from "@/types";
import { summarizeCustomOrderCategories } from "@/lib/customOrderCategory";
import { ChevronRight } from "lucide-react";

type DashboardCustomLeadRowProps = {
  order: CustomOrder;
};

export default function DashboardCustomLeadRow({
  order,
}: DashboardCustomLeadRowProps) {
  const displayName =
    order.contact?.name ||
    order.contact?.socialNickname ||
    order.customerName ||
    "Unknown Customer";
  const orderDate = order.date || (order as { eventDate?: Date }).eventDate;
  const categoryLabel =
    summarizeCustomOrderCategories(order.items ?? []) ||
    order.category?.trim() ||
    "Custom Order";

  return (
    <Link
      href={`/bakery-manufacturing-orders/custom-orders/${order._id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-background/30 px-3 py-3 transition-colors hover:bg-background/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-primary">{displayName}</p>
        <p className="truncate text-xs text-primary/60">{categoryLabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-primary/70">
        <span>
          {orderDate ? format(new Date(orderDate), "MMM d") : "TBD"}
        </span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </div>
    </Link>
  );
}
