import { z } from "zod";

const cakeTierSelectionSchema = z.object({
  tierIndex: z.number(),
  sizeLabel: z.string(),
  flavorId: z.string(),
  flavorName: z.string().optional(),
});

const priceBreakdownSchema = z.object({
  baseCakePrice: z.number(),   // Cake structure price after diameter multiplier
  flavorUpcharge: z.number(),  // Extra cost from premium flavor selection (0 if standard)
  addonsCost: z.number(),      // Sum of all addon prices (mirrors addons[].price)
  grandTotal: z.number(),      // baseCakePrice + flavorUpcharge + addonsCost
});

const addonSchema = z.object({
  addonId: z.string(),
  name: z.string(),
  variantId: z.string().optional(),
  variantName: z.string(),
  price: z.number(),
  imageUrl: z.string().optional(),
});

const contactSchema = z
  .object({
    name: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    email: z
      .string()
      .regex(
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address (e.g., example@gmail.com)"
      )
      .optional()
      .or(z.literal("")),
    socialNickname: z.string().optional(),
    socialPlatform: z.enum(["instagram", "facebook"]).optional(),
  })
  .superRefine((data, ctx) => {
    const hasNickname = (data.socialNickname ?? "").trim().length > 0;
    const hasSocialPlatform = !!data.socialPlatform;

    if ((data.name ?? "").trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 2,
        origin: "string",
        inclusive: true,
        message: "Name is required",
        path: ["name"],
      });
    }

    // Phone: required unless user has both a nickname AND chose a social platform
    const canContactViaSocial = hasNickname && hasSocialPlatform;
    const phoneVal = (data.phone ?? "").trim();

    if (!canContactViaSocial && phoneVal.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone is required (or select a social media platform above)",
        path: ["phone"],
      });
    } else if (phoneVal.length > 0) {
      // Strict phone validation if provided
      const strippedPhone = phoneVal.replace(/[\s\-\(\)\+]/g, "");
      if (!/^\d+$/.test(strippedPhone) || strippedPhone.length < 10 || strippedPhone.length > 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid phone number (e.g., 403-123-4567)",
          path: ["phone"],
        });
      }
    }
  });

/**
 * LEGACY / CLIENT schema (single flat item).
 *
 * This is the schema the current client wizard resolver and the public POST
 * route rely on. It is intentionally left in its original flat shape so the
 * existing wizard keeps working unchanged during the migration. New multi-item
 * validation lives in `customOrderRequestSchema` below.
 */
export const customOrderSchema = z.object({
  status: z.enum(["pending_review", "converted", "rejected"]).optional().default("pending_review"),
  date: z.date(),
  timeSlot: z.string().min(1, "Please select a time slot"),
  deliveryMethod: z.enum(["pickup", "delivery"]).optional().default("pickup"),
  categoryId: z.string().optional(),
  category: z.string().min(1, "Please select a creation type to continue"),
  details: z.object({
    size: z.string().min(1, "Please select a size or quantity"),
    flavor: z.string().min(1, "Please select a flavor"),
    flavorNote: z.string().optional(),
    textOnCake: z.string().optional(),
    designNotes: z.string().min(1, "Please provide overall design notes").max(1000, "Notes are too long"),
    shape: z.string().optional(),
    diameterId: z.string().optional(),
    tiers: z.array(cakeTierSelectionSchema).optional(),
  }),
  allergies: z.string().min(2, "Please indicate if you have any allergies"),
  referenceImages: z
    .array(z.string().url("Invalid image URL"))
    .min(1, "You must select or upload at least one reference image")
    .max(3, "You can upload a maximum of 3 images"),
  contact: contactSchema,
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  convertedOrderId: z.string().optional(),
  agreedPrice: z.number().optional(),
  approximatePrice: z.number().optional(),
  adminNotes: z.string().optional(),
  addons: z.array(addonSchema).optional(),

  // Explicit itemized price breakdown — populated by Step 3 alongside approximatePrice.
  // Allows the receipt and admin panel to show transparent line-item pricing
  // rather than one opaque total figure.
  priceBreakdown: priceBreakdownSchema.optional(),
  idempotencyKey: z.string().optional(),
  userId: z.string().optional(),
  paymentPreference: z.enum(["cash", "e-transfer"]).default("e-transfer"),
});

export type CustomOrderFormData = z.infer<typeof customOrderSchema>;

// ---------------------------------------------------------------------------
// NEW MULTI-ITEM ("Custom Order Cart") schemas
// ---------------------------------------------------------------------------

