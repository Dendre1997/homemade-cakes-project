"use client";
import {
  getSocialLink,
  getSocialLinkDisplayHandle,
  socialPlatformLabel,
} from "@/lib/socialLinks";
import { Button, buttonVariants } from "@/components/ui/Button";

interface SocialHandleAnchorProps {
  platform?: string;
  nickname?: string;
  className?: string;
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
        className={buttonVariants({ variant: "primary", size: "sm", className })}
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
        className="pointer-events-none"
        tabIndex={-1}
      >
        {prefix.trimEnd()}
      </Button>
    );
  }

  // Branch C — no URL, no prefix: plain text handle
  return <span className={className}>{label}</span>;
}
