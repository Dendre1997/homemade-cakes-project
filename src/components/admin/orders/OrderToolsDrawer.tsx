"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Printer,
  Receipt,
  Wrench,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type OrderToolsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  isPaid: boolean;
  isMarkingPaid: boolean;
  isGeneratingToken: boolean;
  onMarkAsPaid: () => void;
  onCopyPaymentLink: () => void;
  onOpenReceipt: () => void;
  /** Renders the Tools trigger (e.g. header button). */
  trigger?: React.ReactNode;
};

export function OrderToolsDrawer({
  open,
  onOpenChange,
  orderId,
  isPaid,
  isMarkingPaid,
  isGeneratingToken,
  onMarkAsPaid,
  onCopyPaymentLink,
  onOpenReceipt,
  trigger,
}: OrderToolsDrawerProps) {
  const dragControls = useDragControls();
  const [isSheetLayout, setIsSheetLayout] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsSheetLayout(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const handleReceipt = () => {
    onOpenChange(false);
    onOpenReceipt();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <AnimatePresence mode="wait">
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                role="dialog"
                aria-modal="true"
                className={cn(
                  "fixed z-50 flex flex-col border border-primary/15 bg-background/95 shadow-xl backdrop-blur-xl backdrop-saturate-150 outline-none",
                  isSheetLayout
                    ? "inset-x-0 bottom-0 top-auto max-h-[min(85dvh,100%)] w-full rounded-t-2xl"
                    : "inset-y-0 right-0 left-auto top-0 h-full w-[min(100%,22rem)] rounded-none border-l"
                )}
                initial={
                  isSheetLayout
                    ? { opacity: 0, y: "100%" }
                    : { opacity: 0, x: "100%" }
                }
                animate={
                  isSheetLayout ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }
                }
                exit={
                  isSheetLayout
                    ? { opacity: 0, y: "100%" }
                    : { opacity: 0, x: "100%" }
                }
                transition={{
                  type: "spring",
                  damping: 32,
                  stiffness: 380,
                  mass: 0.85,
                }}
                drag={isSheetLayout ? "y" : false}
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.08, bottom: 0.45 }}
                onDragEnd={(_, info) => {
                  if (!isSheetLayout) return;
                  if (info.offset.y > 96 || info.velocity.y > 520) {
                    onOpenChange(false);
                  }
                }}
              >
                <div
                  className={cn(
                    "flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 active:cursor-grabbing",
                    !isSheetLayout && "hidden"
                  )}
                  onPointerDown={(event) => dragControls.start(event)}
                >
                  <div
                    className="h-1 w-10 rounded-full bg-primary/30"
                    aria-hidden
                  />
                </div>

                <header className="shrink-0 border-b border-primary/10 px-4 pb-3 pt-1 md:pt-4">
                  <Dialog.Title className="font-heading text-lg font-semibold text-primary">
                    Tools
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-primary/65">
                    Print, receipt, and payment actions for this order.
                  </Dialog.Description>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/bakery-manufacturing-orders/orders/${orderId}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full justify-start border-primary/15 bg-background/30"
                      )}
                      onClick={() => onOpenChange(false)}
                    >
                      <Printer className="mr-2 h-4 w-4" aria-hidden />
                      Print production sheet
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start border-primary/15 bg-background/30"
                      onClick={handleReceipt}
                    >
                      <Receipt className="mr-2 h-4 w-4" aria-hidden />
                      Preview receipt
                    </Button>
                    {!isPaid && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start border-primary/15 bg-background/30"
                          disabled={isGeneratingToken}
                          onClick={onCopyPaymentLink}
                        >
                          <Copy className="mr-2 h-4 w-4" aria-hidden />
                          {isGeneratingToken
                            ? "Generating link…"
                            : "Copy payment link"}
                        </Button>
                        <Button
                          type="button"
                          className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                          disabled={isMarkingPaid}
                          onClick={onMarkAsPaid}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                          {isMarkingPaid ? "Updating…" : "Mark as paid"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded-full p-1.5 text-primary/60 transition-colors hover:bg-background/60 md:top-4"
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

export function OrderToolsTriggerButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "border-primary/15 bg-background/30 text-primary hover:bg-background/50",
        className
      )}
      onClick={onClick}
    >
      <Wrench className="mr-2 h-4 w-4" aria-hidden />
      Tools
    </Button>
  );
}
