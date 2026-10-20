import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import type { DashboardSupportPreview } from "@/lib/admin/dashboardData";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type SupportPreviewCardProps = {
  unreadCount: number;
  preview: DashboardSupportPreview | null;
};

export default function SupportPreviewCard({
  unreadCount,
  preview,
}: SupportPreviewCardProps) {
  return (
    <DashboardGlassCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
          <h3 className="font-heading text-sm font-semibold text-primary">
            Support
          </h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <Link
          href="/bakery-manufacturing-orders/support"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-primary"
          )}
        >
          Open
        </Link>
      </div>

      {preview ? (
        <p className="mt-3 text-sm text-primary/80">
          <span className="font-medium text-primary">{preview.displayName}</span>
          <span className="text-primary/50">
            {" "}
            ·{" "}
            {formatDistanceToNow(new Date(preview.updatedAt), {
              addSuffix: true,
            })}
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {unreadCount > 0
            ? "Unread messages waiting in support."
            : "No unread support chats."}
        </p>
      )}
    </DashboardGlassCard>
  );
}