/** Generate a stable client-side id for a custom item. */
const generateItemId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

/**
 * Schema for a single custom creation within a request (array element).
 * A CustomOrder may contain multiple of these (e.g. a tier cake + cupcakes).
 */
export const customOrderItemSchema = z.object({
  id: z.string().min(1).default(generateItemId),
  categoryId: z.string().optional(),
  category: z.string().min(1, "Please select a creation type to continue"),
  details: z.object({
    size: z.string().min(1, "Please select a size or quantity"),
    flavor: z.string().min(1, "Please select a flavor"),
    flavorNote: z.string().optional(),
    textOnCake: z.string().optional(),
    designNotes: z.string().min(1, "Please provide overall design notes").max(1000, "Notes are too long"),
    shape: z.string().optional(),
    diameterId: z.string().optional(),
    tiers: z.array(cakeTierSelectionSchema).optional(),
  }),
  referenceImages: z
    .array(z.string().url("Invalid image URL"))
    .min(1, "You must select or upload at least one reference image")
    .max(3, "You can upload a maximum of 3 images"),
  addons: z.array(addonSchema).optional(),
  priceBreakdown: priceBreakdownSchema.optional(),
  approximatePrice: z.number().optional(),
  agreedPrice: z.number().optional(),
});

export type CustomOrderItemData = z.infer<typeof customOrderItemSchema>;

/** Base (post-normalization) multi-item schema: order-level fields + items[]. */
const baseCustomOrderRequestSchema = z.object({
  status: z.enum(["pending_review", "converted", "rejected"]).optional().default("pending_review"),

  // --- ORDER-LEVEL (global) fields ---
  date: z.date(),
  timeSlot: z.string().min(1, "Please select a time slot"),
  deliveryMethod: z.enum(["pickup", "delivery"]).optional().default("pickup"),
  allergies: z.string().min(2, "Please indicate if you have any allergies"),
  contact: contactSchema,
  paymentPreference: z.enum(["cash", "e-transfer"]).default("e-transfer"),

  // --- ITEM-LEVEL (array) fields ---
  items: z.array(customOrderItemSchema).min(1, "At least one item is required"),

  // --- Aggregated pricing (sum across items) ---
  approximatePriceTotal: z.number().optional(),
  agreedPriceTotal: z.number().optional(),

  // --- System / lifecycle fields ---
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  convertedOrderId: z.string().optional(),
  adminNotes: z.string().optional(),
  idempotencyKey: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Folds a legacy flat payload (single-item, item fields at the root) into the
 * new `{ items: [...] }` shape. Objects already carrying an `items` array pass
 * through untouched. Used as a preprocess step so the request schema can safely
 * parse both old and new inputs.
 */
function wrapLegacyCustomOrder(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const raw = input as Record<string, any>;

  // Already in the new shape — leave as-is.
  if (Array.isArray(raw.items)) {
    return raw;
  }

  // Only wrap when there is legacy item-level data present at the root.
  const hasLegacyItemData =
    raw.category !== undefined ||
    raw.details !== undefined ||
    raw.referenceImages !== undefined ||
    raw.addons !== undefined ||
    raw.priceBreakdown !== undefined;

  if (!hasLegacyItemData) {
    return raw;
  }

  const {
    category,
    categoryId,
    details,
    referenceImages,
    addons,
    priceBreakdown,
    approximatePrice,
    agreedPrice,
    ...orderLevel
  } = raw;

  return {
    ...orderLevel,
    items: [
      {
        id: generateItemId(),
        category,
        ...(categoryId !== undefined ? { categoryId } : {}),
        details,
        referenceImages,
        ...(addons !== undefined ? { addons } : {}),
        ...(priceBreakdown !== undefined ? { priceBreakdown } : {}),
        ...(approximatePrice !== undefined ? { approximatePrice } : {}),
        ...(agreedPrice !== undefined ? { agreedPrice } : {}),
      },
    ],
  };
}

/**
 * Main multi-item custom order schema. Accepts both the new multi-item payload
 * and legacy flat single-item payloads (via preprocess), always producing the
 * new `items[]` shape.
 *
 * NOTE: use this for server-side validation of raw request bodies — do NOT feed
 * it to the client wizard's `zodResolver` yet (its transform changes the parsed
 * value shape). The wizard migrates to this schema in Phase 2.
 */
export const customOrderRequestSchema = z.preprocess(
  wrapLegacyCustomOrder,
  baseCustomOrderRequestSchema
);

export type CustomOrderRequestData = z.infer<typeof customOrderRequestSchema>;
