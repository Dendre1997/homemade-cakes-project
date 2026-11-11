"use client";
import {
  getSocialLink,
  getSocialLinkDisplayHandle,
  socialPlatformLabel,
} from "@/lib/socialLinks";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SocialHandleAnchorProps {
  platform?: string;
  nickname?: string;
  className?: string;
  /** Taller tap target for the production order customer card. */
  comfortable?: boolean;
  /** If true, prefix with platform name (e.g. "Instagram · ") */
  showPlatform?: boolean;
}

/**
 * Renders a customer social handle as an external link when a URL can be built.
 *
 * Branch A — URL exists:       plain <a> tag, no button wrapper (avoids <a>-in-<button>)
 * Branch B — No URL, platform: non-interactive <Button> badge showing the prefix only
 * Branch C — No URL, no prefix: plain <span> with the @label
 */
export function SocialHandleAnchor({
  platform,
  nickname,
  className = "text-primary font-medium hover:underline",
  comfortable = false,
  showPlatform = false,
}: SocialHandleAnchorProps) {
  const clean = getSocialLinkDisplayHandle(platform, nickname);
  if (!clean) return null;

  const url = getSocialLink(platform, nickname);
  const label = `@${clean}`;
  const prefix =
    showPlatform && platform ? `${socialPlatformLabel(platform)} · ` : "";

  // Branch A — with URL: styled like a button but rendered as a plain <a> (avoids <a>-in-<button>)
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "primary", size: "sm" }),
          comfortable && "h-11 min-w-0 max-w-full rounded-xl sm:h-10"
        )}
      >
        {prefix}
      </a>
    );
  }

  // Branch B — no URL but we have a platform prefix: non-interactive badge
  if (prefix) {
    return (
      <Button
        variant="primary"
        size="sm"
        className={cn(
          "pointer-events-none",
          comfortable && "h-11 min-w-0 max-w-full rounded-xl sm:h-10"
        )}
        tabIndex={-1}
      >
        {prefix.trimEnd()}
      </Button>
    );
  }

  // Branch C — no URL, no prefix: plain text handle
  return <span className={className}>{label}</span>;
}
