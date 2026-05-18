import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("❌ RESEND_API_KEY is missing in .env.local");
}

export const resend = new Resend(resendApiKey);

// Centralized from email configurations
export const SENDER_EMAIL = process.env.EMAIL_FROM || process.env.RESEND_FROM || "orders@d-kcreations.com";
export const DEFAULT_FROM = `D&K Creations <${SENDER_EMAIL}>`;

