"use client";

import { Receipt, Printer } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { DashboardSectionHeading } from "@/components/admin/dashboard/DashboardSectionHeading";
import { cn } from "@/lib/utils";

type OrderDetailDocumentsCardProps = {
  orderId: string;
  onOpenReceipt: () => void;
};

export function OrderDetailDocumentsCard({
  orderId,
  onOpenReceipt,
}: OrderDetailDocumentsCardProps) {
  return (
    <DashboardGlassCard className="border-primary/15">
      <DashboardSectionHeading title="Documents" accent="none" />
      <p className="mt-1 text-sm text-primary/65">
        Receipt for the customer or production sheet for the kitchen.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center border-primary/15 bg-background/30"
          onClick={onOpenReceipt}
        >
          <Receipt className="mr-2 h-4 w-4" aria-hidden />
          Preview receipt
        </Button>
        <Link
          href={`/bakery-manufacturing-orders/orders/${orderId}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center border-primary/15 bg-background/30"
          )}
        >
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          Print production sheet
        </Link>
      </div>
    </DashboardGlassCard>
  );
}
