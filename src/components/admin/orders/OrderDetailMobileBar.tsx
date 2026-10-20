"use client";

import { CheckCircle2 } from "lucide-react";
import { Order, OrderStatus } from "@/types";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { orderStatusLabel } from "@/lib/admin/orderDetailDisplay";

type OrderDetailMobileBarProps = {
  order: Order;
  newStatus: OrderStatus | "";
  setNewStatus: (status: OrderStatus) => void;
  onStatusUpdate: () => void;
  isLoading: boolean;
  isMarkingPaid: boolean;
  onMarkAsPaid: () => void;
  requiresConfirmation: boolean;
};

export function OrderDetailMobileBar({
  order,
  newStatus,
  setNewStatus,
  onStatusUpdate,
  isLoading,
  isMarkingPaid,
  onMarkAsPaid,
  requiresConfirmation,
}: OrderDetailMobileBarProps) {
  if (requiresConfirmation) {
    return null;
  }

  const statusDirty = newStatus && newStatus !== order.status;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/15 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg flex-col gap-2">
        {!order.isPaid && (
          <Button
            type="button"
            onClick={onMarkAsPaid}
            disabled={isMarkingPaid}
            className="w-full bg-green-600 text-white hover:bg-green-700"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
            {isMarkingPaid ? "Updating…" : "Mark as paid"}
          </Button>
        )}
        <div className="flex gap-2">
          <Select
            value={newStatus || order.status}
            onValueChange={(value) => setNewStatus(value as OrderStatus)}
          >
            <SelectTrigger className="min-w-0 flex-1 bg-background/80">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(OrderStatus)
                .filter((s) => s !== OrderStatus.PENDING_CONFIRMATION)
                .map((status) => (
                  <SelectItem key={status} value={status}>
                    {orderStatusLabel(status)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="primary"
            className="shrink-0 px-4"
            disabled={isLoading || !statusDirty}
            onClick={onStatusUpdate}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
