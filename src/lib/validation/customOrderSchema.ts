import { z } from "zod";

export const customOrderSchema = z.object({
  status: z.enum(["pending_review", "converted", "rejected"]).optional().default("pending_review"),
  date: z.date(),
  timeSlot: z.string().min(1, "Please select a time slot"),
  deliveryMethod: z.enum(["pickup", "delivery"]).optional().default("pickup"),
  category: z.string().min(1, "Please select a creation type to continue"),
  details: z.object({
    size: z.string().min(1, "Please select a size or quantity"),
    flavor: z.string().min(1, "Please select a flavor"),
    flavorNote: z.string().optional(),
    textOnCake: z.string().optional(),
    designNotes: z.string().min(1, "Please provide overall design notes").max(1000, "Notes are too long"),
    shape: z.string().optional(),
  }),
  allergies: z.string().min(2, "Please indicate if you have any allergies"),
  referenceImages: z
    .array(z.string().url("Invalid image URL"))
    .min(1, "You must select or upload at least one reference image")
    .max(3, "You can upload a maximum of 3 images"),
  contact: z.object({
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
  }).superRefine((data, ctx) => {
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
  }),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  convertedOrderId: z.string().optional(),
  agreedPrice: z.number().optional(),
  approximatePrice: z.number().optional(),
  adminNotes: z.string().optional(),
  addons: z.array(z.object({
    addonId: z.string(),
    name: z.string(),
    variantId: z.string().optional(),
    variantName: z.string(),
    price: z.number(),
    imageUrl: z.string().optional(),
  })).optional(),

  // Explicit itemized price breakdown — populated by Step 3 alongside approximatePrice.
  // Allows the receipt and admin panel to show transparent line-item pricing
  // rather than one opaque total figure.
  priceBreakdown: z.object({
    baseCakePrice: z.number(),   // Cake structure price after diameter multiplier
    flavorUpcharge: z.number(),  // Extra cost from premium flavor selection (0 if standard)
    addonsCost: z.number(),      // Sum of all addon prices (mirrors addons[].price)
    grandTotal: z.number(),      // baseCakePrice + flavorUpcharge + addonsCost
  }).optional(),
  idempotencyKey: z.string().optional(),
  userId: z.string().optional(),
  paymentPreference: z.enum(["cash", "e-transfer"]).default("e-transfer"),
});

export type CustomOrderFormData = z.infer<typeof customOrderSchema>;
