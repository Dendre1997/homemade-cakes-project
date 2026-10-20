import { cn } from "@/lib/utils";

type DashboardSectionHeadingProps = {
  title: string;
  action?: React.ReactNode;
  accent?: "orange" | "none";
  icon?: React.ReactNode;
};

export function DashboardSectionHeading({
  title,
  action,
  accent = "orange",
  icon,
}: DashboardSectionHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        className={cn(
          "flex items-center gap-2 font-heading text-xl font-semibold text-primary"
        )}
      >
        {accent === "orange" && (
          <span
            className="inline-block h-8 w-2 rounded-sm bg-orange-500"
            aria-hidden
          />
        )}
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
