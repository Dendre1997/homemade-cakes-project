/**
 * Normalizes a social handle for URLs (no spaces, leading @ stripped).
 */
export function cleanSocialHandle(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw.replace(/\s+/g, "").replace(/^@+/u, "").trim();
}

export type SocialPlatformForLink = "instagram" | "facebook" | string;

function isFacebookHostname(host: string): boolean {
  const h = host.replace(/^www\./i, "").toLowerCase();
  return h === "facebook.com" || h === "m.facebook.com";
}

/**
 * Short label for @… (e.g. from /people/DK-Creations/123 → DK-Creations). Does not mutate nicknames used as vanity slugs.
 */
export function getSocialLinkDisplayHandle(
  platform: string | undefined,
  nickname: string | undefined | null
): string {
  const raw = (nickname ?? "").trim();
  if (!raw) return "";
  const p = (platform || "").toLowerCase();
  if (p === "facebook") {
    const fromUrl = extractFacebookDisplayFromInput(raw);
    if (fromUrl) return fromUrl;
  }
  return cleanSocialHandle(nickname);
}

function extractFacebookDisplayFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  let pathname = "";

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (!isFacebookHostname(url.hostname)) return null;
      pathname = url.pathname;
    } else if (/^(www\.)?facebook\.com\//i.test(trimmed)) {
      pathname = new URL(`https://${trimmed}`).pathname;
    } else if (/^\/?people\//i.test(trimmed)) {
      pathname = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const peopleMatch = /^\/people\/([^/]+)\/\d+\/?$/i.exec(pathname);
  if (peopleMatch) {
    try {
      return decodeURIComponent(peopleMatch[1].replace(/\+/g, " "));
    } catch {
      return peopleMatch[1];
    }
  }

  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments.length === 1 && segments[0] && !/^\d+$/.test(segments[0])) {
    try {
      return decodeURIComponent(segments[0]);
    } catch {
      return segments[0];
    }
  }

  return null;
}

/**
 * Canonical https profile/page URL. Accepts full facebook.com links, `people/Name/123`, numeric id, or vanity slug (nickname only).
 */
function normalizeFacebookProfileUrl(input: string): string | null {
  let trimmed = input.trim().replace(/^@+/u, "");
  if (!trimmed) return null;

  if (/^(www\.)?facebook\.com\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!isFacebookHostname(url.hostname)) return null;
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      let path = url.pathname.replace(/\/+$/, "") || "/";
      if (path === "/") return null;
      return `https://www.facebook.com${path}`;
    } catch {
      return null;
    }
  }

  const rel = trimmed.replace(/^\/+/, "");
  const parts = rel.split("/").filter(Boolean);
  if (
    parts.length >= 3 &&
    parts[0].toLowerCase() === "people" &&
    /^\d+$/.test(parts[2])
  ) {
    const name = parts[1];
    const id = parts[2];
    return `https://www.facebook.com/people/${encodeURIComponent(name)}/${id}`;
  }

  const handle = cleanSocialHandle(trimmed);
  if (/^\d+$/.test(handle)) {
    return `https://www.facebook.com/profile.php?id=${encodeURIComponent(handle)}`;
  }

  if (!handle) return null;
  const slug = handle.replace(/\//g, "");
  if (!slug) return null;
  return `https://www.facebook.com/${encodeURIComponent(slug)}`;
}

/**
 * Returns a profile URL for supported platforms, or null if unknown / empty handle.
 */
export function getSocialLink(
  platform: SocialPlatformForLink | undefined,
  nickname: string | undefined | null
): string | null {
  const raw = (nickname ?? "").trim();
  if (!raw) return null;

  const p = (platform || "").toLowerCase();
  if (p === "instagram") {
    const handle = cleanSocialHandle(nickname);
    if (!handle) return null;
    return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
  }
  if (p === "facebook") {
    return normalizeFacebookProfileUrl(raw) ?? normalizeFacebookProfileUrl(cleanSocialHandle(nickname));
  }
  return null;
}

export function socialPlatformLabel(
  platform: string | undefined
): string {
  if (!platform) return "Social";
  return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
}
