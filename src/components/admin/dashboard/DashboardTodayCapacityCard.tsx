import Link from "next/link";
import type { DayCapacity } from "@/lib/db/capacity";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardTodayCapacityCardProps = {
  capacity: DayCapacity;
  todayKey: string;
};

export default function DashboardTodayCapacityCard({
  capacity,
  todayKey,
}: DashboardTodayCapacityCardProps) {
  const statusLabel = capacity.isBlocked
    ? "Blocked"
    : capacity.isWithinLeadTime
      ? "Lead time"
      : "Open";

  const statusTone = capacity.isBlocked
    ? "bg-destructive/15 text-destructive"
    : capacity.isWithinLeadTime
      ? "bg-amber-500/15 text-amber-800"
      : "bg-green-500/15 text-green-800";

  return (
    <DashboardGlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">
            Today
          </h2>
          <p className="text-xs text-muted-foreground">{todayKey}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
            statusTone
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-primary/70">
          <span>Kitchen load</span>
          <span>
            {capacity.bookedMinutes} / {capacity.workMinutes} min
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${Math.min(100, capacity.utilizationPercent)}%`,
            }}
          />
        </div>
        <p className="mt-2 text-sm text-primary/80">
          {capacity.availableMinutes} minutes remaining capacity
        </p>
      </div>

      <Link
        href="/bakery-manufacturing-orders/schedule"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "mt-4 border-primary/15"
        )}
      >
        View schedule
      </Link>
    </DashboardGlassCard>
  );
}
