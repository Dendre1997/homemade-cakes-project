import Link from "next/link";
import type { TopFlavorRow } from "@/lib/db/analyticsSnippet";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardAnalyticsSnippetProps = {
  topFlavors: TopFlavorRow[];
};

export default function DashboardAnalyticsSnippet({
  topFlavors,
}: DashboardAnalyticsSnippetProps) {
  return (
    <DashboardGlassCard>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-primary">
          Last 7 days
        </h2>
        <Link
          href="/bakery-manufacturing-orders/analytics"
          className="text-sm text-primary hover:underline"
        >
          Analytics
        </Link>
      </div>

      {topFlavors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not enough order data yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {topFlavors.map((row, index) => (
            <li
              key={`${row.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/30 px-3 py-2"
            >
              <span className="font-medium text-primary">
                {index + 1}. {row.name}
              </span>
              <span className="text-sm tabular-nums text-primary/70">
                {row.count} sold
              </span>
            </li>
          ))}
        </ol>
      )}

      <Link
        href="/bakery-manufacturing-orders/analytics"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "mt-4 border-primary/15"
        )}
      >
        Full report
      </Link>
    </DashboardGlassCard>
  );
}
