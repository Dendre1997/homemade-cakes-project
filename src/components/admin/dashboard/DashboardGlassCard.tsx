import { cn } from "@/lib/utils";

type DashboardGlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

/** Shared glass surface for dashboard sections (public-site tokens). */
export function DashboardGlassCard({
  children,
  className,
}: DashboardGlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/15 bg-background/20 p-4 shadow-sm backdrop-blur-xl backdrop-saturate-150 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
