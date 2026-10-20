"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { Order, OrderStatus } from "@/types";
import { Button } from "@/components/ui/Button";
import { formatBakeryDate } from "@/lib/dates/bakeryCalendar";
import { cn } from "@/lib/utils";

type OrdersDayPreviewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string | null;
  orders: Order[];
  onViewAll: () => void;
};

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PENDING_CONFIRMATION]: "Needs confirmation",
  [OrderStatus.IN_PROGRESS]: "In progress",
  [OrderStatus.READY]: "Ready",
  [OrderStatus.DELIVERED]: "Delivered",
  [OrderStatus.CANCELLED]: "Cancelled",
};

export function OrdersDayPreviewSheet({
  open,
  onOpenChange,
  dateKey,
  orders,
  onViewAll,
}: OrdersDayPreviewSheetProps) {
  const preview = orders.slice(0, 3);
  const title = dateKey
    ? formatBakeryDate(dateKey, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence mode="wait">
        {open && dateKey ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/45 md:bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                role="dialog"
                aria-modal="true"
                className={cn(
                  "fixed z-50 flex flex-col border border-primary/15 bg-background/95 shadow-xl backdrop-blur-xl",
                  "inset-x-0 bottom-0 max-h-[min(70dvh,28rem)] w-full rounded-t-2xl",
                  "md:inset-x-auto md:left-1/2 md:bottom-8 md:max-h-[24rem] md:w-[min(100%-2rem,24rem)] md:-translate-x-1/2 md:rounded-2xl"
                )}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 48 }}
                transition={{ type: "spring", damping: 28, stiffness: 340 }}
              >
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-primary/25 md:hidden" />
                <header className="border-b border-primary/10 px-4 py-3 pr-10">
                  <Dialog.Title className="font-heading text-lg font-semibold text-primary">
                    {title}
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-primary/65">
                    {orders.length} order{orders.length === 1 ? "" : "s"} scheduled
                  </p>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {preview.length === 0 ? (
                    <p className="py-6 text-center text-sm text-primary/60">
                      No active orders on this day.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {preview.map((order) => (
                        <li key={order._id.toString()}>
                          <Link
                            href={`/bakery-manufacturing-orders/orders/${order._id}`}
                            className="block rounded-xl border border-primary/10 bg-background/40 px-3 py-2.5 transition-colors hover:bg-background/60"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-primary">
                                {order.customerInfo.name ||
                                  order.customerInfo.socialNickname ||
                                  "Customer"}
                              </span>
                              <span className="text-[10px] font-medium uppercase tracking-wide text-primary/55">
                                {STATUS_LABEL[order.status] ?? order.status}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-primary/60">
                              #{String(order._id).slice(-6).toUpperCase()} ·{" "}
                              {order.items.length} line
                              {order.items.length === 1 ? "" : "s"}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <footer className="border-t border-primary/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      onViewAll();
                      onOpenChange(false);
                    }}
                  >
                    View all for this day
                  </Button>
                </footer>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded-full p-1.5 text-primary/60 hover:bg-background/60"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
