"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-lg text-center">
      <h2 className="mb-md font-heading text-h2 text-primary">
        Oops! Something went wrong loading the deliciousness.
      </h2>
      <p className="mb-lg max-w-md text-body text-text-secondary">
        We encountered a little hiccup while fetching the latest cakes and treats.
        Please give it another try!
      </p>
      <Button onClick={() => reset()} variant="primary">
        Try Again
      </Button>
    </div>
  );
}
