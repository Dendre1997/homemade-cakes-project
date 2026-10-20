"use client";

import { CheckCircle2, Copy, DollarSign } from "lucide-react";
import { Order } from "@/types";
import { Button } from "@/components/ui/Button";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { DashboardSectionHeading } from "@/components/admin/dashboard/DashboardSectionHeading";
import { cn } from "@/lib/utils";

type OrderDetailPaymentCardProps = {
  order: Order;
  isMarkingPaid: boolean;
  isGeneratingToken: boolean;
  onMarkAsPaid: () => void;
  onCopyPaymentLink: () => void;
};

export function OrderDetailPaymentCard({
  order,
  isMarkingPaid,
  isGeneratingToken,
  onMarkAsPaid,
  onCopyPaymentLink,
}: OrderDetailPaymentCardProps) {
  return (
    <DashboardGlassCard
      className={cn(
        order.isPaid ? "border-green-500/25 bg-green-500/5" : "border-primary/15"
      )}
    >
      <DashboardSectionHeading title="Payment" accent="none" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {order.isPaid ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />
          ) : (
            <DollarSign className="h-5 w-5 text-primary" aria-hidden />
          )}
          <p className="text-sm font-medium text-primary">
            {order.isPaid ? "Payment received" : "Payment pending"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            order.isPaid
              ? "bg-green-500/15 text-green-800"
              : "bg-amber-500/15 text-amber-900"
          )}
        >
          {order.isPaid ? "Paid" : "Unpaid"}
        </span>
      </div>

      {!order.isPaid && order.paymentDetails?.expectedMethod && (
        <p className="mt-2 text-sm text-primary/70">
          Expected:{" "}
          <span className="font-semibold capitalize text-primary">
            {order.paymentDetails.expectedMethod === "e-transfer"
              ? "E-transfer"
              : "Cash at pickup"}
          </span>
        </p>
      )}

      {!order.isPaid && (
        <div className="mt-4 hidden flex-col gap-2 lg:flex">
          <Button
            type="button"
            onClick={onMarkAsPaid}
            disabled={isMarkingPaid}
            className="w-full bg-green-600 text-white hover:bg-green-700"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
            {isMarkingPaid ? "Updating…" : "Mark as paid"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-primary/15"
            disabled={isGeneratingToken}
            onClick={onCopyPaymentLink}
          >
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            {isGeneratingToken ? "Generating…" : "Copy payment link"}
          </Button>
        </div>
      )}
    </DashboardGlassCard>
  );
}
