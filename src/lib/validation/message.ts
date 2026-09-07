import { z } from "zod";

/**
 * Shared validation for outbound customer messages.
 *
 * Both `POST /api/admin/messages/send` and the `sendCustomerMessage` Copilot
 * tool validate against these schemas, so an AI-supplied argument can never be
 * looser than an admin-supplied one.
 */

/** Hosts allowed to use `http:` — everything customer-facing must be https. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isSafeLinkUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol === "https:") return true;
  return parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname);
}

/**
 * `z.url()` accepts `javascript:` and `data:` URLs. This button is rendered
 * inside a branded, customer-facing email, so an unchecked scheme is a
 * phishing / script-injection vector — doubly so once the AI populates it.
 */
export const actionButtonSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z.url().refine(isSafeLinkUrl, "actionButton.url must be an https:// link."),
});

export const objectIdStringSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a 24-character ObjectId.");

export const messageOrderTypeSchema = z.enum(["regular", "custom"]);

export const messageSubjectSchema = z.string().trim().min(3).max(200);

export const messageBodySchema = z.string().trim().min(10).max(5000);

export const sendMessageSchema = z.object({
  orderId: objectIdStringSchema,
  orderType: messageOrderTypeSchema,
  recipientEmail: z.email(),
  subject: messageSubjectSchema,
  bodyText: messageBodySchema,
  actionButton: actionButtonSchema.optional(),
});

export type SendMessagePayload = z.infer<typeof sendMessageSchema>;

/** Flatten Zod issues into one admin-readable line. */
export function formatMessageValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
}
