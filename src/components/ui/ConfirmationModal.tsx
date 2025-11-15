"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./Button";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
}: ConfirmationModalProps) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-background p-lg rounded-large shadow-lg w-full max-w-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-start gap-md">
            <div className="flex-shrink-0">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  variant === "danger" ? "bg-error/10" : "bg-accent/10"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-6 w-6",
                    variant === "danger" ? "text-error" : "text-accent"
                  )}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="flex-grow">
              <Dialog.Title className="font-heading text-h3 text-primary">
                {title}
              </Dialog.Title>
              <div className="mt-sm font-body text-body text-primary/80">
                {children}
              </div>
            </div>
          </div>
          <div className="mt-lg flex justify-end gap-md">
            <Button type="button" variant="secondary" onClick={onClose}>
              {cancelText}
            </Button>
            <Button type="button" variant={variant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-md right-md p-1 rounded-full transition-colors text-primary/60 hover:bg-subtleBackground">
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
