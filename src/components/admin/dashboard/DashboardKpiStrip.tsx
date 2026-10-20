import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardKpiStripProps = {
  inboxCount: number;
  pendingConfirmationCount: number;
  dueTodayCount: number;
};

function KpiPill({
  label,
  value,
  href,
  accentClass,
}: {
  label: string;
  value: number;
  href: string;
  accentClass?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center rounded-full border border-primary/15",
        "bg-background/20 px-4 py-2 backdrop-blur-xl backdrop-saturate-150 transition-colors hover:bg-background/30",
        accentClass
      )}
    >
      <span className="text-2xl font-bold leading-none text-primary">
        {value}
      </span>
      <span className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-primary/60">
        {label}
      </span>
    </Link>
  );
}

export default function DashboardKpiStrip({
  inboxCount,
  pendingConfirmationCount,
  dueTodayCount,
}: DashboardKpiStripProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      <KpiPill
        label="Inbox"
        value={inboxCount}
        href="/bakery-manufacturing-orders/orders"
      />
      <KpiPill
        label="Confirm"
        value={pendingConfirmationCount}
        href="/bakery-manufacturing-orders/orders"
      />
      <KpiPill
        label="Due today"
        value={dueTodayCount}
        href="/bakery-manufacturing-orders/orders"
      />
    </div>
  );
}
