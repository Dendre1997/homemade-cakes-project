"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LoadingSpinner from "./Spinner";

export default function SpinnerOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Optional: Prevent scrolling while spinner is active
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!mounted) return null;

    
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner />
    </div>,
    document.body
  );
}
