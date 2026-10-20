import Link from "next/link";
import { CustomOrder } from "@/types";
import DashboardCustomLeadRow from "@/components/admin/dashboard/DashboardCustomLeadRow";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardCustomLeadsListProps = {
  leads: CustomOrder[];
};

export default function DashboardCustomLeadsList({
  leads,
}: DashboardCustomLeadsListProps) {
  return (
    <DashboardGlassCard>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-primary">
          Custom leads
        </h2>
        <Link
          href="/bakery-manufacturing-orders/custom-orders"
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending custom requests.</p>
      ) : (
        <ul className="space-y-2">
          {leads.map((order) => (
            <li key={order._id}>
              <DashboardCustomLeadRow order={order} />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/bakery-manufacturing-orders/custom-orders"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "mt-4 w-full border-primary/15 sm:w-auto"
        )}
      >
        Open custom orders
      </Link>
    </DashboardGlassCard>
  );
}
