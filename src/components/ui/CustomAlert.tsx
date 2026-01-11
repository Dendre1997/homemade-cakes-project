"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useAlert } from "@/contexts/AlertContext";
import { cn } from "@/lib/utils";
import { X, AlertTriangle, XCircle } from "lucide-react";

const iconMap = {
  success: (
    <Image
      src="/ThankYouImage.png" //
      alt="Success"
      width={32}
      height={32}
      className="rounded-full"
    />
  ),
  warning: <AlertTriangle className="h-8 w-8 text-warning" />,
  error: <XCircle className="h-8 w-8 text-error" />,
  info: (
    <Image
      src="/ThankYouImage.png" //
      alt="Info"
      width={32}
      height={32}
      className="rounded-full"
    />
  ),
};

const styleMap = {
  success: "border-success/50",
  warning: "border-warning/50",
  error: "border-error/50",
  info: "border-primary",
};

export const CustomAlert = () => {
  const { alertState, hideAlert } = useAlert();
  const { isOpen, message, type } = alertState;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        hideAlert();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, hideAlert]);

  return (
    <div
      className={cn(
        "fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md p-lg rounded-large shadow-xl",
        "bg-card-background border",
        styleMap[type],

        "transition-all duration-300 ease-in-out",
        isOpen
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-full pointer-events-none"
      )}
    >
      <div className="flex items-start gap-md">
              <div className="flex-shrink-0">{iconMap[type]}</div>
              
        <div className="flex-grow pt-xs">
          <p className="font-heading text-h3 text-primary">{message}</p>
        </div>

        <button
          onClick={hideAlert}
          className="p-1 rounded-full text-primary/60 transition-colors hover:bg-subtleBackground hover:text-primary"
          aria-label="Close alert"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
