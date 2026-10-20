import { Order } from "@/types";
import type { DashboardSupportPreview } from "@/lib/admin/dashboardData";
import PendingOrdersCard from "@/components/admin/dashboard/PendingOrdersCard";
import InboxQueue from "@/components/admin/dashboard/InboxQueue";
import SupportPreviewCard from "@/components/admin/dashboard/SupportPreviewCard";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { DashboardSectionHeading } from "@/components/admin/dashboard/DashboardSectionHeading";
import Link from "next/link";

type DashboardNeedsActionSectionProps = {
  pendingConfirmationOrders: Order[];
  inboxOrders: Order[];
  flavorMap: Record<string, string>;
  supportUnreadCount: number;
  supportPreview: DashboardSupportPreview | null;
};

export default function DashboardNeedsActionSection({
  pendingConfirmationOrders,
  inboxOrders,
  flavorMap,
  supportUnreadCount,
  supportPreview,
}: DashboardNeedsActionSectionProps) {
  return (
    <section className="space-y-4">
      <DashboardSectionHeading title="Needs action" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PendingOrdersCard pendingOrders={pendingConfirmationOrders} />
        <SupportPreviewCard
          unreadCount={supportUnreadCount}
          preview={supportPreview}
        />
      </div>

      <DashboardGlassCard className="space-y-4">
        <DashboardSectionHeading
          title={`Inbox (${inboxOrders.length})`}
          accent="none"
          action={
            <Link
              href="/bakery-manufacturing-orders/orders"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          }
        />
        <InboxQueue orders={inboxOrders} flavorMap={flavorMap} />
      </DashboardGlassCard>
    </section>
  );
}
