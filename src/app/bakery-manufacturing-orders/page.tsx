import { getAdminDashboardPayload } from "@/lib/admin/dashboardData";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Plus, Utensils } from "lucide-react";
import Link from "next/link";
import DashboardKpiStrip from "@/components/admin/dashboard/DashboardKpiStrip";
import DashboardNeedsActionSection from "@/components/admin/dashboard/DashboardNeedsActionSection";
import DashboardTodayCapacityCard from "@/components/admin/dashboard/DashboardTodayCapacityCard";
import DashboardCustomLeadsList from "@/components/admin/dashboard/DashboardCustomLeadsList";
import DashboardAnalyticsSnippet from "@/components/admin/dashboard/DashboardAnalyticsSnippet";
import DashboardRefreshControls from "@/components/admin/dashboard/DashboardRefreshControls";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { DashboardSectionHeading } from "@/components/admin/dashboard/DashboardSectionHeading";
import ProductionQueue from "@/components/admin/dashboard/ProductionQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboard() {
  const data = await getAdminDashboardPayload();

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-6 pb-20">
      {data.errorMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <div className="text-lg" aria-hidden>
            ⚠️
          </div>
          <div>
            <span className="font-semibold">Database Connection Issue: </span>
            <span>{data.errorMsg}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">
            My Bakery
          </h1>
          <p className="mt-1 text-muted-foreground">
            Command center for today&apos;s baking and orders
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 md:w-auto md:max-w-none">
          <DashboardRefreshControls className="w-full sm:w-auto" />
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:w-auto md:gap-3">
            <Link
              href="/bakery-manufacturing-orders/orders/new"
              className={cn(
                buttonVariants({ variant: "primary" }),
                "w-full justify-center gap-2 shadow-sm md:w-auto"
              )}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden /> Manual Order
            </Link>
            <Link
              href="/bakery-manufacturing-orders/products/create"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full justify-center gap-2 border-primary/15 bg-background/20 shadow-sm backdrop-blur-md md:w-auto"
              )}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              New Product
            </Link>
          </div>
        </div>
      </div>

      <DashboardKpiStrip
        inboxCount={data.kpi.inboxCount}
        pendingConfirmationCount={data.kpi.pendingConfirmationCount}
        dueTodayCount={data.kpi.dueTodayCount}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-8">
          <DashboardNeedsActionSection
            pendingConfirmationOrders={data.pendingConfirmationOrders}
            inboxOrders={data.inboxOrders}
            flavorMap={data.flavorMap}
            supportUnreadCount={data.support.unreadCount}
            supportPreview={data.support.preview}
          />

          <DashboardTodayCapacityCard
            capacity={data.todayCapacity}
            todayKey={data.todayKey}
          />

          <DashboardCustomLeadsList leads={data.customLeadsTop3} />
        </div>

        <div className="flex flex-col gap-8">
          <section className="space-y-4">
            <DashboardSectionHeading
              title="What to bake next"
              icon={<Utensils className="h-5 w-5" aria-hidden />}
              accent="none"
              action={
                <span className="text-sm text-muted-foreground">
                  Next 5 tasks
                </span>
              }
            />
            <DashboardGlassCard>
              <ProductionQueue
                orders={data.productionQueue}
                flavorMap={data.flavorMap}
              />
            </DashboardGlassCard>
          </section>

          <DashboardAnalyticsSnippet topFlavors={data.analytics.topFlavors7d} />
        </div>
      </div>
    </div>
  );
}
