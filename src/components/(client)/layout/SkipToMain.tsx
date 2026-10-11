"use client";

import { focusWithVisibleIndicator } from "@/lib/utils";

const MAIN_CONTENT_ID = "site-main";

export function SkipToMain() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={(event) => {
        const main = document.getElementById(MAIN_CONTENT_ID);
        if (!(main instanceof HTMLElement)) return;
        event.preventDefault();
        focusWithVisibleIndicator(main);
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:border focus:border-border focus:bg-card-background focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:text-primary focus:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
