/**
 * Customer identity keys for CRM lookups (§3).
 *
 * Guest checkout never sets `customerId`, so identity is a normalized phone
 * or email written at insert time. Callers must persist `phoneDigits` rather
 * than regex-scanning formatted phones on a hot path.
 */

/**
 * Digits-only phone, collapsed to the 10-digit North American form when the
 * value is an 11-digit number with a leading country code `1`.
 */
export function normalizePhoneDigits(phone?: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/** Trimmed, lowercased address. Empty input stays an empty string. */
export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}
