"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { FallbackProps } from "react-error-boundary";

export default function ContactFallback({ error, resetErrorBoundary }: FallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="h-[calc(100vh-[100px])] min-h-[600px] overflow-hidden bg-background p-4 md:p-8 flex items-center justify-center font-body text-primary">
      <div className="bg-card-background border border-border p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
        <h2 className="text-xl font-heading text-primary mb-4">Connection Interrupted</h2>
        <p className="text-primary/70 mb-6">
          We encountered an issue attempting to load the support client. This typically happens if the site was recently updated while you were browsing.
        </p>
        <Button onClick={handleReload} className="w-full">
          Reload Page
        </Button>
      </div>
    </div>
  );
}
