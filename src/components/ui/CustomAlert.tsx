"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useAlert } from "@/contexts/AlertContext";
import { cn, focusWithVisibleIndicator } from "@/lib/utils";
import {
  clearCustomAlertLiveRegions,
  scheduleCustomAlertLiveRegionText,
} from "@/lib/customAlertLiveRegion";
import { X, AlertTriangle, XCircle } from "lucide-react";

const iconMap = {
  success: (
    <Image
      src="/ThankYouImage.png"
      alt=""
      width={32}
      height={32}
      className="rounded-full"
      aria-hidden
    />
  ),
  warning: <AlertTriangle className="h-8 w-8 text-warning" aria-hidden />,
  error: <XCircle className="h-8 w-8 text-error" aria-hidden />,
  info: (
    <Image
      src="/ThankYouImage.png"
      alt=""
      width={32}
      height={32}
      className="rounded-full"
      aria-hidden
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
  const { isOpen, message, type, announcementId } = alertState;
  const rootRef = useRef<HTMLDivElement>(null);
  const politeLiveRef = useRef<HTMLDivElement>(null);
  const assertiveLiveRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      wasOpen.current = true;
      return;
    }

    if (!wasOpen.current) return;
    wasOpen.current = false;

    const active = document.activeElement;
    if (active instanceof HTMLElement && rootRef.current?.contains(active)) {
      const target = previousFocus.current;
      if (target && document.contains(target)) {
        focusWithVisibleIndicator(target);
      } else {
        active.blur();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        hideAlert();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, hideAlert, announcementId]);

  useEffect(() => {
    const politeEl = politeLiveRef.current;
    const assertiveEl = assertiveLiveRef.current;

    if (!isOpen || !message) {
      clearCustomAlertLiveRegions(politeEl, assertiveEl);
      return;
    }

    return scheduleCustomAlertLiveRegionText(
      politeEl,
      assertiveEl,
      message,
      type,
    );
  }, [isOpen, message, type, announcementId]);

  return (
    <>
      <div
        id="custom-alert-live-polite"
        ref={politeLiveRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      <div
        id="custom-alert-live-assertive"
        ref={assertiveLiveRef}
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      />

      <div
        id="custom-alert-toast"
        ref={rootRef}
        inert={isOpen ? undefined : true}
        aria-hidden={isOpen ? undefined : true}
        className={cn(
          "fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md p-lg rounded-large shadow-xl",
          "bg-card-background border",
          styleMap[type],

          "transition-all duration-300 ease-in-out",
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-full pointer-events-none",
        )}
      >
        <div className="flex items-start gap-md">
          <div className="flex-shrink-0" aria-hidden>
            {iconMap[type]}
          </div>

          <div className="flex-grow pt-xs">
            {isOpen && message ? (
              <p
                aria-hidden="true"
                className="font-heading text-h3 text-primary"
              >
                {message}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={hideAlert}
            className="p-1 rounded-full text-primary/60 transition-colors hover:bg-subtleBackground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            aria-label="Close alert"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
};
